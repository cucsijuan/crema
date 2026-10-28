import { BREW, TEMP, RESPONSE, CUP_SIZES, STANDBY_OPTIONS } from './protocol.js';
import { WebBluetoothTransport, NativeTransport, DemoTransport } from './transport.js';
import { Machine } from './machine.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const DRINKS = [
  { id: 'ristretto', name: 'Ristretto', ml: 25, type: BREW.ristretto, coffee: 25, water: 0 },
  { id: 'espresso', name: 'Espresso', ml: 40, type: BREW.espresso, coffee: 40, water: 0 },
  { id: 'lungo', name: 'Lungo', ml: 110, type: BREW.lungo, coffee: 110, water: 0 },
  { id: 'americano', name: 'Americano', ml: 150, type: BREW.americano, coffee: 40, water: 110 },
  { id: 'hotWater', name: 'Agua caliente', ml: 200, type: BREW.hotWater, coffee: 0, water: 200 },
];

const TEMPS = [['low', 'Baja'], ['medium', 'Media'], ['high', 'Alta']];

const STATE_UI = {
  reset: ['Reiniciando', 'spin', 'heat'],
  heatUp: ['Calentando', 'spin', 'heat'],
  ready: ['Lista', 'full', 'cup'],
  descalingReady: ['Lista para descalcificar', 'warn', 'drop'],
  brewing: ['Preparando', 'spin', 'drop'],
  menu: ['En el menú', 'idle', 'gear'],
  descaling: ['Descalcificando', 'spin', 'drop'],
  steamOut: ['Vapor', 'spin', 'heat'],
  error: ['Error', 'warn', 'alert'],
  powerSave: ['En reposo', 'idle', 'moon'],
  overHeat: ['Sobrecalentada', 'warn', 'alert'],
  diagnostic: ['Diagnóstico', 'idle', 'gear'],
  bleSettings: ['Ajustes Bluetooth', 'idle', 'gear'],
  factoryReset: ['Restableciendo', 'spin', 'gear'],
  hardnessSettings: ['Ajustando dureza', 'idle', 'gear'],
  standbySettings: ['Ajustando apagado', 'idle', 'gear'],
  unknown: ['Desconocido', 'idle', 'alert'],
};

const ICONS = {
  cup: '<path d="M5 9h12v4a6 6 0 0 1-6 6h0a6 6 0 0 1-6-6zM17 10h1.5a2.5 2.5 0 0 1 0 5H17"/>',
  heat: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .5 2 1.5 3 2.5 3 0-3-1-5 0-8z"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  alert: '<path d="M12 3l9.5 17h-19zM12 10v4M12 17.5v.01"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

const RESPONSE_TEXT = {
  [RESPONSE.ok]: null,
  [RESPONSE.outOfRange]: 'Valor fuera de rango para la máquina',
  [RESPONSE.invalidState]: 'La máquina no está lista. Revisá el agua y que esté encendida',
  [RESPONSE.trayFull]: 'Vaciá el contenedor de cápsulas usadas',
  [RESPONSE.obstacle]: 'Hay algo trabando el mecanismo',
  [RESPONSE.descaleOn]: 'Está en modo descalcificación',
  [RESPONSE.busy]: 'Todavía está terminando la acción anterior',
  [RESPONSE.notAbortable]: 'Esta acción no se puede detener',
  [RESPONSE.leverOpen]: 'Cerrá la palanca',
  [RESPONSE.pumpRunning]: 'La bomba está en marcha, esperá un momento',
  [RESPONSE.motorRunning]: 'El motor está en marcha, esperá un momento',
  [RESPONSE.leverNotCycled]: 'Abrí y cerrá la palanca con una cápsula nueva',
  [RESPONSE.unknown]: 'La máquina no respondió',
};

const RECIPES_KEY = 'expert.recipes';
const PREFS_KEY = 'expert.prefs';

let machine = null;
let demo = false;
let prefs = load(PREFS_KEY, { drink: 'espresso', temp: 'medium', recipeTemp: 'medium', coffee: 40, water: 0 });
let lastState = null;

function load(key, fallback) {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(key)) };
  } catch {
    return fallback;
  }
}
function store(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento */
  }
}
function loadRecipes() {
  try {
    return JSON.parse(localStorage.getItem(RECIPES_KEY)) || [];
  } catch {
    return [];
  }
}

// ---------- utilidades de UI ----------

