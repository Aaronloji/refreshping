// RefreshPing - background service worker (MV3).
importScripts('config.js');
const CFG = self.RP_CONFIG;

// ---------- per-tab state (chrome.storage.session) ----------
// { [tabId]: { intervalSec, nextAt, keyword?, mode?, jitterPct?, hours?: {from:'HH:MM', to:'HH:MM'}, sound? } }
const KEY = 'tabs';
async function getAll() { return (await chrome.storage.session.get(KEY))[KEY] || {}; }
async function setAll(v) { await chrome.storage.session.set({ [KEY]: v }); }
// All read-modify-write of the tab state goes through this queue, so the 1s tick,
// start/stop and alerts never overwrite each other's changes.
let lock = Promise.resolve();
function withState(fn) {
  const p = lock.then(async () => { const all = await getAll(); const r = await fn(all); await setAll(all); return r; });
  lock = p.catch(() => {});
  return p;
}

// ---------- license (chrome.storage.local) ----------
async function getLicense() { return (await chrome.storage.local.get('license')).license || null; }
async function isPro() { const l = await getLicense(); return !!(l && l.valid); }

async function lsPost(path, params) {
  const r = await fetch(CFG.API + '/' + path, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params)
  });
  return r.json();
}

function idsMatch(meta) {
  if (!meta) return false;
  if (CFG.STORE_ID && meta.store_id !== CFG.STORE_ID) return false;
  if (CFG.PRODUCT_ID && meta.product_id !== CFG.PRODUCT_ID) return false;
  return true;
}

async function activate(key) {
  key = (key || '').trim();
  if (!key) return { ok: false, error: 'Enter your license key.' };
  let res;
  try { res = await lsPost('activate', { license_key: key, instance_name: 'RefreshPing ' + new Date().toISOString().slice(0, 10) }); }
  catch (e) { return { ok: false, error: 'No connection. Try again.' }; }
  if (!res.activated) return { ok: false, error: res.error || 'Invalid license key.' };
  if (!idsMatch(res.meta)) {
    try { await lsPost('deactivate', { license_key: key, instance_id: res.instance.id }); } catch (e) {}
    return { ok: false, error: 'This key is not for RefreshPing Pro.' };
  }
  await chrome.storage.local.set({ license: { key, instanceId: res.instance.id, valid: true, checkedAt: Date.now() } });
  return { ok: true };
}

async function deactivate() {
  const l = await getLicense();
  if (l) { try { await lsPost('deactivate', { license_key: l.key, instance_id: l.instanceId }); } catch (e) {} }
  await chrome.storage.local.remove('license');
  return { ok: true };
}

// Re-check the key every REVALIDATE_DAYS. Network errors keep Pro on (no punishment for being offline).
async function revalidate(force) {
  const l = await getLicense();
  if (!l) return;
  if (!force && Date.now() - l.checkedAt < CFG.REVALIDATE_DAYS * 864e5) return;
  let res;
  try { res = await lsPost('validate', { license_key: l.key, instance_id: l.instanceId }); }
  catch (e) { return; }
  if (res.valid && idsMatch(res.meta)) { l.valid = true; l.checkedAt = Date.now(); await chrome.storage.local.set({ license: l }); }
  else if (res.valid === false) await chrome.storage.local.remove('license');
}

// ---------- refresh logic ----------
function nextDelay(t) {
  let s = t.intervalSec;
  if (t.jitterPct) s = s * (1 + (Math.random() * 2 - 1) * t.jitterPct / 100);
  return Math.max(1, s) * 1000;
}

function inHours(h, d = new Date()) {
  if (!h || !h.from || !h.to) return true;
  const m = d.getHours() * 60 + d.getMinutes();
  const p = s => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };
  const f = p(h.from), to = p(h.to);
  return f <= to ? (m >= f && m < to) : (m >= f || m < to); // window may cross midnight
}

async function start(tabId, opts) {
  const pro = await isPro();
  const res = await withState(all => {
    const t = { intervalSec: Math.max(1, Number(opts.intervalSec) || 30) };
    if (opts.keyword) {
      const others = Object.entries(all).filter(([id, v]) => Number(id) !== tabId && v.keyword).length;
      if (!pro && others >= 1) return { ok: false, error: 'Free version watches text on 1 tab at a time. Get Pro for unlimited.' };
      t.keyword = opts.keyword; t.mode = opts.mode === 'disappears' ? 'disappears' : 'appears';
    }
    if (pro) {
      if (opts.jitterPct) t.jitterPct = Math.min(90, Math.max(0, Number(opts.jitterPct)));
      if (opts.hours && opts.hours.from && opts.hours.to) t.hours = opts.hours;
      if (opts.sound) t.sound = true;
    }
    t.nextAt = Date.now() + nextDelay(t);
    all[tabId] = t;
    return { ok: true };
  });
  if (!res.ok) return res;
  await chrome.alarms.create('wake', { periodInMinutes: 0.5 });
  tick();
  return { ok: true };
}

