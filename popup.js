const $ = id => document.getElementById(id);
let tabId, origin, running = false, info = null;

const send = m => new Promise(r => chrome.runtime.sendMessage(m, r));

function render() {
  $('toggle').textContent = running ? 'Stop' : 'Start';
  for (const id of ['val', 'unit', 'kw', 'mode']) $(id).disabled = running;
  let s = '';
  if (running) s = info && info.keyword ? `Watching for "${info.keyword}" (${info.mode})` : 'Running on this tab';
  $('status').textContent = s;
}

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab.id;
  try { const u = new URL(tab.url); if (/^https?:$/.test(u.protocol)) origin = u.origin; } catch (e) {}

  if (origin) {
    const saved = ((await chrome.storage.local.get('sites')).sites || {})[origin];
    if (saved) {
      $('val').value = saved.val; $('unit').value = saved.unit;
      $('kw').value = saved.kw || ''; $('mode').value = saved.mode || 'appears';
    }
  }
  info = await send({ type: 'status', tabId });
  if (info) {
    running = true;
    const s = info.intervalSec;
    if (s % 60 === 0) { $('val').value = s / 60; $('unit').value = 60; } else { $('val').value = s; $('unit').value = 1; }
    $('kw').value = info.keyword || ''; $('mode').value = info.mode || 'appears';
  }
  render();
})();

$('toggle').onclick = () => {
  if (running) {
    send({ type: 'stop', tabId });
    running = false; info = null; render();
    return;
  }
  const val = Math.max(1, Number($('val').value) || 30);
  const unit = Number($('unit').value);
  const kw = $('kw').value.trim();
  const mode = $('mode').value;

  // Ask for access to this site only, and only when a text alert is set.
  // Called synchronously inside the click so Chrome treats it as a user gesture.
  if (kw && origin) chrome.permissions.request({ origins: [origin + '/*'] }).catch(() => {});

  send({ type: 'start', tabId, intervalSec: val * unit, keyword: kw, mode });
  if (origin) {
    chrome.storage.local.get('sites').then(({ sites = {} }) => {
      sites[origin] = { val, unit, kw, mode };
      chrome.storage.local.set({ sites });
    });
  }
  running = true; info = kw ? { keyword: kw, mode } : null; render();
};
