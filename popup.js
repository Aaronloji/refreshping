const $ = id => document.getElementById(id);
let tabId, origin, running = false;

const send = m => new Promise(r => chrome.runtime.sendMessage(m, r));

function render() {
  $('toggle').textContent = running ? 'Stop' : 'Start';
  $('status').textContent = running ? 'Running on this tab' : '';
}

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab.id;
  try { origin = new URL(tab.url).origin; } catch (e) { origin = null; }

  // saved setting for this site
  if (origin) {
    const saved = (await chrome.storage.local.get('sites')).sites || {};
    if (saved[origin]) { $('val').value = saved[origin].val; $('unit').value = saved[origin].unit; }
  }
  const st = await send({ type: 'status', tabId });
  if (st) { running = true; const s = st.intervalSec; if (s % 60 === 0) { $('val').value = s / 60; $('unit').value = 60; } else { $('val').value = s; $('unit').value = 1; } }
  render();
})();

$('toggle').onclick = async () => {
  if (running) {
    await send({ type: 'stop', tabId });
    running = false;
  } else {
    const val = Math.max(1, Number($('val').value) || 30);
    const unit = Number($('unit').value);
    if (origin) {
      const sites = (await chrome.storage.local.get('sites')).sites || {};
      sites[origin] = { val, unit };
      await chrome.storage.local.set({ sites });
    }
    await send({ type: 'start', tabId, intervalSec: val * unit });
    running = true;
  }
  render();
};
