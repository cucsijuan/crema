// High-level controller: connection, pairing, state and commands.

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

  // GATT does not allow concurrent operations: everything goes through this queue.
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
      /* storage unavailable */
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

  // Stores a new key in the machine (same as pairing the official app).
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

  // This machine accepts the key but does not persist it (pairing memory is
  // full), so the pairing sequence is repeated on every connection. It
  // sometimes rejects the first attempts, so it retries after reconnecting.
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
      /* optional notifications */
    }
    this.emit('ready');
    this.readCupSizes().catch((e) => console.warn('cup sizes', e));
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
      /* not available on every firmware */
    }
    this.emit('status', this.status);
  }

  // Select the drink on 3a14, then read 3a24. The first read after selecting may
  // return the previous value, hence the wait and the discarded read.
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

  // Schedules a brew: the machine starts it on its own at the given time.
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
