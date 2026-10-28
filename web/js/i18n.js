// UI strings. English is the source language; every key must exist in each locale.

const STRINGS = {
  en: {
    'connect.lede': 'Control your Expert from your phone or computer. No official app needed.',
    'connect.button': 'Connect machine',
    'connect.demo': 'Try demo mode',
    'connect.hint': 'Turn the machine on and stay close to it.',
    'connect.unsupported': 'This browser has no Bluetooth. On a computer use Chrome or Edge; on iPhone, the Bluefy app.',

    'pair.title': 'Pair',
    'pair.newTitle': 'First time',
    'pair.newText': 'Creates a new key and stores it in the machine. Do this only once: the machine has room for about 25 pairings in total.',
    'pair.newButton': 'Pair this machine',
    'pair.keyTitle': 'I already have a key',
    'pair.keyText': 'Use the same key on all your devices (find it under Machine → Key on the other device).',
    'pair.keyPlaceholder': '16 characters, e.g. 0a1b2c3d4e5f6071',
    'pair.keyButton': 'Use key',

    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.done': 'Done',
    'common.save': 'Save',

    'main.connected': 'Connected',
    'main.refresh': 'Refresh',
    'main.disconnect': 'Disconnect',

    'tab.brew': 'Coffee',
    'tab.recipes': 'Recipes',
    'tab.machine': 'Machine',

    'drink.ristretto': 'Ristretto',
    'drink.espresso': 'Espresso',
    'drink.lungo': 'Lungo',
    'drink.americano': 'Americano',
    'drink.hotWater': 'Hot water',
    'drink.recipe': 'Recipe',

    'temp.low': 'Low',
    'temp.medium': 'Medium',
    'temp.high': 'High',

    'brew.brew': 'Brew',
    'brew.stop': 'Stop',
    'brew.later': 'Schedule for later',
    'brew.scheduled': 'Scheduled',
    'brew.scheduledAt': '{drink} at {time}',
    'brew.brewing': 'Brewing {drink}…',
    'brew.done': 'Done! Enjoy',
    'brew.stopped': 'Stopped',

    'schedule.title': 'Schedule',
    'schedule.text': 'Leave a capsule in, the lever closed and the cup in place. The machine brews on its own at that time, even if you close the app.',
    'schedule.button': 'Schedule',
    'schedule.busy': 'Scheduling…',
    'schedule.ok': '{drink} scheduled for {time}',
    'schedule.canceling': 'Canceling…',
    'schedule.canceled': 'Schedule canceled',

    'recipe.coffee': 'Coffee',
    'recipe.water': 'Water',
    'recipe.mine': 'My recipes',
    'recipe.empty': 'No saved recipes yet',
    'recipe.delete': 'Delete',
    'recipe.namePrompt': 'Recipe name',
    'recipe.defaultName': 'My coffee',
    'recipe.saved': 'Recipe saved',
    'recipe.summary': '{coffee} ml coffee · {water} ml water · {temp}',
    'recipe.pickAmount': 'Choose an amount',
    'recipe.brewing': 'Brewing your recipe…',

    'menu.cups': 'Cup sizes',
    'menu.caps': 'Capsules',
    'menu.standby': 'Auto power-off',
    'menu.hardness': 'Water hardness',
    'menu.maint': 'Maintenance',
    'menu.info': 'About',
    'menu.key': 'Key',
    'menu.sim': 'Simulator',
    'menu.language': 'Language',

    'cups.text': 'What each dial position pours. Stored in the machine.',
    'cups.defaults': 'Defaults',
    'cups.reading': 'Reading…',
    'cups.factory': 'default {ml}',
    'cups.confirm': 'Reset all sizes to factory defaults?',
    'cups.restoring': 'Restoring…',
    'cups.restored': 'Factory sizes restored',
    'cup.ristretto': 'Ristretto',
    'cup.espresso': 'Espresso',
    'cup.lungo': 'Lungo',
    'cup.americanoCoffee': 'Americano · coffee',
    'cup.americanoWater': 'Americano · water',
    'cup.hotWater': 'Hot water',

    'caps.text': 'Enter how many capsules you have and the machine counts them down.',
    'caps.warnAt': 'Warn when down to',
    'caps.saved': 'Capsules saved',
    'caps.notSet': 'Not set',
    'caps.inStock': '{n} in stock',
    'caps.count': '{n} capsules',
    'caps.low': '{n} capsules left',

    'standby.text': 'How long it waits unused before going to sleep.',
    'standby.saved': 'Auto power-off: {value}',

    'hardness.text': 'Sets how often it asks for descaling.',
    'hardness.level': 'Level {n}',
    'hardness.saved': 'Water hardness: {n}',

    'maint.state': 'Status',
    'maint.water': 'Water',
    'maint.descaling': 'Descaling',
    'maint.counter': 'Counter',
    'maint.lever': 'Lever',
    'maint.empty': 'Empty',
    'maint.ok': 'OK',
    'maint.needed': 'Needed',
    'maint.upToDate': 'Up to date',
    'maint.descale': 'Descale',
    'maint.closed': 'Closed',
    'maint.open': 'Open',

    'info.name': 'Name',
    'info.serial': 'Serial',
    'info.firmware': 'Firmware',
    'info.bluetooth': 'Bluetooth',
    'info.hardware': 'Hardware',
    'info.address': 'Address',
    'info.raw': 'Raw data',
    'info.rawState': 'state',

    'key.text': 'Use it to pair other devices without spending a new pairing.',
    'key.copy': 'Copy',
    'key.copied': 'Key copied',
    'key.copyFailed': "Couldn't copy; select it by hand",

    'sim.water': 'Remove/refill water',
    'sim.lever': 'Open and close lever',
    'sim.leverReady': 'Lever ready',

    'lang.text': 'Language used by the app.',
    'lang.auto': 'Automatic',

    'state.reset': 'Restarting',
    'state.heatUp': 'Heating up',
    'state.ready': 'Ready',
    'state.descalingReady': 'Ready to descale',
    'state.brewing': 'Brewing',
    'state.menu': 'In menu',
    'state.descaling': 'Descaling',
    'state.steamOut': 'Steam',
    'state.error': 'Error',
    'state.powerSave': 'Sleeping',
    'state.overHeat': 'Overheated',
    'state.diagnostic': 'Diagnostics',
    'state.bleSettings': 'Bluetooth settings',
    'state.factoryReset': 'Resetting',
    'state.hardnessSettings': 'Setting hardness',
    'state.standbySettings': 'Setting power-off',
    'state.unknown': 'Unknown',
    'state.programmingCup': 'Programming size',
    'status.wakes': 'wakes up when you brew',

    'alert.noWater': 'No water',
    'alert.descale': 'Descale',
    'alert.jammed': 'Capsule jammed',
    'alert.tray': 'Check the tray',
    'alert.leverOpen': 'Lever open',

    'busy.connecting': 'Connecting…',
    'busy.pairing': 'Pairing…',
    'busy.tryingKey': 'Trying key…',
    'busy.refreshing': 'Updating…',
    'busy.saving': 'Saving…',

    'toast.paired': 'Machine paired',
    'toast.keyFailed': "The saved key didn't work. Pair again or use another key",
    'toast.disconnected': 'Machine disconnected',

    'err.auth': 'The machine rejected the key',
    'err.lost': 'Lost connection to the machine',
    'err.badKey': 'The key must be 16 hexadecimal characters',
    'err.generic': 'Error',

    'response.outOfRange': 'Value out of range for the machine',
    'response.invalidState': "The machine isn't ready. Check the water and that it's on",
    'response.trayFull': 'Empty the used capsule container',
    'response.obstacle': 'Something is blocking the mechanism',
    'response.descaleOn': "It's in descaling mode",
    'response.busy': 'Still finishing the previous action',
    'response.notAbortable': "This action can't be stopped",
    'response.leverOpen': 'Close the lever',
    'response.pumpRunning': 'The pump is running, wait a moment',
    'response.motorRunning': 'The motor is running, wait a moment',
    'response.leverNotCycled': 'Open and close the lever with a new capsule',
    'response.unknown': "The machine didn't respond",
  },

  es: {
    'connect.lede': 'Controlá tu Expert desde el teléfono o la compu. Sin la app oficial.',
    'connect.button': 'Conectar cafetera',
    'connect.demo': 'Probar en modo demo',
    'connect.hint': 'Encendé la cafetera y acercate a ella.',
    'connect.unsupported': 'Este navegador no tiene Bluetooth. En la PC usá Chrome o Edge; en iPhone, la app Bluefy.',

    'pair.title': 'Vincular',
    'pair.newTitle': 'Primera vez',
    'pair.newText': 'Crea una clave nueva y la guarda en la cafetera. Hacelo una sola vez: la máquina tiene lugar para unas 25 vinculaciones en total.',
    'pair.newButton': 'Vincular esta cafetera',
    'pair.keyTitle': 'Ya tengo una clave',
    'pair.keyText': 'Usá la misma clave en todos tus dispositivos (la encontrás en Máquina → Clave en el otro dispositivo).',
    'pair.keyPlaceholder': '16 caracteres, ej. 0a1b2c3d4e5f6071',
    'pair.keyButton': 'Usar clave',

    'common.cancel': 'Cancelar',
    'common.close': 'Cerrar',
    'common.done': 'Listo',
    'common.save': 'Guardar',

    'main.connected': 'Conectada',
    'main.refresh': 'Actualizar',
    'main.disconnect': 'Desconectar',

    'tab.brew': 'Café',
    'tab.recipes': 'Recetas',
    'tab.machine': 'Máquina',

    'drink.ristretto': 'Ristretto',
    'drink.espresso': 'Espresso',
    'drink.lungo': 'Lungo',
    'drink.americano': 'Americano',
    'drink.hotWater': 'Agua caliente',
    'drink.recipe': 'Receta',

    'temp.low': 'Baja',
    'temp.medium': 'Media',
    'temp.high': 'Alta',

    'brew.brew': 'Preparar',
    'brew.stop': 'Detener',
    'brew.later': 'Programar para más tarde',
    'brew.scheduled': 'Programado',
    'brew.scheduledAt': '{drink} a las {time}',
    'brew.brewing': 'Preparando {drink}…',
    'brew.done': '¡Listo! Que lo disfrutes',
    'brew.stopped': 'Detenido',

    'schedule.title': 'Programar',
    'schedule.text': 'Dejá la cápsula puesta, la palanca cerrada y la taza en su lugar. La cafetera la prepara sola a esa hora, aunque cierres la app.',
    'schedule.button': 'Programar',
    'schedule.busy': 'Programando…',
    'schedule.ok': '{drink} programado para las {time}',
    'schedule.canceling': 'Cancelando…',
    'schedule.canceled': 'Programación cancelada',

    'recipe.coffee': 'Café',
    'recipe.water': 'Agua',
    'recipe.mine': 'Mis recetas',
    'recipe.empty': 'Todavía no guardaste recetas',
    'recipe.delete': 'Borrar',
    'recipe.namePrompt': 'Nombre de la receta',
    'recipe.defaultName': 'Mi café',
    'recipe.saved': 'Receta guardada',
    'recipe.summary': '{coffee} ml café · {water} ml agua · {temp}',
    'recipe.pickAmount': 'Elegí alguna cantidad',
    'recipe.brewing': 'Preparando tu receta…',

    'menu.cups': 'Tamaños de taza',
    'menu.caps': 'Cápsulas',
    'menu.standby': 'Apagado automático',
    'menu.hardness': 'Dureza del agua',
    'menu.maint': 'Mantenimiento',
    'menu.info': 'Información',
    'menu.key': 'Clave',
    'menu.sim': 'Simulador',
    'menu.language': 'Idioma',

    'cups.text': 'Lo que sirve cada posición de la perilla. Se guarda en la cafetera.',
    'cups.defaults': 'De fábrica',
    'cups.reading': 'Leyendo…',
    'cups.factory': 'fábrica {ml}',
    'cups.confirm': '¿Volver todos los tamaños a los de fábrica?',
    'cups.restoring': 'Restaurando…',
    'cups.restored': 'Tamaños de fábrica restaurados',
    'cup.ristretto': 'Ristretto',
    'cup.espresso': 'Espresso',
    'cup.lungo': 'Lungo',
    'cup.americanoCoffee': 'Americano · café',
    'cup.americanoWater': 'Americano · agua',
    'cup.hotWater': 'Agua caliente',

    'caps.text': 'Cargá cuántas cápsulas tenés y la máquina las descuenta sola.',
    'caps.warnAt': 'Avisar cuando queden',
    'caps.saved': 'Cápsulas guardadas',
    'caps.notSet': 'Sin configurar',
    'caps.inStock': '{n} en stock',
    'caps.count': '{n} cápsulas',
    'caps.low': 'Quedan {n} cápsulas',

    'standby.text': 'Cuánto espera sin uso antes de pasar a reposo.',
    'standby.saved': 'Apagado automático: {value}',

    'hardness.text': 'Define cada cuánto avisa que hay que descalcificar.',
    'hardness.level': 'Nivel {n}',
    'hardness.saved': 'Dureza del agua: {n}',

    'maint.state': 'Estado',
    'maint.water': 'Agua',
    'maint.descaling': 'Descalcificación',
    'maint.counter': 'Contador',
    'maint.lever': 'Palanca',
    'maint.empty': 'Vacía',
    'maint.ok': 'OK',
    'maint.needed': 'Necesaria',
    'maint.upToDate': 'Al día',
    'maint.descale': 'Descalcificar',
    'maint.closed': 'Cerrada',
    'maint.open': 'Abierta',

    'info.name': 'Nombre',
    'info.serial': 'Serie',
    'info.firmware': 'Firmware',
    'info.bluetooth': 'Bluetooth',
    'info.hardware': 'Hardware',
    'info.address': 'Dirección',
    'info.raw': 'Datos crudos',
    'info.rawState': 'estado',

    'key.text': 'Usala para vincular otros dispositivos sin gastar una vinculación nueva.',
    'key.copy': 'Copiar',
    'key.copied': 'Clave copiada',
    'key.copyFailed': 'No se pudo copiar; seleccionala a mano',

    'sim.water': 'Quitar/poner agua',
    'sim.lever': 'Abrir y cerrar palanca',
    'sim.leverReady': 'Palanca lista',

    'lang.text': 'Idioma de la app.',
    'lang.auto': 'Automático',

    'state.reset': 'Reiniciando',
    'state.heatUp': 'Calentando',
    'state.ready': 'Lista',
    'state.descalingReady': 'Lista para descalcificar',
    'state.brewing': 'Preparando',
    'state.menu': 'En el menú',
    'state.descaling': 'Descalcificando',
    'state.steamOut': 'Vapor',
    'state.error': 'Error',
    'state.powerSave': 'En reposo',
    'state.overHeat': 'Sobrecalentada',
    'state.diagnostic': 'Diagnóstico',
    'state.bleSettings': 'Ajustes Bluetooth',
    'state.factoryReset': 'Restableciendo',
    'state.hardnessSettings': 'Ajustando dureza',
    'state.standbySettings': 'Ajustando apagado',
    'state.unknown': 'Desconocido',
    'state.programmingCup': 'Programando tamaño',
    'status.wakes': 'se enciende al preparar',

    'alert.noWater': 'Sin agua',
    'alert.descale': 'Descalcificar',
    'alert.jammed': 'Cápsula trabada',
    'alert.tray': 'Revisá la bandeja',
    'alert.leverOpen': 'Palanca abierta',

    'busy.connecting': 'Conectando…',
    'busy.pairing': 'Vinculando…',
    'busy.tryingKey': 'Probando clave…',
    'busy.refreshing': 'Actualizando…',
    'busy.saving': 'Guardando…',

    'toast.paired': 'Cafetera vinculada',
    'toast.keyFailed': 'La clave guardada no funcionó. Vinculá de nuevo o usá otra clave',
    'toast.disconnected': 'Cafetera desconectada',

    'err.auth': 'La cafetera rechazó la clave',
    'err.lost': 'Se perdió la conexión con la cafetera',
    'err.badKey': 'La clave debe tener 16 caracteres hexadecimales',
    'err.generic': 'Error',

    'response.outOfRange': 'Valor fuera de rango para la máquina',
    'response.invalidState': 'La máquina no está lista. Revisá el agua y que esté encendida',
    'response.trayFull': 'Vaciá el contenedor de cápsulas usadas',
    'response.obstacle': 'Hay algo trabando el mecanismo',
    'response.descaleOn': 'Está en modo descalcificación',
    'response.busy': 'Todavía está terminando la acción anterior',
    'response.notAbortable': 'Esta acción no se puede detener',
    'response.leverOpen': 'Cerrá la palanca',
    'response.pumpRunning': 'La bomba está en marcha, esperá un momento',
    'response.motorRunning': 'El motor está en marcha, esperá un momento',
    'response.leverNotCycled': 'Abrí y cerrá la palanca con una cápsula nueva',
    'response.unknown': 'La máquina no respondió',
  },
};

export const LANGUAGES = [
  ['en', 'English'],
  ['es', 'Español'],
];

const PREF_KEY = 'crema.lang';

function detect() {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = String(tag).slice(0, 2).toLowerCase();
    if (STRINGS[base]) return base;
  }
  return 'en';
}

// 'auto' follows the device language.
export function languagePref() {
  try {
    return localStorage.getItem(PREF_KEY) || 'auto';
  } catch {
    return 'auto';
  }
}

export let lang = languagePref() === 'auto' ? detect() : languagePref();

export function setLanguage(pref) {
  try {
    localStorage.setItem(PREF_KEY, pref);
  } catch {
    /* storage unavailable */
  }
  lang = pref === 'auto' ? detect() : pref;
  applyStatic();
}

export function t(key, vars = {}) {
  const s = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// Fills static markup: data-i18n (text), data-i18n-aria, data-i18n-placeholder.
export function applyStatic(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => (el.placeholder = t(el.dataset.i18nPlaceholder)));
}
