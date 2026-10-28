// Transportes BLE. Todos exponen la misma interfaz:
//   connect() -> { id, name }   read(char) -> Uint8Array   write(char, bytes)
//   subscribe(char, cb)         disconnect()               onDisconnect = fn
// La app nativa de iPhone sólo tiene que aportar otro transporte con esta forma.

import { SERVICES, SERVICE_OF, CHAR, MACHINE_STATE, hex } from './protocol.js';

export class WebBluetoothTransport {
  static supported() {
    return !!navigator.bluetooth;
  }

  constructor() {
    this.device = null;
    this.chars = new Map();
    this.onDisconnect = () => {};
  }

  async connect() {
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'Expert' }, { services: [SERVICES[0]] }],
      optionalServices: SERVICES,
    });
    this.device.addEventListener('gattserverdisconnected', () => {
      if (!this.reconnecting) this.onDisconnect();
    });
    await this.reconnect();
    return { id: this.device.id, name: this.device.name };
  }

  async reconnect() {
    this.reconnecting = true;
    try {
      if (this.device.gatt.connected) this.device.gatt.disconnect();
      await this.open();
    } finally {
      this.reconnecting = false;
    }
  }

  async open() {
    const server = await this.device.gatt.connect();
    this.chars.clear();
    for (const svc of await server.getPrimaryServices()) {
      if (!SERVICES.includes(svc.uuid)) continue;
      for (const ch of await svc.getCharacteristics()) this.chars.set(ch.uuid, ch);
    }
  }

  char(uuid) {
    const c = this.chars.get(uuid);
    if (!c) throw new Error(`Característica no disponible: ${uuid.slice(4, 8)} (servicio ${SERVICE_OF[uuid]?.slice(4, 8)})`);
    return c;
  }

  async read(uuid) {
    const v = await this.char(uuid).readValue();
    return new Uint8Array(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength));
  }

  async write(uuid, bytes) {
    await this.char(uuid).writeValueWithResponse(bytes);
  }

  async subscribe(uuid, cb) {
    const c = this.char(uuid);
    c.addEventListener('characteristicvaluechanged', (e) => {
      const v = e.target.value;
      cb(new Uint8Array(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength)));
    });
    await c.startNotifications();
  }

  disconnect() {
    this.device?.gatt.disconnect();
  }
}

// Bluetooth nativo dentro de la app de iPhone (Capacitor + bluetooth-le).
// ble-native.js sólo existe en la compilación nativa (lo genera el build).
export class NativeTransport {
  static supported() {
    return !!window.Capacitor?.isNativePlatform?.();
  }

  constructor() {
    this.onDisconnect = () => {};
    this.deviceId = null;
  }

  async connect() {
    ({ BleClient: this.ble } = await import('./ble-native.js'));
    await this.ble.initialize();
    const device = await this.ble.requestDevice({ namePrefix: 'Expert', optionalServices: SERVICES });
    this.deviceId = device.deviceId;
    await this.open();
    return { id: device.deviceId, name: device.name };
  }

  async open() {
    await this.ble.connect(this.deviceId, () => {
      if (!this.reconnecting) this.onDisconnect();
    });
  }

  async reconnect() {
    this.reconnecting = true;
    try {
      await this.ble.disconnect(this.deviceId).catch(() => {});
      await this.open();
    } finally {
      this.reconnecting = false;
    }
  }

  async read(uuid) {
    const v = await this.ble.read(this.deviceId, SERVICE_OF[uuid], uuid);
    return new Uint8Array(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength));
  }

  async write(uuid, bytes) {
    await this.ble.write(this.deviceId, SERVICE_OF[uuid], uuid, new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  }

  async subscribe(uuid, cb) {
    await this.ble.startNotifications(this.deviceId, SERVICE_OF[uuid], uuid, (v) =>
      cb(new Uint8Array(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength))),
    );
  }

  disconnect() {
    this.ble?.disconnect(this.deviceId);
  }
}

// Máquina simulada para probar la interfaz sin la cafetera.
export class DemoTransport {
  constructor() {
    this.onDisconnect = () => {};
    this.subs = new Map();
    this.onboarded = false;
    this.authed = false;
    this.water = true;
    this.state = 9; // powerSave
    this.lever = true;
    this.caps = 42;
    this.capsThreshold = 10;
    this.hardness = 3;
    this.standby = 540;
    this.cupTarget = 0;
    this.cups = [25, 30, 110, 25, 125, 200];
    this.programmed = new Uint8Array(6);
  }

