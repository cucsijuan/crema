// Controlador de alto nivel: conexión, vinculación, estado y comandos.

import * as P from './protocol.js';

const KEY_STORE = 'expert.keys';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Machine extends EventTarget {
  constructor(transport) {
    super();
    this.t = transport;
    this.t.onDisconnect = () => {
      this.connected = false;
      this.emit('disconnected');
    };
    this.connected = false;
    this.authed = false;
    this.device = null;
    this.status = null;
    this.lever = null;
    this.caps = null;
    this.capsThreshold = null;
    this.hardness = null;
    this.standby = null;
    this.cupSizes = {};
    this.programmed = null;
    this.info = null;
    this.serial = null;
    this.pendingResponse = null;
    this.queue = Promise.resolve();
  }

  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  // GATT no admite operaciones simultáneas: todo pasa por esta cola.
  exclusive(fn) {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => {});
    return run;
  }

  read(uuid) {
    return this.exclusive(() => this.t.read(uuid));
  }

  write(uuid, bytes) {
    return this.exclusive(() => this.t.write(uuid, bytes));
  }

  static keys() {
    try {
      return JSON.parse(localStorage.getItem(KEY_STORE)) || {};
    } catch {
      return {};
    }
  }

  static saveKey(name, key) {
    const all = Machine.keys();
    all[name] = key;
    try {
      localStorage.setItem(KEY_STORE, JSON.stringify(all));
    } catch {
      /* almacenamiento no disponible */
    }
  }

  get key() {
    return this.device ? Machine.keys()[this.device.name] ?? null : null;
  }

  async connect() {
    this.device = await this.t.connect();
    this.connected = true;
    this.info = P.decodeInfo(await this.read(P.CHAR.info));
    this.serial = new TextDecoder().decode(await this.read(P.CHAR.serial)).replace(/\0/g, '');
    this.emit('connected', this.device);
    if (this.key) await this.authenticate();
    else this.emit('needsPairing');
  }

  // Graba una clave nueva en la máquina (equivale a vincular la app oficial).
  async pair(key = P.newAuthKey()) {
    await this.write(P.CHAR.pair, new Uint8Array([1]));
    await this.write(P.CHAR.auth, P.keyBytes(key));
    Machine.saveKey(this.device.name, key);
    await this.afterAuth();
  }

  async useKey(key) {
    P.keyBytes(key);
    Machine.saveKey(this.device.name, key);
    await this.authenticate();
  }

  // Esta máquina acepta la clave pero no la guarda (memoria de vinculaciones
  // llena), así que se repite la secuencia de vinculación en cada conexión.
  // A veces rechaza los primeros intentos, así que se reintenta reconectando.
  async authenticate(tries = 4) {
    for (let i = 1; i <= tries; i++) {
      try {
        await this.write(P.CHAR.pair, new Uint8Array([1]));
        await this.write(P.CHAR.auth, P.keyBytes(this.key));
        await this.afterAuth();
        return;
      } catch (e) {
        this.authed = false;
        if (i === tries) {
          this.emit('authFailed', e);
          return;
        }
        await sleep(1500);
        await this.t.reconnect?.();
      }
    }
  }

  async afterAuth() {
    await this.refresh();
    this.authed = true;
    await this.exclusive(() =>
      this.t.subscribe(P.CHAR.state, (b) => {
        this.status = P.decodeState(b);
        this.emit('status', this.status);
      }),
    );
    await this.exclusive(() => this.t.subscribe(P.CHAR.response, (b) => this.pendingResponse?.(P.decodeResponse(b))));
    try {
      await this.exclusive(() =>
        this.t.subscribe(P.CHAR.slider, (b) => {
          this.lever = P.decodeSlider(b);
          this.emit('status', this.status);
        }),
      );
      await this.exclusive(() =>
        this.t.subscribe(P.CHAR.caps, (b) => {
          this.caps = P.decodeCaps(b);
          this.emit('status', this.status);
        }),
      );
    } catch {
      /* notificaciones opcionales */
    }
    this.emit('ready');
    this.readCupSizes().catch((e) => console.warn('tamaños', e));
  }

  async refresh() {
    this.status = P.decodeState(await this.read(P.CHAR.state));
    this.lever = P.decodeSlider(await this.read(P.CHAR.slider));
    this.caps = P.decodeCaps(await this.read(P.CHAR.caps));
    const settings = await this.read(P.CHAR.hardness);
    this.hardness = P.decodeHardness(settings);
    this.standby = P.decodeStandby(settings);
    try {
      this.capsThreshold = P.decodeCaps(await this.read(P.CHAR.capsThreshold));
      this.programmed = P.decodeProgrammedBrew(await this.read(P.CHAR.programmedBrew));
      if (this.programmed) this.programmed.at = Date.now() + this.programmed.seconds * 1000;
    } catch {
      /* no disponibles en todas las versiones */
    }
    this.emit('status', this.status);
  }

  // Elegir la bebida en 3a14 y leer 3a24. La primera lectura tras elegir puede
  // devolver el valor anterior, por eso se espera y se descarta una lectura.
  readCupSize(kind) {
    return this.exclusive(async () => {
      await this.t.write(P.CHAR.cupTarget, P.cupTargetCommand(kind));
      await sleep(600);
      return P.decodeCupVolume(await this.t.read(P.CHAR.cupVolume));
    });
  }

  async readCupSizes() {
    await this.readCupSize(P.CUP_SIZES[0].kind);
    for (const c of P.CUP_SIZES) this.cupSizes[c.id] = await this.readCupSize(c.kind);
    this.emit('cupSizes', this.cupSizes);
  }

  async setCupSize(id, ml) {
    const c = P.CUP_SIZES.find((x) => x.id === id);
    const value = Math.max(c.min, Math.min(c.max, Math.round(ml)));
    this.cupSizes[id] = await this.exclusive(async () => {
      await this.t.write(P.CHAR.cupTarget, P.cupTargetCommand(c.kind));
      await sleep(300);
      await this.t.write(P.CHAR.cupVolume, P.cupVolumeCommand(value));
      await sleep(600);
      return P.decodeCupVolume(await this.t.read(P.CHAR.cupVolume));
    });
    this.emit('cupSizes', this.cupSizes);
    return this.cupSizes[id];
  }

  async command(bytes) {
    return this.exclusive(async () => {
      const response = new Promise((resolve) => {
        const timer = setTimeout(() => resolve(P.RESPONSE.unknown), 6000);
        this.pendingResponse = (r) => {
          clearTimeout(timer);
          resolve(r);
        };
      });
      await this.t.write(P.CHAR.command, bytes);
      const r = await response;
      this.pendingResponse = null;
      return r;
    });
  }

  brew(type, temp) {
    return this.command(P.brewCommand(type, temp));
  }

  async brewRecipe(coffeeMl, waterMl, temp) {
    const r = await this.command(P.recipePrepareCommand(coffeeMl, waterMl));
    if (r !== P.RESPONSE.ok) return r;
    return this.command(P.brewCommand(P.BREW.custom, temp));
  }

  // Programa una preparación: la máquina la lanza sola a la hora indicada.
  async schedule(type, temp, when) {
    const seconds = Math.max(60, Math.round((when - Date.now()) / 1000));
    const r = await this.command(P.brewCommand(type, temp, seconds));
    if (r === P.RESPONSE.ok) this.programmed = { seconds, temp, type, at: Date.now() + seconds * 1000 };
    this.emit('status', this.status);
    return r;
  }

  async abort() {
    const r = await this.command(P.ABORT_COMMAND);
    if (r === P.RESPONSE.ok) this.programmed = null;
    this.emit('status', this.status);
    return r;
  }

  async setCaps(n, threshold) {
    await this.write(P.CHAR.caps, P.capsCommand(n));
    this.caps = P.decodeCaps(await this.read(P.CHAR.caps));
    if (threshold != null) {
      await this.write(P.CHAR.capsThreshold, P.capsCommand(threshold));
      this.capsThreshold = P.decodeCaps(await this.read(P.CHAR.capsThreshold));
    }
    this.emit('status', this.status);
  }

  async setHardness(level) {
    await this.write(P.CHAR.hardness, P.hardnessCommand(level));
    this.hardness = P.decodeHardness(await this.read(P.CHAR.hardness));
    this.emit('status', this.status);
  }

  async setStandby(seconds) {
    await this.write(P.CHAR.hardness, P.standbyCommand(seconds));
    this.standby = P.decodeStandby(await this.read(P.CHAR.hardness));
    this.emit('status', this.status);
  }

  disconnect() {
    this.t.disconnect();
  }
}
