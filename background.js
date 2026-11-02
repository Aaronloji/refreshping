// RefreshPing - background (MV3). State per tab lives in chrome.storage.session.
const KEY = 'tabs'; // { [tabId]: { intervalSec, nextAt } }

async function getAll() { return (await chrome.storage.session.get(KEY))[KEY] || {}; }
async function setAll(v) { await chrome.storage.session.set({ [KEY]: v }); }

async function start(tabId, intervalSec) {
  const all = await getAll();
  all[tabId] = { intervalSec, nextAt: Date.now() + intervalSec * 1000 };
  await setAll(all);
  await chrome.alarms.create('wake', { periodInMinutes: 0.5 });
  tick();
}

async function stop(tabId) {
  const all = await getAll();
  delete all[tabId];
  await setAll(all);
  try { await chrome.action.setBadgeText({ tabId, text: '' }); } catch (e) {}
}

function fmt(s) {
  if (s >= 3600) return Math.floor(s / 3600) + 'h';
  if (s >= 60) return Math.floor(s / 60) + 'm';
  return String(s);
}

let timer = null;
async function tick() {
  const all = await getAll();
  const ids = Object.keys(all);
  if (!ids.length) { clearInterval(timer); timer = null; chrome.alarms.clear('wake'); return; }
  const now = Date.now();
  for (const id of ids) {
    const t = all[id];
    const tabId = Number(id);
    if (now >= t.nextAt) {
      try { await chrome.tabs.reload(tabId); }
      catch (e) { delete all[id]; continue; } // tab closed
      t.nextAt = now + t.intervalSec * 1000;
    }
    const left = Math.max(0, Math.ceil((t.nextAt - now) / 1000));
    try {
      await chrome.action.setBadgeText({ tabId, text: fmt(left) });
      await chrome.action.setBadgeBackgroundColor({ tabId, color: '#1a73e8' });
    } catch (e) { delete all[id]; }
  }
  await setAll(all);
  if (!timer) timer = setInterval(tick, 1000);
}

chrome.alarms.onAlarm.addListener(a => { if (a.name === 'wake') tick(); });
chrome.runtime.onStartup.addListener(tick);
chrome.tabs.onRemoved.addListener(stop);

chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  (async () => {
    if (msg.type === 'start') await start(msg.tabId, msg.intervalSec);
    else if (msg.type === 'stop') await stop(msg.tabId);
    else if (msg.type === 'status') {
      const t = (await getAll())[msg.tabId];
      return reply(t || null);
    }
    reply({ ok: true });
  })();
  return true;
});