function show(screen) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === screen));
}

let toastTimer;
function toast(text, bad = false) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.toggle('bad', bad);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

function openSheet(id) {
  $$('.sheet').forEach((x) => x.classList.toggle('open', x.id === id));
  $('#sheet-backdrop').classList.add('open');
}
function closeSheets() {
  $$('.sheet.open').forEach((x) => x.classList.remove('open'));
  $('#sheet-backdrop').classList.remove('open');
}

function busy(text) {
  $('#busy-text').textContent = text || '';
  $('#busy').classList.toggle('hidden', !text);
}

async function run(text, fn) {
  busy(text);
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    if (e.name !== 'NotFoundError') toast(friendlyError(e), true);
  } finally {
    busy(null);
  }
}

function friendlyError(e) {
  const m = String(e?.message || e);
  if (/Authoriz|authenticat/i.test(m)) return 'La cafetera rechazó la clave';
  if (/disconnect|not connected|GATT Server/i.test(m)) return 'Se perdió la conexión con la cafetera';
  return m;
}

function segmented(el, options, value, onChange) {
  el.innerHTML = '';
  for (const [val, label] of options) {
    const b = document.createElement('button');
    b.textContent = label;
    b.classList.toggle('active', val === value);
    b.onclick = () => {
      el.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
      onChange(val);
    };
    el.appendChild(b);
  }
}

function cupSvg(coffee, water) {
  const total = coffee + water || 1;
  const h = Math.min(30, 8 + (total / 230) * 22);
  const cH = (coffee / total) * h;
  const top = 38 - h;
  return `<svg viewBox="0 0 48 48" aria-hidden="true">
    <rect class="fill-w" x="9" y="${top}" width="26" height="${h - cH}"/>
    <rect class="fill-c" x="9" y="${top + h - cH}" width="26" height="${cH}"/>
    <path class="cup-o" d="M8 ${Math.min(top - 2, 20)}v14a8 8 0 0 0 8 8h12a8 8 0 0 0 8-8V${Math.min(top - 2, 20)}M36 26h3a4 4 0 0 1 0 8h-3"/>
  </svg>`;
}

// ---------- pantallas ----------

// ml reales de la perilla si ya se leyeron de la máquina.
function drinkVolumes(d) {
  const s = machine?.cupSizes ?? {};
  if (d.id === 'americano' && s.americanoCoffee) return [s.americanoCoffee, s.americanoWater];
  if (d.id === 'hotWater' && s.hotWater) return [0, s.hotWater];
  if (s[d.id]) return [s[d.id], 0];
  return [d.coffee, d.water];
}

function renderDrinks() {
  const el = $('#drinks');
  el.innerHTML = '';
  for (const d of DRINKS) {
    const [coffee, water] = drinkVolumes(d);
    const b = document.createElement('button');
    b.className = 'drink';
    b.classList.toggle('active', d.id === prefs.drink);
    b.innerHTML = `${cupSvg(coffee, water)}<b>${d.name}</b><small>${coffee + water} ml</small>`;
    b.onclick = () => {
      prefs.drink = d.id;
      store(PREFS_KEY, prefs);
      renderDrinks();
    };
    el.appendChild(b);
  }
}

