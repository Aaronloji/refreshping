const $ = id => document.getElementById(id);
const CFG = self.RP_CONFIG;
let tabId, origin, running = false, tabInfo = null, pro = false;

const send = m => new Promise(r => chrome.runtime.sendMessage(m, r));
const FIELDS = ['val', 'unit', 'kw', 'mode', 'jit', 'hoursOn', 'from', 'to', 'sound'];

function msg(text, err) { $('status').textContent = text || ''; $('status').className = err ? 'err' : ''; }

function render() {
  $('toggle').textContent = running ? 'Stop' : 'Start';
  for (const id of FIELDS) $(id).disabled = running || (!pro && ['jit', 'hoursOn', 'from', 'to', 'sound'].includes(id));
  $('pro').className = pro ? '' : 'locked';
  $('protag').textContent = pro ? 'active' : '$9.99 once';
  $('free').hidden = pro; $('paid').hidden = !pro;
  if (running) msg(tabInfo && tabInfo.keyword ? `Watching for "${tabInfo.keyword}" (${tabInfo.mode})` : 'Running on this tab');
}

function readForm() {
  return {
    val: Math.max(1, Number($('val').value) || 30), unit: Number($('unit').value),
    kw: $('kw').value.trim(), mode: $('mode').value,
    jit: Number($('jit').value) || 0, hoursOn: $('hoursOn').checked,
    from: $('from').value, to: $('to').value, sound: $('sound').checked
  };
}

function fillForm(s) {
  if ('val' in s) $('val').value = s.val;
  if ('unit' in s) $('unit').value = s.unit;
  $('kw').value = s.kw || ''; $('mode').value = s.mode || 'appears';
  $('jit').value = s.jit || 0; $('hoursOn').checked = !!s.hoursOn;
  if (s.from) $('from').value = s.from;
  if (s.to) $('to').value = s.to;
  $('sound').checked = !!s.sound;
}

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab.id;
  try { const u = new URL(tab.url); if (/^https?:$/.test(u.protocol)) origin = u.origin; } catch (e) {}

  if (origin) {
    const saved = ((await chrome.storage.local.get('sites')).sites || {})[origin];
    if (saved) fillForm(saved);
  }
  const st = await send({ type: 'status', tabId });
  pro = st.pro; tabInfo = st.tab;
  if (tabInfo) {
    running = true;
    const s = tabInfo.intervalSec;
    fillForm({
      val: s % 60 === 0 ? s / 60 : s, unit: s % 60 === 0 ? 60 : 1,
      kw: tabInfo.keyword, mode: tabInfo.mode, jit: tabInfo.jitterPct,
      hoursOn: !!tabInfo.hours, from: tabInfo.hours && tabInfo.hours.from, to: tabInfo.hours && tabInfo.hours.to,
      sound: tabInfo.sound
    });
  }
  render();
})();

$('toggle').onclick = async () => {
  if (running) {
    await send({ type: 'stop', tabId });
    running = false; tabInfo = null; msg(''); render();
    return;
  }
  const f = readForm();
  // Ask for access to this site only, and only when a text alert is set.
  // Must be called synchronously inside the click so Chrome treats it as a user gesture.
  if (f.kw && origin) chrome.permissions.request({ origins: [origin + '/*'] }).catch(() => {});

  const res = await send({
    type: 'start', tabId, intervalSec: f.val * f.unit, keyword: f.kw, mode: f.mode,
    jitterPct: f.jit, hours: f.hoursOn ? { from: f.from, to: f.to } : null, sound: f.sound
  });
  if (!res || !res.ok) { msg(res && res.error || 'Could not start.', true); return; }
  if (origin) {
    const { sites = {} } = await chrome.storage.local.get('sites');
    sites[origin] = f;
    await chrome.storage.local.set({ sites });
  }
  running = true; tabInfo = f.kw ? { keyword: f.kw, mode: f.mode } : null; render();
};

$('buy').onclick = e => { e.preventDefault(); chrome.tabs.create({ url: CFG.CHECKOUT_URL }); };
$('test').onclick = e => { e.preventDefault(); if (pro) send({ type: 'testSound' }); };

$('act').onclick = async () => {
  $('act').disabled = true; msg('Checking key...');
  const r = await send({ type: 'activate', key: $('key').value });
  $('act').disabled = false;
  if (r.ok) { pro = true; $('key').value = ''; msg('Pro activated. Thank you!'); }
  else msg(r.error, true);
  render();
};

$('deact').onclick = async () => {
  await send({ type: 'deactivate' });
  pro = false; msg('License removed from this browser.'); render();
};
