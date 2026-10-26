// Plays Drip's short sound effects. Runs in an offscreen document so sounds
// work even when the web page hasn't been clicked yet (page autoplay rules).
const NOTES = {
  hello: [520, 780],
  done: [660, 880, 1175],
  snooze: [520, 390],
  boop: [880]
};
let ctx = null;

function play(kind) {
  const notes = NOTES[kind];
  if (!notes) return;
  ctx = ctx || new AudioContext();
  const t0 = ctx.currentTime + 0.03;
  notes.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = t0 + i * 0.13;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f * 0.7, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'drip-offscreen:play') play(msg.kind);
  return false;
});
