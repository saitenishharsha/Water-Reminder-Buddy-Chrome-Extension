/*
 * Drip – animated reminder overlay.
 * Injected on demand by the service worker into the active tab only.
 * Everything is rendered inside a Shadow DOM so page styles can't leak in
 * and our styles can't leak out. The DOM is built with createElement
 * (no innerHTML) so it also works on pages that enforce Trusted Types.
 * The options page loads this file directly for previews (cfg.preview = true).
 */
(() => {
  'use strict';
  if (typeof window.__dripShow === 'function') return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SIZES = { small: 112, medium: 150, large: 196 };
  const RATIO = 260 / 220; // character viewBox height / width
  const HOST_TAG = 'drip-water-buddy';

  const LINES = [
    'Sip sip hooray! Time for some water.',
    'Water you waiting for? 😄',
    'Hydration station is now open!',
    'Your brain called. It wants water.',
    'Quick sip break, then back to it!',
    'Stay fresh, stay hydrated!',
    'Gulp gulp time! 💦',
    'Your future self says thank you.',
    'A little water makes everything better.',
    'Psst… your glass misses you.'
  ];
  const TICKLES = [
    'Hehe, that tickles! Now drink! 😆',
    'Boop! Water first, clicking later.',
    'I am 100% water. You should be a bit more!',
    'Wheee! Okay okay, grab your bottle.',
    'Splish splash, take a sip!'
  ];

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ------------------------------------------------------------ DOM helpers

  function h(tag, attrs, ...children) {
    const node = document.createElement(tag);
    setAttrs(node, attrs);
    add(node, children);
    return node;
  }

  function s(tag, attrs, ...children) {
    const node = document.createElementNS(SVG_NS, tag);
    setAttrs(node, attrs);
    add(node, children);
    return node;
  }

  function setAttrs(node, attrs) {
    if (!attrs) return;
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : String(value));
    }
  }

  function add(node, children) {
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      node.append(typeof child === 'string' ? document.createTextNode(child) : child);
    }
  }

  // ------------------------------------------------------------ character

  let uidCounter = 0;

  function buildCharacter() {
    const uid = `drip${Date.now().toString(36)}${uidCounter++}`;
    const bodyGrad = `${uid}-body`;
    const waterGrad = `${uid}-water`;
    const clip = `${uid}-clip`;
    const BODY = 'M110 18 C 128 52, 188 102, 188 160 A 78 78 0 0 1 32 160 C 32 102, 92 52, 110 18 Z';

    return s('svg', { class: 'svg', viewBox: '0 0 220 260', 'aria-hidden': 'true', focusable: 'false' },
      s('defs', null,
        s('radialGradient', { id: bodyGrad, cx: '38%', cy: '40%', r: '72%' },
          s('stop', { offset: '0%', 'stop-color': '#d4f4ff' }),
          s('stop', { offset: '42%', 'stop-color': '#66c6ff' }),
          s('stop', { offset: '100%', 'stop-color': '#1d7fdc' })),
        s('linearGradient', { id: waterGrad, x1: '0', y1: '0', x2: '0', y2: '1' },
          s('stop', { offset: '0%', 'stop-color': '#8ad9ff' }),
          s('stop', { offset: '100%', 'stop-color': '#2a95ee' })),
        s('clipPath', { id: clip },
          s('rect', { x: 189, y: 96, width: 24, height: 61, rx: 6 }))),

      s('ellipse', { class: 'd-shadow', cx: 110, cy: 251, rx: 58, ry: 7 }),

      s('g', { class: 'd-feet' },
        s('ellipse', { class: 'd-foot d-foot-l', cx: 84, cy: 238, rx: 19, ry: 11 }),
        s('ellipse', { class: 'd-foot d-foot-r', cx: 136, cy: 238, rx: 19, ry: 11 })),

      s('g', { class: 'd-arm-l' },
        s('path', { class: 'd-limb', d: 'M42 172 Q 22 170 16 146' }),
        s('circle', { class: 'd-hand', cx: 16, cy: 144, r: 9 })),

      s('path', { class: 'd-body', d: BODY, fill: `url(#${bodyGrad})` }),
      s('ellipse', { class: 'd-shine', cx: 68, cy: 120, rx: 10, ry: 23, transform: 'rotate(26 68 120)' }),
      s('circle', { class: 'd-shine', cx: 86, cy: 82, r: 6 }),

      s('g', { class: 'd-face' },
        s('g', { class: 'd-eyes-open' },
          s('ellipse', { class: 'd-eye', cx: 84, cy: 148, rx: 17, ry: 21 }),
          s('ellipse', { class: 'd-eye', cx: 136, cy: 148, rx: 17, ry: 21 }),
          s('g', { class: 'd-pupils' },
            s('ellipse', { class: 'd-pupil', cx: 88, cy: 152, rx: 9.5, ry: 12 }),
            s('ellipse', { class: 'd-pupil', cx: 132, cy: 152, rx: 9.5, ry: 12 }),
            s('circle', { class: 'd-sparkle', cx: 92, cy: 146, r: 4 }),
            s('circle', { class: 'd-sparkle', cx: 136, cy: 146, r: 4 }),
            s('circle', { class: 'd-sparkle', cx: 85, cy: 158, r: 2 }),
            s('circle', { class: 'd-sparkle', cx: 129, cy: 158, r: 2 }))),
        s('g', { class: 'd-eyes-happy' },
          s('path', { class: 'd-line', d: 'M70 154 Q 84 136 98 154' }),
          s('path', { class: 'd-line', d: 'M122 154 Q 136 136 150 154' })),
        s('g', { class: 'd-eyes-sleepy' },
          s('path', { class: 'd-line', d: 'M70 150 Q 84 160 98 150' }),
          s('path', { class: 'd-line', d: 'M122 150 Q 136 160 150 150' })),
        s('ellipse', { class: 'd-blush', cx: 63, cy: 178, rx: 12, ry: 7 }),
        s('ellipse', { class: 'd-blush', cx: 157, cy: 178, rx: 12, ry: 7 }),
        s('path', { class: 'd-line d-mouth-smile', d: 'M97 180 Q 110 195 123 180' }),
        s('g', { class: 'd-mouth-open' },
          s('path', { class: 'd-mouth-hole', d: 'M97 179 Q 110 206 123 179 Z' }),
          s('ellipse', { class: 'd-tongue', cx: 110, cy: 192, rx: 7, ry: 4 }))),

      s('g', { class: 'd-hold' },
        s('path', { class: 'd-limb', d: 'M178 172 Q 196 172 200 160' }),
        s('g', { class: 'd-bottle' },
          s('rect', { class: 'd-glass', x: 186, y: 92, width: 30, height: 68, rx: 9 }),
          s('g', { 'clip-path': `url(#${clip})` },
            s('rect', { class: 'd-water', x: 189, y: 110, width: 24, height: 47, fill: `url(#${waterGrad})` }),
            s('ellipse', { class: 'd-bubble-dot', cx: 196, cy: 140, rx: 2.4, ry: 2.4 }),
            s('ellipse', { class: 'd-bubble-dot', cx: 205, cy: 128, rx: 1.8, ry: 1.8 })),
          s('rect', { class: 'd-label', x: 186, y: 122, width: 30, height: 12 }),
          s('rect', { class: 'd-glass-shine', x: 191, y: 98, width: 4, height: 54, rx: 2 }),
          s('rect', { class: 'd-neck', x: 195, y: 82, width: 12, height: 12, rx: 2 }),
          s('rect', { class: 'd-cap', x: 192, y: 72, width: 18, height: 12, rx: 4 })),
        s('circle', { class: 'd-hand', cx: 200, cy: 158, r: 9 }))
    );
  }

  // ------------------------------------------------------------ styles

  const CSS = `
:host { all: initial !important; }
* { box-sizing: border-box; }
.root {
  position: fixed; inset: 0; pointer-events: none; overflow: hidden;
  font-family: ui-rounded, "SF Pro Rounded", "Nunito", "Quicksand", "Segoe UI", "Ubuntu", system-ui, sans-serif;
  color: #10233f; -webkit-font-smoothing: antialiased;
}
.stage { position: absolute; inset: 0; pointer-events: none; }
.mover { position: absolute; width: var(--w); height: var(--h); pointer-events: none; will-change: transform; }
.tilt { position: absolute; inset: 0; }
.char {
  position: absolute; inset: 0; pointer-events: auto; cursor: pointer;
  transform-origin: 50% 92%;
  animation: drip-bob 1.9s ease-in-out infinite;
}
.svg { width: 100%; height: 100%; display: block; overflow: visible;
  filter: drop-shadow(0 8px 12px rgba(16, 35, 63, .28)); }
.flip .svg { transform: scaleX(-1); }

/* ---------- character parts ---------- */
.d-body { stroke: #1667b8; stroke-width: 4; stroke-linejoin: round; }
.d-shine { fill: #fff; opacity: .55; }
.d-eye { fill: #fff; stroke: #1667b8; stroke-width: 3; }
.d-pupil { fill: #142544; }
.d-sparkle { fill: #fff; }
.d-line { fill: none; stroke: #142544; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
.d-blush { fill: #ff8fb3; opacity: .65; }
.d-mouth-hole { fill: #7c2438; stroke: #142544; stroke-width: 4; stroke-linejoin: round; }
.d-tongue { fill: #ff8fa3; }
.d-limb { fill: none; stroke: #2c8be4; stroke-width: 13; stroke-linecap: round; }
.d-hand { fill: #3b98ea; stroke: #1667b8; stroke-width: 3; }
.d-foot { fill: #2c8be4; stroke: #1667b8; stroke-width: 3; }
.d-shadow { fill: rgba(16, 35, 63, .18); opacity: 0; }
.d-glass { fill: rgba(225, 246, 255, .9); stroke: #4f86b3; stroke-width: 3; }
.d-glass-shine { fill: #fff; opacity: .7; }
.d-water { transform-box: view-box; transform-origin: 201px 157px; }
.d-bubble-dot { fill: #fff; opacity: .8; }
.d-label { fill: #fff; opacity: .75; }
.d-neck { fill: #d9eefc; stroke: #4f86b3; stroke-width: 2.5; }
.d-cap { fill: #ff6b8b; stroke: #c94464; stroke-width: 2.5; }

.d-eyes-happy, .d-eyes-sleepy, .d-mouth-open { opacity: 0; }
.d-eyes-open { transform-box: view-box; transform-origin: 110px 150px; animation: drip-blink 4.2s infinite; }
.d-pupils { animation: drip-look 7s ease-in-out infinite; }
.d-arm-l { transform-box: view-box; transform-origin: 40px 172px; }
.d-hold, .d-bottle { transform-box: view-box; }
.d-bottle { transform-origin: 201px 116px; transition: transform .45s cubic-bezier(.34,1.4,.64,1); }
.d-foot { transform-box: fill-box; transform-origin: 50% 50%; }
.d-bubble-dot { animation: drip-fizz 2.4s ease-in-out infinite; }
.d-bubble-dot + .d-bubble-dot { animation-delay: -1.1s; }.waving .d-arm-l { animation: drip-wave .55s ease-in-out infinite alternate; }
.wiggle .d-bottle { animation: drip-shake 1.6s ease-in-out infinite; }

/* drinking */
.drinking .d-bottle { transform: translate(-47px, 49px) rotate(-115deg); animation: none; }
.drinking .d-water { animation: drip-drain 1.2s .35s ease-in forwards; }
.drinking .d-eyes-open, .happy .d-eyes-open, .giggle .d-eyes-open, .sleepy .d-eyes-open { opacity: 0; animation: none; }
.drinking .d-eyes-happy, .happy .d-eyes-happy, .giggle .d-eyes-happy { opacity: 1; }
.drinking .d-mouth-smile, .happy .d-mouth-smile, .giggle .d-mouth-smile { opacity: 0; }
.drinking .d-mouth-open, .happy .d-mouth-open, .giggle .d-mouth-open { opacity: 1; }
.drinking .char { animation: drip-gulp .38s ease-in-out infinite; }
.happy .char { animation: drip-jump .6s cubic-bezier(.3,.7,.4,1) 2; }
.happy .d-arm-l { animation: drip-wave .3s ease-in-out infinite alternate; }
.happy .d-water { transform: scaleY(.15); }
.giggle .char { animation: drip-jump .5s cubic-bezier(.3,.7,.4,1) 1; }
.sleepy .d-eyes-sleepy { opacity: 1; }
.sleepy .char { animation: drip-sway 1.6s ease-in-out infinite; }

/* ---------- peek mode ---------- */
.peek .mover { animation: drip-peek-in .95s cubic-bezier(.34,1.56,.64,1) both; }
.peek.leaving .mover { animation: drip-peek-out .6s cubic-bezier(.55,0,.75,.3) forwards; }
.peek.br .mover { right: 22px; bottom: calc(var(--h) * -0.1); --fx: 140%; --fy: 75%; }
.peek.bl .mover { left: 22px;  bottom: calc(var(--h) * -0.1); --fx: -140%; --fy: 75%; }
.peek.tr .mover { right: 22px; top: calc(var(--h) * -0.1); --fx: 140%; --fy: -75%; }
.peek.tl .mover { left: 22px;  top: calc(var(--h) * -0.1); --fx: -140%; --fy: -75%; }
.peek.br .tilt { transform: rotate(-16deg); }
.peek.bl .tilt { transform: rotate(16deg); }
.peek.tr .tilt { transform: rotate(196deg); }
.peek.tl .tilt { transform: rotate(164deg); }

/* ---------- walk mode ---------- */
.walk .mover { left: 0; bottom: 6px; }
.walk .d-shadow { opacity: 1; }
.walk.is-walking .char { animation: drip-waddle .52s ease-in-out infinite; }
.walk.is-walking .d-foot-l { animation: drip-step .52s ease-in-out infinite; }
.walk.is-walking .d-foot-r { animation: drip-step .52s ease-in-out -.26s infinite; }
.walk.is-walking .d-pupils { animation: none; transform: translate(4px, 0); }
.walk.running .char { animation-duration: .3s; }
.walk.running .d-foot-l, .walk.running .d-foot-r { animation-duration: .3s; }

/* ---------- speech bubble ---------- */
.bubble {
  position: absolute; width: 284px; max-width: calc(100vw - 32px);
  pointer-events: auto; cursor: default;
  background: #ffffff; border-radius: 22px; padding: 16px 16px 14px;
  border: 3px solid #1667b8;
  box-shadow: 0 14px 34px rgba(16, 35, 63, .28), 0 3px 0 #1667b8;
  animation: drip-pop .5s .55s cubic-bezier(.34,1.56,.64,1) both;
  text-align: left; line-height: 1.3;
}
.bubble::after {
  content: ""; position: absolute; width: 18px; height: 18px; background: #fff;
  border: 3px solid #1667b8; border-top: 0; border-left: 0;
}
.peek.br .bubble { right: calc(var(--w) * 0.8); bottom: calc(var(--h) * 0.58); transform-origin: 100% 100%; }
.peek.bl .bubble { left: calc(var(--w) * 0.8);  bottom: calc(var(--h) * 0.58); transform-origin: 0% 100%; }
.peek.tr .bubble { right: calc(var(--w) * 0.8); top: calc(var(--h) * 0.58); transform-origin: 100% 0%; }
.peek.tl .bubble { left: calc(var(--w) * 0.8);  top: calc(var(--h) * 0.58); transform-origin: 0% 0%; }
.peek.br .bubble::after { right: -11px; bottom: 26px; transform: rotate(-45deg); }
.peek.bl .bubble::after { left: -11px;  bottom: 26px; transform: rotate(135deg); }
.peek.tr .bubble::after { right: -11px; top: 26px; transform: rotate(-45deg); }
.peek.tl .bubble::after { left: -11px;  top: 26px; transform: rotate(135deg); }
.walk .bubble { bottom: calc(var(--h) + 8px); left: 0; transform-origin: var(--tail-o, 50%) 100%; }
.walk .bubble::after { left: var(--tail, calc(50% - 9px)); bottom: -11px; transform: rotate(45deg); }
.peek.leaving .bubble, .bubble.hide { animation: drip-pop-out .25s ease-in forwards; }

.close {
  position: absolute; top: 8px; right: 8px; width: 26px; height: 26px; border-radius: 50%;
  border: 0; background: #eef6fd; color: #4a6585; cursor: pointer; padding: 0;
  font: 700 16px/26px system-ui, sans-serif; text-align: center;
}
.close:hover { background: #dcecfa; color: #10233f; }
.title {
  margin: 0 30px 2px 0; font-size: 24px; font-weight: 900; letter-spacing: -.3px;
  color: #1667b8;
}
.title .splash { display: inline-block; animation: drip-tada 1.4s .9s ease-in-out 2; }
.sub { margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #3b5576; min-height: 18px; }
.progress { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 12.5px; font-weight: 700; color: #4a6585; }
.pips { display: flex; gap: 3px; flex-wrap: wrap; }
.pip { width: 11px; height: 11px; border-radius: 0 50% 50% 50%; transform: rotate(45deg);
  background: #dbe9f6; border: 1.5px solid #b6cde3; }
.pip.full { background: #39a3f5; border-color: #1667b8; }
.pip.pop { animation: drip-pip .5s cubic-bezier(.34,1.56,.64,1); }
.actions { display: flex; gap: 8px; }
.btn {
  flex: 1 1 auto; border-radius: 14px; padding: 9px 10px; cursor: pointer;
  font: 800 13.5px/1.1 ui-rounded, "SF Pro Rounded", "Nunito", "Segoe UI", "Ubuntu", system-ui, sans-serif;
  transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
}
.btn:active { transform: translateY(2px); }
.btn.primary { border: 0; color: #fff; background: linear-gradient(180deg, #3fb0ff, #1d7fdc);
  box-shadow: 0 3px 0 #135ea8; }
.btn.primary:hover { background: linear-gradient(180deg, #55baff, #2389e6); }
.btn.primary:active { box-shadow: 0 1px 0 #135ea8; }
.btn.ghost { border: 2px solid #c9dcef; background: #fff; color: #33507a; }
.btn.ghost:hover { background: #f2f8fe; }
.btn:disabled { opacity: .55; cursor: default; }
.resolved .actions { display: none; }
.resolved .progress { margin-bottom: 2px; }
.btn:focus-visible, .close:focus-visible { outline: 3px solid #ffb84d; outline-offset: 2px; }

/* ---------- particles ---------- */
.fx { position: absolute; left: 0; top: 0; pointer-events: none; }
.drop { width: 12px; height: 12px; border-radius: 0 50% 50% 50%; background: #48aef7;
  border: 1.5px solid #1667b8; animation: drip-fly 1.1s ease-out forwards; }
.confetti { width: 9px; height: 13px; border-radius: 2px; animation: drip-fly 1.5s ease-out forwards; }
.zz { font: 900 20px/1 ui-rounded, "Nunito", system-ui, sans-serif; color: #5b7fb0; animation: drip-zz 1.6s ease-out forwards; }

/* ---------- keyframes ---------- */
@keyframes drip-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes drip-blink { 0%,90%,100% { transform: scaleY(1); } 94% { transform: scaleY(.08); } }
@keyframes drip-look { 0%,30%,100% { transform: translate(0,0); } 40%,55% { transform: translate(-4px,1px); } 65%,85% { transform: translate(4px,-1px); } }
@keyframes drip-wave { from { transform: rotate(-18deg); } to { transform: rotate(26deg); } }
@keyframes drip-shake { 0%,70%,100% { transform: rotate(0); } 76% { transform: rotate(-9deg); } 84% { transform: rotate(8deg); } 92% { transform: rotate(-4deg); } }
@keyframes drip-drain { to { transform: scaleY(.15); } }
@keyframes drip-gulp { 0%,100% { transform: scale(1, 1); } 50% { transform: scale(1.03, .97); } }
@keyframes drip-jump { 0%,100% { transform: translateY(0) scale(1,1); } 15% { transform: translateY(0) scale(1.08,.9); }
  45% { transform: translateY(-34px) scale(.95,1.06); } 75% { transform: translateY(0) scale(1.06,.94); } }
@keyframes drip-sway { 0%,100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
@keyframes drip-waddle { 0%,100% { transform: rotate(-4deg) translateY(0); } 25% { transform: rotate(0) translateY(-5px); }
  50% { transform: rotate(4deg) translateY(0); } 75% { transform: rotate(0) translateY(-5px); } }
@keyframes drip-step { 0%,100% { transform: translate(0,0); } 25% { transform: translate(5px,-8px); } 50% { transform: translate(0,0); } }
@keyframes drip-fizz { 0% { transform: translateY(0); opacity: 0; } 30% { opacity: .9; } 100% { transform: translateY(-16px); opacity: 0; } }
@keyframes drip-peek-in { from { transform: translate(var(--fx), var(--fy)); } to { transform: translate(0, 0); } }
@keyframes drip-peek-out { from { transform: translate(0, 0); } to { transform: translate(var(--fx), var(--fy)); } }
@keyframes drip-pop { from { opacity: 0; scale: .4; } to { opacity: 1; scale: 1; } }
@keyframes drip-pop-out { from { opacity: 1; scale: 1; } to { opacity: 0; scale: .6; } }
@keyframes drip-tada { 0%,100% { transform: rotate(0) scale(1); } 20% { transform: rotate(-14deg) scale(1.2); } 40% { transform: rotate(12deg) scale(1.2); } 60% { transform: rotate(-8deg); } }
@keyframes drip-pip { 0% { transform: rotate(45deg) scale(.3); } 100% { transform: rotate(45deg) scale(1); } }
@keyframes drip-fly { 0% { transform: translate(0,0) rotate(45deg) scale(.6); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot, 45deg)) scale(1); opacity: 0; } }
@keyframes drip-zz { 0% { transform: translate(0,0) scale(.6); opacity: 0; } 20% { opacity: 1; }
  100% { transform: translate(var(--dx), -70px) scale(1.3); opacity: 0; } }
@keyframes drip-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes drip-fade-out { from { opacity: 1; } to { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .char, .d-eyes-open, .d-pupils, .d-arm-l, .d-bottle, .d-foot, .d-bubble-dot, .title .splash, .pip { animation: none !important; }
  .peek .mover { animation: drip-fade-in .3s both !important; }
  .peek.leaving .mover { animation: drip-fade-out .3s forwards !important; }
  .bubble { animation: drip-fade-in .3s both !important; }
}
`;

  let sheet = null;
  function applyStyles(shadow) {
    try {
      if (!sheet) {
        sheet = new CSSStyleSheet();
        sheet.replaceSync(CSS);
      }
      shadow.adoptedStyleSheets = [sheet];
    } catch {
      const style = document.createElement('style');
      style.textContent = CSS;
      shadow.append(style);
    }
  }

  // ------------------------------------------------------------ sound

  /** In the real reminder the service worker plays sounds (works without a page click). */
  function makeSoundPlayer(cfg) {
    return (kind) => {
      if (!cfg.sound) return;
      if (cfg.preview) { playLocalSound(kind); return; }
      try { chrome.runtime.sendMessage({ type: 'drip:sound', kind }, () => void chrome.runtime.lastError); } catch { /* ignore */ }
    };
  }

  function playLocalSound(kind) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const notes = kind === 'done' ? [660, 880, 1175] : kind === 'snooze' ? [520, 390] : kind === 'boop' ? [880] : [520, 780];
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
      setTimeout(() => ctx.close().catch(() => {}), 1500);
    } catch {
      /* audio is optional */
    }
  }

  // ------------------------------------------------------------ messaging

  function report(cfg, action) {
    if (cfg.preview) {
      if (action === 'done') return Promise.resolve({ count: cfg.count + 1, goal: cfg.goal });
      return Promise.resolve({ snoozeMin: cfg.snoozeMin });
    }
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'drip:action', action }, (res) => {
          void chrome.runtime.lastError; // extension may have been reloaded
          resolve(res || {});
        });
      } catch {
        resolve({});
      }
    });
  }

  // ------------------------------------------------------------ reminder

  let current = null;

  function createReminder(rawCfg) {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cfg = {
      mode: rawCfg.mode === 'walk' ? 'walk' : 'peek',
      corner: ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(rawCfg.corner) ? rawCfg.corner : 'bottom-right',
      size: SIZES[rawCfg.size] ? rawCfg.size : 'medium',
      sound: rawCfg.sound !== false,
      autoHideSec: Math.max(5, Number(rawCfg.autoHideSec) || 25),
      snoozeMin: Math.max(1, Number(rawCfg.snoozeMin) || 10),
      count: Math.max(0, Number(rawCfg.count) || 0),
      goal: Math.max(1, Number(rawCfg.goal) || 8),
      preview: !!rawCfg.preview
    };
    if (reduceMotion) cfg.mode = 'peek';
    const playSound = makeSoundPlayer(cfg);

    const W = SIZES[cfg.size];
    const H = Math.round(W * RATIO);
    const cornerCode = { 'top-left': 'tl', 'top-right': 'tr', 'bottom-left': 'bl', 'bottom-right': 'br' }[cfg.corner];
    const flip = cfg.mode === 'peek' && (cornerCode === 'br' || cornerCode === 'tl');

    // ---- host + shadow
    const host = document.createElement(HOST_TAG);
    const hostStyle = {
      position: 'fixed', inset: '0', width: '100vw', height: '100vh', margin: '0', padding: '0',
      border: '0', background: 'transparent', 'pointer-events': 'none', 'z-index': '2147483647',
      display: 'block', contain: 'layout style', opacity: '1', visibility: 'visible', transform: 'none', filter: 'none'
    };
    for (const [k, v] of Object.entries(hostStyle)) host.style.setProperty(k, v, 'important');
    const shadow = host.attachShadow({ mode: 'open' });
    applyStyles(shadow);

    // ---- bubble
    const subEl = h('p', { class: 'sub' }, pick(LINES));
    const titleEl = h('p', { class: 'title' }, 'Drink Water! ', h('span', { class: 'splash' }, '💧'));
    const progressText = h('span', null, '');
    const pipsEl = h('span', { class: 'pips', 'aria-hidden': 'true' });
    const doneBtn = h('button', { class: 'btn primary', type: 'button' }, 'I drank it! 💧');
    const snoozeBtn = h('button', { class: 'btn ghost', type: 'button' }, `Snooze ${cfg.snoozeMin} min`);
    const closeBtn = h('button', { class: 'close', type: 'button', 'aria-label': 'Dismiss reminder', title: 'Dismiss' }, '×');
    const bubble = h('div', { class: 'bubble', role: 'dialog', 'aria-live': 'polite', 'aria-label': 'Drink water reminder' },
      closeBtn, titleEl, subEl,
      h('div', { class: 'progress' }, pipsEl, progressText),
      h('div', { class: 'actions' }, doneBtn, snoozeBtn));

    function renderProgress(count, goal, popIndex = -1) {
      const shown = Math.min(goal, 12);
      pipsEl.replaceChildren();
      const filled = goal > 12 ? Math.round((Math.min(count, goal) / goal) * 12) : Math.min(count, goal);
      for (let i = 0; i < shown; i++) {
        const cls = 'pip' + (i < filled ? ' full' : '') + (i === popIndex ? ' pop' : '');
        pipsEl.append(h('span', { class: cls }));
      }
      progressText.textContent = `${count} / ${goal} today`;
    }
    renderProgress(cfg.count, cfg.goal);

    // ---- character
    const charEl = h('div', { class: 'char', title: 'Boop me!' }, buildCharacter());
    const tilt = h('div', { class: 'tilt' + (flip ? ' flip' : '') }, charEl);
    const mover = h('div', { class: 'mover' }, tilt, bubble);
    const stage = h('div', { class: `stage ${cfg.mode} ${cornerCode} wiggle` }, mover);
    const fxLayer = h('div', { class: 'fx' });
    const root = h('div', { class: 'root' }, stage, fxLayer);
    root.style.setProperty('--w', `${W}px`);
    root.style.setProperty('--h', `${H}px`);
    shadow.append(root);

    const parent = document.fullscreenElement || document.documentElement || document.body;
    parent.append(host);

    // ---- lifecycle state
    let alive = true;
    let busy = false;      // an action animation is running
    let finished = false;  // an outcome was reported
    let hover = 0;
    let autoHideTimer = 0;
    let raf = 0;
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms); timers.add(t); return t; };

    function setHover(delta) {
      hover = Math.max(0, hover + delta);
      if (cfg.mode === 'peek') {
        if (hover > 0) clearTimeout(autoHideTimer);
        else if (!busy && !finished) armAutoHide(6000);
      }
    }
    for (const el of [charEl, bubble]) {
      el.addEventListener('pointerenter', () => setHover(1));
      el.addEventListener('pointerleave', () => setHover(-1));
    }

    function armAutoHide(ms) {
      clearTimeout(autoHideTimer);
      autoHideTimer = later(() => {
        if (hover > 0 || busy || finished) return;
        finish('ignored');
      }, ms);
    }

    function destroy() {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(raf);
      for (const t of timers) clearTimeout(t);
      timers.clear();
      host.remove();
      if (current && current.destroy === destroy) current = null;
    }

    /** Animate out and remove. Reports `reason` first if given. */
    function finish(reason) {
      if (finished && reason) return;
      if (reason) { finished = true; report(cfg, reason); }
      clearTimeout(autoHideTimer);
      if (cfg.mode === 'peek') {
        stage.classList.add('leaving');
        later(destroy, 650);
      } else {
        bubble.classList.add('hide');
        walker.runOff();
      }
    }

    // ---- particles
    function burst(kind, count) {
      const rect = charEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.35;
      const colors = ['#ff6b8b', '#ffb84d', '#48aef7', '#5ad19a', '#a78bfa'];
      for (let i = 0; i < count; i++) {
        const p = h('span', { class: `fx ${kind}` });
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
        const dist = 60 + Math.random() * 70;
        p.style.left = `${cx}px`;
        p.style.top = `${cy}px`;
        p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
        p.style.setProperty('--dy', `${Math.sin(angle) * dist - 40}px`);
        p.style.setProperty('--rot', `${Math.round(Math.random() * 540)}deg`);
        if (kind === 'confetti') p.style.background = colors[i % colors.length];
        if (kind === 'zz') {
          p.textContent = 'z';
          p.style.setProperty('--dx', `${(i - 1) * 18}px`);
          p.style.animationDelay = `${i * 0.35}s`;
          p.style.fontSize = `${16 + i * 5}px`;
          p.style.top = `${rect.top + rect.height * 0.15}px`;
        }
        fxLayer.append(p);
        later(() => p.remove(), 2200);
      }
    }

    // ---- actions
    async function onDone() {
      if (busy || finished) return;
      busy = true;
      finished = true;
      clearTimeout(autoHideTimer);
      doneBtn.disabled = snoozeBtn.disabled = true;
      bubble.classList.add('resolved');
      stage.classList.remove('wiggle');
      stage.classList.add('drinking');
      playSound('done');
      subEl.textContent = 'Gulp… gulp… gulp…';
      const resPromise = report(cfg, 'done');
      later(async () => {
        const res = await resPromise;
        const count = Number.isFinite(res.count) ? res.count : cfg.count + 1;
        const goal = Number.isFinite(res.goal) ? res.goal : cfg.goal;
        stage.classList.remove('drinking');
        stage.classList.add('happy');
        titleEl.replaceChildren('Ahh, so fresh! ', h('span', { class: 'splash' }, '💙'));
        if (count >= goal) {
          subEl.textContent = count === goal ? `Daily goal reached! You're a hydration hero! 🎉` : `Bonus glass! ${count} today, amazing! 🎉`;
          burst('confetti', 26);
        } else {
          subEl.textContent = `${goal - count} more to reach today's goal. Keep it up!`;
          burst('drop', 12);
        }
        renderProgress(count, goal, Math.min(count, goal) - 1);
        later(() => { busy = false; finish(null); }, 2100);
      }, 1500);
    }

    function onSnooze() {
      if (busy || finished) return;
      busy = true;
      finished = true;
      clearTimeout(autoHideTimer);
      doneBtn.disabled = snoozeBtn.disabled = true;
      bubble.classList.add('resolved');
      report(cfg, 'snooze');
      playSound('snooze');
      stage.classList.remove('wiggle');
      stage.classList.add('sleepy');
      titleEl.replaceChildren('Okay, okay… ', h('span', { class: 'splash' }, '😴'));
      subEl.textContent = `I'll be back in ${cfg.snoozeMin} min. Don't forget me!`;
      burst('zz', 3);
      later(() => { busy = false; finish(null); }, 1900);
    }

    function onClose() {
      if (finished) return;
      busy = false;
      finish('dismiss');
    }

    function onBoop() {
      if (busy || finished) return;
      playSound('boop');
      stage.classList.remove('giggle');
      void stage.offsetWidth; // restart the animation
      stage.classList.add('giggle');
      subEl.textContent = pick(TICKLES);
      burst('drop', 6);
      later(() => stage.classList.remove('giggle'), 650);
    }

    doneBtn.addEventListener('click', onDone);
    snoozeBtn.addEventListener('click', onSnooze);
    closeBtn.addEventListener('click', onClose);
    charEl.addEventListener('click', onBoop);

    // ---- walk controller
    const walker = {
      x: -W - 40,
      phase: 'walk', // walk | center | runoff
      centerLeft: 3400,
      reachedCenter: false,
      last: 0,
      walkingClass: null,
      start() {
        mover.style.transform = `translate3d(${this.x}px,0,0)`;
        this.last = performance.now();
        raf = requestAnimationFrame((t) => this.frame(t));
      },
      runOff() {
        this.phase = 'runoff';
        stage.classList.add('running');
        stage.classList.remove('waving');
      },
      bubbleW: 0,
      /** Keep the bubble on screen while Drip enters/leaves, with the tail pointing at Drip. */
      placeBubble(vw) {
        if (!this.bubbleW) this.bubbleW = bubble.offsetWidth || 284;
        const bw = this.bubbleW;
        const centre = this.x + W / 2;
        const screenLeft = Math.min(Math.max(centre - bw / 2, 12), Math.max(12, vw - bw - 12));
        const tail = Math.min(Math.max(centre - screenLeft - 9, 18), bw - 36);
        bubble.style.left = `${(screenLeft - this.x).toFixed(1)}px`;
        bubble.style.setProperty('--tail', `${tail.toFixed(1)}px`);
        bubble.style.setProperty('--tail-o', `${(tail + 9).toFixed(1)}px`);
      },
      setWalking(on) {
        if (this.walkingClass === on) return;
        this.walkingClass = on;
        stage.classList.toggle('is-walking', on);
      },
      frame(now) {
        if (!alive) return;
        const dt = Math.min(64, now - this.last) / 1000;
        this.last = now;
        const holding = busy || (hover > 0 && this.phase !== 'runoff');
        const vw = window.innerWidth;
        if (!holding) {
          if (this.phase === 'walk' || this.phase === 'runoff') {
            this.x += (this.phase === 'runoff' ? 650 : 92) * dt;
            if (this.phase === 'walk' && !this.reachedCenter && this.x >= (vw - W) / 2) {
              this.reachedCenter = true;
              this.phase = 'center';
              stage.classList.add('waving');
            }
          } else if (this.phase === 'center') {
            this.centerLeft -= dt * 1000;
            if (this.centerLeft <= 0) {
              this.phase = 'walk';
              stage.classList.remove('waving');
            }
          }
        }
        this.setWalking(!holding && this.phase !== 'center');
        mover.style.transform = `translate3d(${this.x.toFixed(1)}px,0,0)`;
        this.placeBubble(vw);
        if (this.x > vw + 30) {
          if (!finished) { finished = true; report(cfg, 'ignored'); }
          destroy();
          return;
        }
        raf = requestAnimationFrame((t) => this.frame(t));
      }
    };

    // ---- go
    if (cfg.sound) later(() => playSound('hello'), 350);
    if (cfg.mode === 'walk') {
      walker.start();
    } else {
      stage.classList.add('waving');
      later(() => stage.classList.remove('waving'), 2600);
      armAutoHide(cfg.autoHideSec * 1000);
    }

    return { destroy };
  }

  window.__dripShow = function dripShow(cfg) {
    try {
      if (current) current.destroy();
      current = createReminder(cfg || {});
      return true;
    } catch (err) {
      console.warn('[Drip] could not show reminder', err);
      return false;
    }
  };
})();
