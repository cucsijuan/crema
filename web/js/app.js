import { BREW, TEMP, RESPONSE, CUP_SIZES, STANDBY_OPTIONS } from './protocol.js';
import { WebBluetoothTransport, NativeTransport, DemoTransport } from './transport.js';
import { Machine } from './machine.js';
import { t, lang, LANGUAGES, languagePref, setLanguage, applyStatic } from './i18n.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const DRINKS = [
  { id: 'ristretto', type: BREW.ristretto, coffee: 25, water: 0 },
  { id: 'espresso', type: BREW.espresso, coffee: 40, water: 0 },
  { id: 'lungo', type: BREW.lungo, coffee: 110, water: 0 },
  { id: 'americano', type: BREW.americano, coffee: 40, water: 110 },
  { id: 'hotWater', type: BREW.hotWater, coffee: 0, water: 200 },
];
const drinkName = (d) => t(`drink.${d.id}`);

const TEMPS = ['low', 'medium', 'high'];
const tempOptions = () => TEMPS.map((k) => [k, t(`temp.${k}`)]);

// state -> [ring style, icon]
const STATE_UI = {
  reset: ['spin', 'heat'],
  heatUp: ['spin', 'heat'],
  ready: ['full', 'cup'],
  descalingReady: ['warn', 'drop'],
  brewing: ['spin', 'drop'],
  menu: ['idle', 'gear'],
  descaling: ['spin', 'drop'],
  steamOut: ['spin', 'heat'],
  error: ['warn', 'alert'],
  powerSave: ['idle', 'moon'],
  overHeat: ['warn', 'alert'],
  diagnostic: ['idle', 'gear'],
  bleSettings: ['idle', 'gear'],
  factoryReset: ['spin', 'gear'],
  hardnessSettings: ['idle', 'gear'],
  standbySettings: ['idle', 'gear'],
  unknown: ['idle', 'alert'],
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
    /* storage unavailable */
  }
}
function loadRecipes() {
  try {
    return JSON.parse(localStorage.getItem(RECIPES_KEY)) || [];
  } catch {
    return [];
  }
}

const formatTime = (ms) => new Date(ms).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });

// ---------- UI helpers ----------

function show(screen) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === screen));
}

function openSheet(id) {
  $$('.sheet').forEach((x) => x.classList.toggle('open', x.id === id));
  $('#sheet-backdrop').classList.add('open');
}
function closeSheets() {
  $$('.sheet.open').forEach((x) => x.classList.remove('open'));
  $('#sheet-backdrop').classList.remove('open');
}

let toastTimer;
function toast(text, bad = false) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.toggle('bad', bad);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
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
  if (/Authoriz|authenticat/i.test(m)) return t('err.auth');
  if (/disconnect|not connected|GATT Server/i.test(m)) return t('err.lost');
  if (/16 hex/i.test(m)) return t('err.badKey');
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

// ---------- screens ----------

// Real dial volumes once they have been read from the machine.
function drinkVolumes(d) {
  const s = machine?.cupSizes ?? {};
  if (d.id === 'americano' && s.americanoCoffee && s.americanoWater) return [s.americanoCoffee, s.americanoWater];
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
    b.innerHTML = `${cupSvg(coffee, water)}<b>${drinkName(d)}</b><small>${coffee + water} ml</small>`;
    b.onclick = () => {
      prefs.drink = d.id;
      store(PREFS_KEY, prefs);
      renderDrinks();
    };
    el.appendChild(b);
  }
}

function renderTemps() {
  segmented($('#temp-brew'), tempOptions(), prefs.temp, (v) => {
    prefs.temp = v;
    store(PREFS_KEY, prefs);
  });
  segmented($('#temp-recipe'), tempOptions(), prefs.recipeTemp, (v) => {
    prefs.recipeTemp = v;
    store(PREFS_KEY, prefs);
  });
}

function renderLanguage() {
  const options = [['auto', t('lang.auto')], ...LANGUAGES];
  const pref = languagePref();
  $('#sum-lang').textContent = options.find(([k]) => k === pref)[1];
  segmented($('#language'), options, pref, (v) => {
    setLanguage(v);
    renderAll();
  });
}

