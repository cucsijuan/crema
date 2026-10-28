// BLE protocol of the Nespresso Expert (community reverse engineering,
// verified against an Expert C80 running firmware 6.1).
// Transport-agnostic: used by both Web Bluetooth and the native app.

const uuid = (short) => `06aa${short}-f22a-11e3-9daa-0002a5d5c51b`;

export const SERVICES = ['1910', '1920', '1930', '1940', '1950'].map(uuid);

export const CHAR = {
  info: uuid('3a21'),
  serial: uuid('3a31'),
  auth: uuid('3a41'),
  onboardStatus: uuid('3a51'),
  pair: uuid('3a61'),
  state: uuid('3a12'),
  slider: uuid('3a22'),
  command: uuid('3a42'),
  response: uuid('3a52'),
  caps: uuid('3a15'),
  capsThreshold: uuid('3a25'),
  hardness: uuid('3a44'), // also holds the auto power-off delay
  cupTarget: uuid('3a14'),
  cupVolume: uuid('3a24'),
  programmedBrew: uuid('3a32'),
};

export const SERVICE_OF = {
  [CHAR.info]: SERVICES[0], [CHAR.serial]: SERVICES[0], [CHAR.auth]: SERVICES[0],
  [CHAR.onboardStatus]: SERVICES[0], [CHAR.pair]: SERVICES[0],
  [CHAR.state]: SERVICES[1], [CHAR.slider]: SERVICES[1], [CHAR.command]: SERVICES[1],
  [CHAR.response]: SERVICES[1],
  [CHAR.hardness]: SERVICES[3], [CHAR.cupTarget]: SERVICES[3], [CHAR.cupVolume]: SERVICES[3],
  [CHAR.programmedBrew]: SERVICES[1],
  [CHAR.caps]: SERVICES[4], [CHAR.capsThreshold]: SERVICES[4],
};

// Dial cup sizes (official SDK: CupSizeOperations / CupSizeInterval). Names live in i18n.js.
export const CUP_SIZES = [
  { kind: 0, id: 'ristretto', min: 15, max: 30, def: 25 },
  { kind: 1, id: 'espresso', min: 30, max: 70, def: 40 },
  { kind: 2, id: 'lungo', min: 70, max: 130, def: 110 },
  { kind: 3, id: 'americanoCoffee', min: 15, max: 110, def: 25 },
  { kind: 4, id: 'americanoWater', min: 25, max: 300, def: 125 },
  { kind: 5, id: 'hotWater', min: 50, max: 300, def: 200 },
];

// Auto power-off delay in seconds (official SDK: StandByDelayOption).
export const STANDBY_OPTIONS = [
  [540, '9 min'],
  [1800, '30 min'],
  [7200, '2 h'],
  [28800, '8 h'],
];

export function cupTargetCommand(kind) {
  return new Uint8Array([0, kind]);
}

export function cupVolumeCommand(ml) {
  return new Uint8Array([(ml >> 8) & 0xff, ml & 0xff, 0xff, 0xff]);
}

export function decodeCupVolume(bytes) {
  return ((bytes[0] ?? 0) << 8) | (bytes[1] ?? 0);
}

export function standbyCommand(seconds) {
  return new Uint8Array([(seconds >> 8) & 0xff, seconds & 0xff, 0xff]);
}

export function decodeStandby(bytes) {
  return ((bytes[0] ?? 0) << 8) | (bytes[1] ?? 0);
}

export function decodeProgrammedBrew(bytes) {
  const seconds = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  if (!seconds) return null;
  return { seconds, temp: bytes[4], type: bytes[5] };
}

export const BREW = { ristretto: 0, espresso: 1, lungo: 2, hotWater: 4, americano: 5, custom: 7 };
export const TEMP = { low: 1, medium: 0, high: 2 };

export const MACHINE_STATE = [
  'reset', 'heatUp', 'ready', 'descalingReady', 'brewing', 'menu', 'descaling', 'steamOut',
  'error', 'powerSave', 'overHeat', 'diagnostic', 'bleSettings', 'factoryReset',
  'hardnessSettings', 'standbySettings',
];

// delaySeconds > 0 schedules the brew (the machine starts it on its own).
export function brewCommand(type, temp = TEMP.medium, delaySeconds = 0) {
  const d = delaySeconds >>> 0;
  return new Uint8Array([
    0x03, 0x05, 0x07, 0x04,
    (d >>> 24) & 0xff, (d >> 16) & 0xff, (d >> 8) & 0xff, d & 0xff,
    temp, type,
  ]);
}

