// Plays a short 3-beep alert with WebAudio (no audio files needed).
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type !== 'beep') return;
  const ctx = new AudioContext();
  [0, 0.35, 0.7].forEach(at => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
    g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + 0.3);
  });
  setTimeout(() => ctx.close(), 1500);
});