function renderStatus() {
  if (!machine?.status) return;
  const s = machine.status;
  const key = s.programmingCup ? 'programmingCup' : STATE_UI[s.state] ? s.state : 'unknown';
  const [ring, ic] = s.programmingCup ? ['spin', 'drop'] : STATE_UI[key];
  const label = t(`state.${key}`);
  $('#status-label').textContent = label;
  $('#status-icon').innerHTML = icon(ic);
  $('#status-ring').className = `status-ring ${ring}`;

  const sub = [];
  if (machine.caps != null) sub.push(t('caps.count', { n: machine.caps }));
  if (s.state === 'powerSave') sub.push(t('status.wakes'));
  $('#status-sub').textContent = sub.join(' · ');

  const alerts = [];
  if (s.waterEmpty) alerts.push([t('alert.noWater'), true]);
  if (s.descaleNeeded) alerts.push([t('alert.descale'), false]);
  if (s.capsuleJammed) alerts.push([t('alert.jammed'), true]);
  if (s.trayIssue) alerts.push([t('alert.tray'), false]);
  if (machine.lever && !machine.lever.leverClosed) alerts.push([t('alert.leverOpen'), false]);
  if (machine.caps != null && machine.capsThreshold != null && machine.caps <= machine.capsThreshold) {
    alerts.push([t('caps.low', { n: machine.caps }), false]);
  }
  $('#alerts').innerHTML = alerts.map(([text, bad]) => `<span class="chip ${bad ? 'bad' : ''}">${text}</span>`).join('');

  const brewing = s.state === 'brewing';
  $('#btn-brew').classList.toggle('hidden', brewing);
  $('#btn-abort').classList.toggle('hidden', !brewing);

  if (lastState === 'brewing' && s.state !== 'brewing') toast(t('brew.done'));
  lastState = s.state;

  const p = machine.programmed;
  $('#scheduled').classList.toggle('hidden', !p);
  if (p) {
    const d = DRINKS.find((x) => x.type === p.type);
    $('#scheduled-text').textContent = t('brew.scheduledAt', {
      drink: d ? drinkName(d) : t('drink.recipe'),
      time: formatTime(p.at),
    });
  }

  // Machine tab
  $('#caps-label').textContent = machine.caps == null ? t('caps.notSet') : t('caps.inStock', { n: machine.caps });
  $('#sum-standby').textContent = STANDBY_OPTIONS.find(([sec]) => sec === machine.standby)?.[1] ?? '—';
  $('#sum-hardness').textContent = machine.hardness == null ? '—' : t('hardness.level', { n: machine.hardness });
  $('#sum-maint').textContent = s.descaleNeeded ? t('maint.descale') : t('maint.upToDate');
  if (document.activeElement !== $('#caps-input')) $('#caps-input').value = machine.caps ?? 0;
  if (document.activeElement !== $('#caps-threshold')) $('#caps-threshold').value = machine.capsThreshold ?? 10;
  segmented($('#standby'), STANDBY_OPTIONS, machine.standby, (sec) =>
    run(t('busy.saving'), async () => {
      await machine.setStandby(sec);
      toast(t('standby.saved', { value: STANDBY_OPTIONS.find(([x]) => x === sec)[1] }));
    }),
  );
  segmented($('#hardness'), [0, 1, 2, 3, 4].map((n) => [n, String(n)]), machine.hardness, (lvl) =>
    run(t('busy.saving'), async () => {
      await machine.setHardness(lvl);
      toast(t('hardness.saved', { n: lvl }));
    }),
  );
  $('#maintenance').innerHTML = kv([
    [t('maint.state'), label],
    [t('maint.water'), s.waterEmpty ? t('maint.empty') : t('maint.ok')],
    [t('maint.descaling'), s.descaleNeeded ? t('maint.needed') : t('maint.upToDate')],
    [t('maint.counter'), s.descaleCounter ?? '—'],
    [t('maint.lever'), machine.lever ? (machine.lever.leverClosed ? t('maint.closed') : t('maint.open')) : '—'],
  ]);
  $('#raw').textContent = `${t('info.rawState')} ${s.raw}`;
}