async function stop(tabId) {
  await withState(all => { delete all[tabId]; });
  try { await chrome.action.setBadgeText({ tabId, text: '' }); } catch (e) {}
}

function fmt(s) {
  if (s >= 3600) return Math.floor(s / 3600) + 'h';
  if (s >= 60) return Math.floor(s / 60) + 'm';
  return String(s);
}

let timer = null;
async function tick() {
  const empty = await withState(async all => {
    const ids = Object.keys(all);
    if (!ids.length) return true;
    const now = Date.now();
    for (const id of ids) {
      const t = all[id];
      const tabId = Number(id);
      const active = inHours(t.hours);
      if (now >= t.nextAt) {
        if (active) {
          try { await chrome.tabs.reload(tabId); }
          catch (e) { delete all[id]; continue; } // tab closed
        }
        t.nextAt = now + nextDelay(t);
      }
      const left = Math.max(0, Math.ceil((t.nextAt - now) / 1000));
      try {
        await chrome.action.setBadgeText({ tabId, text: active ? fmt(left) : 'off' });
        await chrome.action.setBadgeBackgroundColor({ tabId, color: active ? '#1a73e8' : '#80868b' });
      } catch (e) { delete all[id]; }
    }
    return false;
  });
  if (empty) { clearInterval(timer); timer = null; chrome.alarms.clear('wake'); return; }
  if (!timer) timer = setInterval(tick, 1000);
}

// ---------- text alert ----------
function pageHasText(kw) {
  const body = document.body ? document.body.innerText : '';
  return body.toLowerCase().includes(kw.toLowerCase());
}

async function playSound() {
  try {
    if (!(await chrome.offscreen.hasDocument())) {
      await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['AUDIO_PLAYBACK'], justification: 'Play the alert sound' });
    }
    await chrome.runtime.sendMessage({ type: 'beep' });
  } catch (e) {}
}

async function checkText(tabId) {
  const t = (await getAll())[tabId];
  if (!t || !t.keyword) return;
  let found;
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: pageHasText, args: [t.keyword] });
    found = res && res.result;
  } catch (e) { return; } // no access to this page (chrome://, store, permission denied)
  const hit = t.mode === 'disappears' ? !found : found;
  if (!hit) return;
  await stop(tabId); // stop refreshing so the page stays as it is
  await chrome.action.setBadgeText({ tabId, text: '!' });
  await chrome.action.setBadgeBackgroundColor({ tabId, color: '#d93025' });
  const verb = t.mode === 'disappears' ? 'disappeared' : 'appeared';
  try {
    await chrome.notifications.create('rp-' + tabId, {
      type: 'basic', iconUrl: 'icons/icon128.png', priority: 2, requireInteraction: true,
      title: 'RefreshPing: text ' + verb,
      message: '"' + t.keyword + '" ' + verb + ' on the page. Refresh stopped.'
    });
  } catch (e) {}
  if (t.sound) playSound();
}

chrome.tabs.onUpdated.addListener((tabId, info) => { if (info.status === 'complete') checkText(tabId); });

chrome.notifications.onClicked.addListener(async id => {
  if (!id.startsWith('rp-')) return;
  const tabId = Number(id.slice(3));
  try {
    const tab = await chrome.tabs.update(tabId, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  } catch (e) {}
  chrome.notifications.clear(id);
});

// ---------- lifecycle ----------
chrome.alarms.onAlarm.addListener(a => {
  if (a.name === 'wake') tick();
  if (a.name === 'license') revalidate(false);
});
chrome.runtime.onStartup.addListener(() => { tick(); revalidate(false); });
chrome.runtime.onInstalled.addListener(() => chrome.alarms.create('license', { periodInMinutes: 24 * 60 }));
chrome.tabs.onRemoved.addListener(stop);

chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (msg.type === 'beep') return; // handled by offscreen document
  (async () => {
    switch (msg.type) {
      case 'start': return reply(await start(msg.tabId, msg));
      case 'stop': await stop(msg.tabId); return reply({ ok: true });
      case 'status': return reply({ tab: (await getAll())[msg.tabId] || null, pro: await isPro() });
      case 'activate': return reply(await activate(msg.key));
      case 'deactivate': return reply(await deactivate());
      case 'testSound': await playSound(); return reply({ ok: true });
      default: reply({ ok: false });
    }
  })();
  return true;
});