  async connect() {
    await sleep(600);
    return { id: 'demo', name: 'Expert_DEMO' };
  }

  stateBytes() {
    return new Uint8Array([this.water ? 0x40 : 0x41, this.state, 0x7f, 0xe0, 0, 0, 0x00, 0x8c]);
  }

  emit(uuid, bytes) {
    this.subs.get(uuid)?.(bytes);
  }

  setState(s) {
    this.state = s;
    this.emit(CHAR.state, this.stateBytes());
  }

  async read(uuid) {
    await sleep(80);
    switch (uuid) {
      case CHAR.onboardStatus: return new Uint8Array([this.onboarded ? 2 : 0]);
      case CHAR.info: return new Uint8Array([0, 100, 0, 100, 2, 89, 0, 127, 0xde, 0xad, 0xbe, 0xef, 0, 1]);
      case CHAR.serial: return new TextEncoder().encode('DEMO0C80K0000001');
    }
    if (!this.authed) throw new Error('GATT Error: Insufficient Authorization');
    switch (uuid) {
      case CHAR.state: return this.stateBytes();
      case CHAR.slider: return new Uint8Array([this.lever ? 2 : 0]);
      case CHAR.caps: return new Uint8Array([this.caps >> 8, this.caps & 0xff]);
      case CHAR.capsThreshold: return new Uint8Array([this.capsThreshold >> 8, this.capsThreshold & 0xff]);
      case CHAR.hardness: return new Uint8Array([this.standby >> 8, this.standby & 0xff, this.hardness, 0]);
      case CHAR.cupVolume: {
        const v = this.cups[this.cupTarget];
        return new Uint8Array([v >> 8, v & 0xff, 0, 0]);
      }
      case CHAR.programmedBrew: return this.programmed;
    }
    return new Uint8Array();
  }

  async write(uuid, bytes) {
    await sleep(80);
    if (uuid === CHAR.pair) return;
    if (uuid === CHAR.auth) {
      this.onboarded = true;
      this.authed = true;
      return;
    }
    if (!this.authed) throw new Error('GATT Error: Insufficient Authorization');
    if (uuid === CHAR.caps) this.caps = (bytes[0] << 8) | bytes[1];
    if (uuid === CHAR.capsThreshold) this.capsThreshold = (bytes[0] << 8) | bytes[1];
    if (uuid === CHAR.hardness) {
      if (bytes[0] !== 0xff) this.standby = (bytes[0] << 8) | bytes[1];
      if (bytes[2] !== 0xff) this.hardness = bytes[2];
    }
    if (uuid === CHAR.cupTarget) this.cupTarget = bytes[1];
    if (uuid === CHAR.cupVolume) this.cups[this.cupTarget] = (bytes[0] << 8) | bytes[1];
    if (uuid === CHAR.command) this.command(bytes);
  }

  respond(ok, reason = 0) {
    this.emit(CHAR.response, new Uint8Array(ok ? [0x83, 0x05, 0x01, 0x20] : [0xc3, 0x05, 0x02, 0x24, reason]));
  }

  async command(bytes) {
    const h = hex(bytes);
    if (h.startsWith('01 10')) return this.respond(true);
    if (h === '03 06 01 02') {
      clearTimeout(this.brewTimer);
      this.programmed = new Uint8Array(6);
      this.respond(true);
      this.setState(2);
      return;
    }
    if (h.startsWith('03 05')) {
      if (!this.water) return this.respond(false, 1);
      if (bytes.slice(4, 8).some((x) => x)) {
        this.programmed = new Uint8Array([...bytes.slice(4, 8), bytes[8], bytes[9]]);
        return this.respond(true);
      }
      if (!this.lever) return this.respond(false, 18);
      this.respond(true);
      if (this.state !== 2) {
        this.setState(1);
        await sleep(2500);
      }
      this.setState(4);
      this.brewTimer = setTimeout(() => {
        this.caps = Math.max(0, this.caps - 1);
        this.lever = false;
        this.setState(2);
      }, 6000);
    }
  }

  async subscribe(uuid, cb) {
    this.subs.set(uuid, cb);
  }

  disconnect() {
    this.onDisconnect();
  }

  // Controles del simulador (no existen en la máquina real).
  toggleWater() {
    this.water = !this.water;
    this.emit(CHAR.state, this.stateBytes());
  }

  cycleLever() {
    this.lever = true;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export { MACHINE_STATE };