function renderStatus() {
  if (!machine?.status) return;
  const s = machine.status;
  const [label, ring, ic] = s.programmingCup
    ? ['Programando tamaño', 'spin', 'drop']
    : STATE_UI[s.state] ?? STATE_UI.unknown;
  $('#status-label').textContent = label;
  $('#status-icon').innerHTML = icon(ic);
  $('#status-ring').className = `status-ring ${ring}`;

  const sub = [];
  if (machine.caps != null) sub.push(`${machine.caps} cápsulas`);
  if (s.state === 'powerSave') sub.push('se enciende al preparar');
  $('#status-sub').textContent = sub.join(' · ');

  const alerts = [];
  if (s.waterEmpty) alerts.push(['Sin agua', true]);
  if (s.descaleNeeded) alerts.push(['Descalcificar', false]);
  if (s.capsuleJammed) alerts.push(['Cápsula trabada', true]);
  if (s.trayIssue) alerts.push(['Revisá la bandeja', false]);
  if (machine.lever && !machine.lever.leverClosed) alerts.push(['Palanca abierta', false]);
  if (machine.caps != null && machine.capsThreshold != null && machine.caps <= machine.capsThreshold) {
    alerts.push([`Quedan ${machine.caps} cápsulas`, false]);
  }
  $('#alerts').innerHTML = alerts.map(([t, bad]) => `<span class="chip ${bad ? 'bad' : ''}">${t}</span>`).join('');

  const brewing = s.state === 'brewing';
  $('#btn-brew').classList.toggle('hidden', brewing);
  $('#btn-abort').classList.toggle('hidden', !brewing);

  if (lastState === 'brewing' && s.state !== 'brewing') toast('¡Listo! Que lo disfrutes');
  lastState = s.state;

  const p = machine.programmed;
  $('#scheduled').classList.toggle('hidden', !p);
  if (p) {
    const drink = DRINKS.find((d) => d.type === p.type)?.name ?? 'Receta';
    const at = new Date(p.at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    $('#scheduled-text').textContent = `${drink} a las ${at}`;
  }

  // Máquina
  $('#caps-label').textContent = machine.caps == null ? 'Sin configurar' : `${machine.caps} en stock`;
  $('#sum-standby').textContent = STANDBY_OPTIONS.find(([sec]) => sec === machine.standby)?.[1] ?? '—';
  $('#sum-hardness').textContent = machine.hardness == null ? '—' : `Nivel ${machine.hardness}`;
  $('#sum-maint').textContent = s.descaleNeeded ? 'Descalcificar' : 'Al día';
  if (document.activeElement !== $('#caps-input')) $('#caps-input').value = machine.caps ?? 0;
  if (document.activeElement !== $('#caps-threshold')) $('#caps-threshold').value = machine.capsThreshold ?? 10;
  segmented($('#standby'), STANDBY_OPTIONS, machine.standby, (sec) =>
    run('Guardando…', async () => {
      await machine.setStandby(sec);
      toast(`Apagado automático: ${STANDBY_OPTIONS.find(([s]) => s === sec)[1]}`);
    }),
  );
  segmented($('#hardness'), [0, 1, 2, 3, 4].map((n) => [n, String(n)]), machine.hardness, (lvl) =>
    run('Guardando…', async () => {
      await machine.setHardness(lvl);
      toast(`Dureza del agua: ${lvl}`);
    }),
  );
  $('#maintenance').innerHTML = kv([
    ['Estado', label],
    ['Agua', s.waterEmpty ? 'Vacía' : 'OK'],
    ['Descalcificación', s.descaleNeeded ? 'Necesaria' : 'Al día'],
    ['Contador', s.descaleCounter ?? '—'],
    ['Palanca', machine.lever ? (machine.lever.leverClosed ? 'Cerrada' : 'Abierta') : '—'],
  ]);
  $('#raw').textContent = `estado ${s.raw}`;
}

function kv(rows) {
  return rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

function renderInfo() {
  $('#machine-name').textContent = demo ? 'Expert (demo)' : machine.device.name.replace(/_.*/, '');
  const i = machine.info;
  $('#info').innerHTML = kv([
    ['Nombre', machine.device.name],
    ['Serie', machine.serial || '—'],
    ['Firmware', i.firmware],
    ['Bluetooth', i.connectivity],
    ['Hardware', i.hardware],
    ['Dirección', i.address],
  ]);
  $('#key-view').textContent = machine.key ?? '—';
  $('#sum-info').textContent = `v${i.firmware}`;
  $('#sum-key').textContent = machine.key ? `${machine.key.slice(0, 4)}…` : '—';
  $('#sim-row').hidden = !demo;
}

function renderCupSizes() {
  const el = $('#cup-sizes');
  const sizes = machine?.cupSizes ?? {};
  if (!CUP_SIZES.every((c) => sizes[c.id] != null)) return;
  el.innerHTML = '';
  for (const c of CUP_SIZES) {
    const row = document.createElement('label');
    row.className = 'cup-row';
    row.innerHTML = `<div class="row"><span>${c.name} <small>· fábrica ${c.def}</small></span><b><span class="v">${sizes[c.id]}</span> ml</b></div>
      <input type="range" min="${c.min}" max="${c.max}" step="1" value="${sizes[c.id]}">`;
    const input = row.querySelector('input');
    input.oninput = () => (row.querySelector('.v').textContent = input.value);
    input.onchange = async () => {
      row.classList.add('saving');
      try {
        const saved = await machine.setCupSize(c.id, +input.value);
        toast(`${c.name}: ${saved} ml`);
      } catch (e) {
        toast(friendlyError(e), true);
      }
    };
    el.appendChild(row);
  }
  $('#sum-cups').textContent = `${sizes.ristretto} · ${sizes.espresso} · ${sizes.lungo} ml`;
  renderDrinks();
}

function renderRecipeBuilder() {
  const c = +$('#coffee-ml').value;
  const w = +$('#water-ml').value;
  $('#coffee-val').textContent = c;
  $('#water-val').textContent = w;
  $('#recipe-total').textContent = c + w;
  const scale = 105 / 450;
  const cH = c * scale;
  const wH = w * scale;
  const bottom = 133;
  $('#layer-coffee').setAttribute('y', bottom - cH);
  $('#layer-coffee').setAttribute('height', cH);
  $('#layer-water').setAttribute('y', bottom - cH - wH);
  $('#layer-water').setAttribute('height', wH);
  prefs.coffee = c;
  prefs.water = w;
  store(PREFS_KEY, prefs);
}

function renderRecipes() {
  const list = loadRecipes();
  const el = $('#recipe-list');
  if (!list.length) {
    el.innerHTML = '<li class="empty">Todavía no guardaste recetas</li>';
    return;
  }
  el.innerHTML = '';
  list.forEach((r, idx) => {
    const li = document.createElement('li');
    const temp = TEMPS.find(([k]) => k === r.temp)?.[1] ?? 'Media';
    li.innerHTML = `<div class="meta"><b></b><small>${r.coffee} ml café · ${r.water} ml agua · ${temp}</small></div>
      <button class="btn small primary">Preparar</button>
      <button class="icon-btn" aria-label="Borrar"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>`;
    li.querySelector('b').textContent = r.name;
    li.querySelector('.btn').onclick = () => brewRecipe(r.coffee, r.water, r.temp);
    li.querySelector('.icon-btn').onclick = () => {
      const next = loadRecipes();
      next.splice(idx, 1);
      store(RECIPES_KEY, next);
      renderRecipes();
    };
    el.appendChild(li);
  });
}

// ---------- acciones ----------

function report(r, okText) {
  if (r === RESPONSE.ok) toast(okText);
  else toast(RESPONSE_TEXT[r] ?? 'Error', true);
}

async function brewSelected() {
  const d = DRINKS.find((x) => x.id === prefs.drink);
  await run(null, async () => report(await machine.brew(d.type, TEMP[prefs.temp]), `Preparando ${d.name.toLowerCase()}…`));
}

async function brewRecipe(coffee, water, temp) {
  if (coffee + water <= 0) return toast('Elegí alguna cantidad', true);
  await run(null, async () => report(await machine.brewRecipe(coffee, water, TEMP[temp]), 'Preparando tu receta…'));
}

async function connect(useDemo) {
  demo = useDemo;
  const Real = NativeTransport.supported() ? NativeTransport : WebBluetoothTransport;
  const transport = demo ? new DemoTransport() : new Real();
  machine = new Machine(transport);
  window.__machine = machine;
  machine.addEventListener('status', renderStatus);
  machine.addEventListener('cupSizes', renderCupSizes);
  machine.addEventListener('needsPairing', () => show('screen-pair'));
  machine.addEventListener('authFailed', () => {
    show('screen-pair');
    toast('La clave guardada no funcionó. Vinculá de nuevo o usá otra clave', true);
  });
  machine.addEventListener('ready', () => {
    $('#conn-pill').classList.remove('off');
    renderInfo();
    renderStatus();
    show('screen-main');
  });
  machine.addEventListener('disconnected', () => {
    closeSheets();
    show('screen-connect');
    $('#conn-pill').classList.add('off');
    toast('Cafetera desconectada', true);
  });
  await run('Conectando…', () => machine.connect());
}

function bind() {
  const supported = NativeTransport.supported() || WebBluetoothTransport.supported();
  $('#btn-connect').disabled = !supported;
  $('#connect-hint').textContent = supported
    ? 'Encendé la cafetera y acercate a ella.'
    : 'Este navegador no tiene Bluetooth. En la PC usá Chrome o Edge; en iPhone, la app Bluefy.';
  $('#btn-connect').onclick = () => connect(false);
  $('#btn-demo').onclick = () => connect(true);

  $('#btn-pair-new').onclick = () =>
    run('Vinculando…', async () => {
      await machine.pair();
      toast('Cafetera vinculada');
    });
  $('#btn-pair-key').onclick = () => run('Probando clave…', () => machine.useKey($('#input-key').value));
  $$('[data-action=disconnect]').forEach((b) => (b.onclick = () => machine?.disconnect()));

  $$('.tabbtn').forEach(
    (b) =>
      (b.onclick = () => {
        $$('.tabbtn').forEach((x) => x.classList.toggle('active', x === b));
        $$('.tab').forEach((t) => t.classList.toggle('active', t.id === b.dataset.tab));
      }),
  );

  segmented($('#temp-brew'), TEMPS, prefs.temp, (v) => {
    prefs.temp = v;
    store(PREFS_KEY, prefs);
  });
  segmented($('#temp-recipe'), TEMPS, prefs.recipeTemp, (v) => {
    prefs.recipeTemp = v;
    store(PREFS_KEY, prefs);
  });

  $('#btn-brew').onclick = brewSelected;
  $('#btn-abort').onclick = () => run(null, async () => report(await machine.abort(), 'Detenido'));
  $('#btn-refresh').onclick = () => run('Actualizando…', () => machine.refresh());

  $('#coffee-ml').value = prefs.coffee;
  $('#water-ml').value = prefs.water;
  $('#coffee-ml').oninput = renderRecipeBuilder;
  $('#water-ml').oninput = renderRecipeBuilder;
  $('#btn-brew-recipe').onclick = () => brewRecipe(+$('#coffee-ml').value, +$('#water-ml').value, prefs.recipeTemp);
  $('#btn-save-recipe').onclick = () => {
    const name = prompt('Nombre de la receta', 'Mi café');
    if (!name) return;
    const list = loadRecipes();
    list.push({ name, coffee: +$('#coffee-ml').value, water: +$('#water-ml').value, temp: prefs.recipeTemp });
    store(RECIPES_KEY, list);
    renderRecipes();
    toast('Receta guardada');
  };

  $$('[data-caps]').forEach(
    (b) =>
      (b.onclick = () => {
        const v = Math.max(0, Math.min(999, (+$('#caps-input').value || 0) + +b.dataset.caps));
        $('#caps-input').value = v;
      }),
  );
  $('#btn-caps').onclick = () =>
    run('Guardando…', async () => {
      const clamp = (v) => Math.max(0, Math.min(999, +v || 0));
      await machine.setCaps(clamp($('#caps-input').value), clamp($('#caps-threshold').value));
      toast('Cápsulas guardadas');
      closeSheets();
    });

  $('#btn-cup-defaults').onclick = () => {
    if (!confirm('¿Volver todos los tamaños a los de fábrica?')) return;
    run('Restaurando…', async () => {
      for (const c of CUP_SIZES) await machine.setCupSize(c.id, c.def);
      toast('Tamaños de fábrica restaurados');
    });
  };

  $$('[data-sheet]').forEach((b) => (b.onclick = () => openSheet(b.dataset.sheet)));
  $$('[data-close]').forEach((b) => (b.onclick = closeSheets));
  $('#sheet-backdrop').onclick = closeSheets;

  $('#btn-schedule-toggle').onclick = () => openSheet('sheet-schedule');
  $('#btn-schedule').onclick = () => {
    const [h, m] = $('#schedule-time').value.split(':').map(Number);
    const when = new Date();
    when.setHours(h, m, 0, 0);
    if (when <= Date.now()) when.setDate(when.getDate() + 1);
    const d = DRINKS.find((x) => x.id === prefs.drink);
    run('Programando…', async () => {
      const r = await machine.schedule(d.type, TEMP[prefs.temp], when.getTime());
      const at = when.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
      report(r, `${d.name} programado para las ${at}`);
      if (r === RESPONSE.ok) closeSheets();
    });
  };
  $('#btn-cancel-schedule').onclick = () =>
    run('Cancelando…', async () => report(await machine.abort(), 'Programación cancelada'));

  $('#btn-copy-key').onclick = async () => {
    try {
      await navigator.clipboard.writeText(machine.key);
      toast('Clave copiada');
    } catch {
      toast('No se pudo copiar; seleccionala a mano', true);
    }
  };

  $('#sim-water').onclick = () => machine.t.toggleWater();
  $('#sim-lever').onclick = () => {
    machine.t.cycleLever();
    toast('Palanca lista');
  };

  renderDrinks();
  renderRecipeBuilder();
  renderRecipes();
}

bind();