function kv(rows) {
  return rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

function renderInfo() {
  if (!machine?.info) return;
  $('#machine-name').textContent = demo ? 'Expert (demo)' : machine.device.name.replace(/_.*/, '');
  const i = machine.info;
  $('#info').innerHTML = kv([
    [t('info.name'), machine.device.name],
    [t('info.serial'), machine.serial || '—'],
    [t('info.firmware'), i.firmware],
    [t('info.bluetooth'), i.connectivity],
    [t('info.hardware'), i.hardware],
    [t('info.address'), i.address],
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
    const name = t(`cup.${c.id}`);
    const row = document.createElement('label');
    row.className = 'cup-row';
    row.innerHTML = `<div class="row"><span>${name} <small>· ${t('cups.factory', { ml: c.def })}</small></span><b><span class="v">${sizes[c.id]}</span> ml</b></div>
      <input type="range" min="${c.min}" max="${c.max}" step="1" value="${sizes[c.id]}">`;
    const input = row.querySelector('input');
    input.oninput = () => (row.querySelector('.v').textContent = input.value);
    input.onchange = async () => {
      row.classList.add('saving');
      try {
        const saved = await machine.setCupSize(c.id, +input.value);
        toast(`${name}: ${saved} ml`);
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
    el.innerHTML = `<li class="empty">${t('recipe.empty')}</li>`;
    return;
  }
  el.innerHTML = '';
  list.forEach((r, idx) => {
    const li = document.createElement('li');
    const temp = t(`temp.${TEMPS.includes(r.temp) ? r.temp : 'medium'}`);
    li.innerHTML = `<div class="meta"><b></b><small>${t('recipe.summary', { coffee: r.coffee, water: r.water, temp })}</small></div>
      <button class="btn small primary">${t('brew.brew')}</button>
      <button class="icon-btn" aria-label="${t('recipe.delete')}"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>`;
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

function renderConnectHint() {
  const supported = NativeTransport.supported() || WebBluetoothTransport.supported();
  $('#btn-connect').disabled = !supported;
  $('#connect-hint').textContent = supported ? t('connect.hint') : t('connect.unsupported');
}

function renderAll() {
  applyStatic();
  renderConnectHint();
  renderLanguage();
  renderTemps();
  renderDrinks();
  renderRecipes();
  renderInfo();
  renderStatus();
  renderCupSizes();
}

// ---------- actions ----------

function report(r, okText) {
  if (r === RESPONSE.ok) toast(okText);
  else toast(t(`response.${r}`), true);
}

async function brewSelected() {
  const d = DRINKS.find((x) => x.id === prefs.drink);
  await run(null, async () =>
    report(await machine.brew(d.type, TEMP[prefs.temp]), t('brew.brewing', { drink: drinkName(d).toLowerCase() })),
  );
}

async function brewRecipe(coffee, water, temp) {
  if (coffee + water <= 0) return toast(t('recipe.pickAmount'), true);
  await run(null, async () => report(await machine.brewRecipe(coffee, water, TEMP[temp]), t('recipe.brewing')));
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
    toast(t('toast.keyFailed'), true);
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
    toast(t('toast.disconnected'), true);
  });
  await run(t('busy.connecting'), () => machine.connect());
}

function bind() {
  $('#btn-connect').onclick = () => connect(false);
  $('#btn-demo').onclick = () => connect(true);

  $('#btn-pair-new').onclick = () =>
    run(t('busy.pairing'), async () => {
      await machine.pair();
      toast(t('toast.paired'));
    });
  $('#btn-pair-key').onclick = () => run(t('busy.tryingKey'), () => machine.useKey($('#input-key').value));
  $$('[data-action=disconnect]').forEach((b) => (b.onclick = () => machine?.disconnect()));

  $$('.tabbtn').forEach(
    (b) =>
      (b.onclick = () => {
        $$('.tabbtn').forEach((x) => x.classList.toggle('active', x === b));
        $$('.tab').forEach((x) => x.classList.toggle('active', x.id === b.dataset.tab));
      }),
  );

  $('#btn-brew').onclick = brewSelected;
  $('#btn-abort').onclick = () => run(null, async () => report(await machine.abort(), t('brew.stopped')));
  $('#btn-refresh').onclick = () => run(t('busy.refreshing'), () => machine.refresh());

  $('#coffee-ml').value = prefs.coffee;
  $('#water-ml').value = prefs.water;
  $('#coffee-ml').oninput = renderRecipeBuilder;
  $('#water-ml').oninput = renderRecipeBuilder;
  $('#btn-brew-recipe').onclick = () => brewRecipe(+$('#coffee-ml').value, +$('#water-ml').value, prefs.recipeTemp);
  $('#btn-save-recipe').onclick = () => {
    const name = prompt(t('recipe.namePrompt'), t('recipe.defaultName'));
    if (!name) return;
    const list = loadRecipes();
    list.push({ name, coffee: +$('#coffee-ml').value, water: +$('#water-ml').value, temp: prefs.recipeTemp });
    store(RECIPES_KEY, list);
    renderRecipes();
    toast(t('recipe.saved'));
  };

  $$('[data-caps]').forEach(
    (b) =>
      (b.onclick = () => {
        const v = Math.max(0, Math.min(999, (+$('#caps-input').value || 0) + +b.dataset.caps));
        $('#caps-input').value = v;
      }),
  );
  $('#btn-caps').onclick = () =>
    run(t('busy.saving'), async () => {
      const clamp = (v) => Math.max(0, Math.min(999, +v || 0));
      await machine.setCaps(clamp($('#caps-input').value), clamp($('#caps-threshold').value));
      toast(t('caps.saved'));
      closeSheets();
    });

  $('#btn-cup-defaults').onclick = () => {
    if (!confirm(t('cups.confirm'))) return;
    run(t('cups.restoring'), async () => {
      for (const c of CUP_SIZES) await machine.setCupSize(c.id, c.def);
      toast(t('cups.restored'));
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
    run(t('schedule.busy'), async () => {
      const r = await machine.schedule(d.type, TEMP[prefs.temp], when.getTime());
      report(r, t('schedule.ok', { drink: drinkName(d), time: formatTime(when) }));
      if (r === RESPONSE.ok) closeSheets();
    });
  };
  $('#btn-cancel-schedule').onclick = () =>
    run(t('schedule.canceling'), async () => report(await machine.abort(), t('schedule.canceled')));

  $('#btn-copy-key').onclick = async () => {
    try {
      await navigator.clipboard.writeText(machine.key);
      toast(t('key.copied'));
    } catch {
      toast(t('key.copyFailed'), true);
    }
  };

  $('#sim-water').onclick = () => machine.t.toggleWater();
  $('#sim-lever').onclick = () => {
    machine.t.cycleLever();
    toast(t('sim.leverReady'));
  };

  renderAll();
  renderRecipeBuilder();
}

bind();