export function recipePrepareCommand(coffeeMl, waterMl) {
  return new Uint8Array([
    0x01, 0x10, 0x08, 0x00, 0x00,
    0x01, (coffeeMl >> 8) & 0xff, coffeeMl & 0xff,
    0x02, (waterMl >> 8) & 0xff, waterMl & 0xff,
  ]);
}

export const ABORT_COMMAND = new Uint8Array([0x03, 0x06, 0x01, 0x02]);

// Used for both the stock (3a15) and the low-stock threshold (3a25).
export function capsCommand(count) {
  return new Uint8Array([(count >> 8) & 0xff, count & 0xff]);
}

export function hardnessCommand(level) {
  return new Uint8Array([0xff, 0xff, level]);
}

export function decodeState(bytes) {
  const b = (i) => bytes[i] ?? 0;
  const descaleCounter = (b(6) << 8) | b(7);
  return {
    waterEmpty: !!(b(0) & 0x01),
    descaleNeeded: !!(b(0) & 0x04),
    capsuleJammed: !!(b(0) & 0x10),
    waterTempLow: !!(b(1) & 0x01),
    // Seen while programming a cup size by holding the button: byte1 = 0x24.
    programmingCup: !!(b(1) & 0x20),
    trayIssue: !!(b(1) & 0x40),
    capsuleEngaged: !!(b(1) & 0x80),
    state: MACHINE_STATE[b(1) & 0x0f] ?? 'unknown',
    descaleCounter: descaleCounter === 0xffff ? null : descaleCounter,
    raw: hex(bytes),
  };
}

export function decodeSlider(bytes) {
  return { leverClosed: !!((bytes[0] ?? 0) & 0x02) };
}

export function decodeCaps(bytes) {
  const n = ((bytes[0] ?? 0xff) << 8) | (bytes[1] ?? 0xff);
  return n === 0xffff ? null : n;
}

export function decodeHardness(bytes) {
  return bytes[2] ?? null;
}

export function decodeInfo(bytes) {
  const u16 = (i) => (bytes[i] << 8) | bytes[i + 1];
  const std = (v) => (v > 0 ? `${Math.floor(v / 100)}.${v % 100}` : '—');
  const conn = u16(6);
  return {
    hardware: std(u16(0)),
    bootloader: std(u16(2)),
    firmware: std(u16(4)),
    connectivity: `${Math.floor(conn / 10000)}.${Math.floor((conn % 10000) / 100)}.${conn % 100}`,
    address: Array.from(bytes.slice(8), (x) => x.toString(16).padStart(2, '0')).join(':').toUpperCase(),
  };
}

export const RESPONSE = {
  ok: 'ok',
  outOfRange: 'outOfRange',
  invalidState: 'invalidState',
  trayFull: 'trayFull',
  obstacle: 'obstacle',
  descaleOn: 'descaleOn',
  busy: 'busy',
  notAbortable: 'notAbortable',
  leverOpen: 'leverOpen',
  pumpRunning: 'pumpRunning',
  motorRunning: 'motorRunning',
  leverNotCycled: 'leverNotCycled',
  unknown: 'unknown',
};

const CONDITION = {
  1: RESPONSE.invalidState, 2: RESPONSE.invalidState, 3: RESPONSE.trayFull, 4: RESPONSE.obstacle,
  5: RESPONSE.descaleOn, 6: RESPONSE.busy, 7: RESPONSE.notAbortable, 8: RESPONSE.leverOpen,
  16: RESPONSE.pumpRunning, 17: RESPONSE.motorRunning, 18: RESPONSE.leverNotCycled,
};

export function decodeResponse(bytes) {
  const code = bytes[3];
  if (code === 0x20) return RESPONSE.ok;
  if (code === 0x36) return RESPONSE.outOfRange;
  if (code === 0x24) return CONDITION[bytes[4]] ?? RESPONSE.unknown;
  return RESPONSE.unknown;
}

export function hex(bytes) {
  return Array.from(bytes, (x) => x.toString(16).padStart(2, '0')).join(' ');
}

export function newAuthKey() {
  const k = new Uint8Array(8);
  crypto.getRandomValues(k);
  return hex(k).replace(/ /g, '');
}

export function keyBytes(keyHex) {
  const clean = keyHex.replace(/[^0-9a-f]/gi, '');
  if (clean.length !== 16) throw new Error('Key must be 16 hex characters');
  return new Uint8Array(clean.match(/../g).map((x) => parseInt(x, 16)));
}
