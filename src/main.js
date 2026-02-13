import './style.css';

/* ══════════════════════════════
   § SCALING
   ══════════════════════════════ */
function rescale() {
  const g = document.getElementById('game');
  const s = Math.min(innerWidth * 0.9 / g.offsetWidth, innerHeight * 0.9 / g.offsetHeight, 1.2);
  g.style.transform = `scale(${s})`;
}
rescale();
addEventListener('resize', rescale);

/* ══════════════════════════════
   § AUDIO
   ══════════════════════════════ */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const FREQS = { green: 392, red: 330, blue: 523.25, yellow: 659.25 };

function resumeAudio() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playTone(freq, dur = 350) {
  resumeAudio();
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.35, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur / 1000);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + dur / 1000);
}

function playBuzz() {
  resumeAudio();
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sawtooth'; o.frequency.value = 80;
  g.gain.setValueAtTime(0.3, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + 0.5);
}

/* ══════════════════════════════
   § UI HELPERS
   ══════════════════════════════ */
const COLORS = ['green', 'red', 'blue', 'yellow'];
const M = { green: 'g', red: 'r', blue: 'b', yellow: 'y' };
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function padOn(c) {
  const p = document.querySelector(`[data-color="${c}"]`);
  p.classList.add(`lit-${M[c]}`);
  p.parentElement.classList.add(`glow-${M[c]}`);
}

function padOff(c) {
  const p = document.querySelector(`[data-color="${c}"]`);
  p.classList.remove(`lit-${M[c]}`);
  p.parentElement.classList.remove(`glow-${M[c]}`);
}

function lightPad(c, dur = 350) {
  padOn(c);
  playTone(FREQS[c], dur);
  setTimeout(() => padOff(c), dur);
}

function setStatus(text, type) {
  $('status').textContent = text;
  const color = type === 'fail' ? 'text-r-lit' : type === 'win' ? 'text-g-lit' : 'text-zinc-600';
  $('status').className = `text-sm tracking-wide min-h-4 text-center ${color}`;
}

function lockPads(locked) {
  document.querySelectorAll('.pad').forEach(p =>
    locked ? p.classList.add('locked') : p.classList.remove('locked')
  );
  accepting = !locked;
}

function setCenterText(text) {
  $('centerText').textContent = text;
}

function updateDisplay() {
  $('round').textContent = round;
  $('step').textContent = seq.length + ' / ' + (START_LEN + round - 1);
  if (round > best) { best = round; $('best').textContent = best; }
}

/* ══════════════════════════════
   § COUNTDOWN
   ══════════════════════════════ */
async function countdown() {
  busy = true;
  lockPads(true);
  const order = ['green', 'red', 'blue', 'yellow'];
  const allOn = () => COLORS.forEach(c => padOn(c));
  const allOff = () => COLORS.forEach(c => padOff(c));

  for (let i = 0; i < 4; i++) {
    if (!playing) return;
    const c = order[i];
    padOn(c);
    playTone(330 + i * 80, 80);
    await sleep(80);
    padOff(c);
  }

  if (!playing) return;
  allOn();
  playTone(880, 150);
  await sleep(200);
  allOff();
  await sleep(500);
  busy = false;
}

/* ══════════════════════════════
   § CELEBRATION
   ══════════════════════════════ */
async function celebrate() {
  lockPads(true);
  const sweep = ['green', 'red', 'yellow', 'blue'];
  const tones = [392, 440, 523, 587, 659, 784, 880, 988];

  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 4; i++) {
      const c = sweep[i];
      padOn(c);
      playTone(tones[r * 4 + i], 150);
      await sleep(120);
      padOff(c);
    }
  }

  for (let i = 0; i < 2; i++) {
    COLORS.forEach(c => padOn(c));
    playTone(1047, 200);
    await sleep(200);
    COLORS.forEach(c => padOff(c));
    await sleep(150);
  }
}

/* ══════════════════════════════
   § GAME STATE
   ══════════════════════════════ */
const START_LEN = 7;
const oppSoundDuration = 350;
const oppSilenceDuration = 600;
const playerSoundDuration = 350;
let seq = [], pi = 0, round = 0, best = 0;
let playing = false, accepting = false, busy = false;

/* ══════════════════════════════
   § SEQUENCE PLAYBACK
   ══════════════════════════════ */
async function playSequence() {
  busy = true;
  lockPads(true);
  setStatus('Watch carefully\u2026');
  for (const c of seq) {
    if (!playing) return;
    await sleep(oppSilenceDuration);
    lightPad(c, oppSoundDuration);
    await sleep(oppSoundDuration);
  }
  if (!playing) return;
  lockPads(false);
  pi = 0;
  setStatus('Your turn \u2014 ' + seq.length + ' notes');
  busy = false;
}

/* ══════════════════════════════
   § GAME LOGIC
   ══════════════════════════════ */
function addNote() {
  seq.push(COLORS[Math.floor(Math.random() * 4)]);
  updateDisplay();
  playSequence();
}

async function handleFail() {
  accepting = false;
  lockPads(true);
  playBuzz();
  const fl = $('flashOverlay');
  fl.classList.add('flash');
  fl.style.opacity = 1;
  setStatus('Wrong!', 'fail');
  setTimeout(() => { fl.classList.remove('flash'); fl.style.opacity = 0; }, 300);
  await sleep(1200);
  setStatus('Game over \u2014 reached Round ' + round, 'fail');
  playing = false;
  setCenterText('Start');
}

async function handleStepComplete() {
  accepting = false;
  lockPads(true);
  const target = START_LEN + round - 1;

  if (seq.length >= target) {
    setStatus('Round ' + round + ' complete!', 'win');
    await sleep(400);
    await celebrate();
    await sleep(600);
    round++;
    seq = [];
    updateDisplay();
    addNote();
  } else {
    setStatus('Correct!', 'win');
    await sleep(600);
    addNote();
  }
}

function tap(c) {
  if (!accepting) return;
  lightPad(c, playerSoundDuration);
  if (c !== seq[pi]) { handleFail(); return; }
  if (++pi === seq.length) handleStepComplete();
}

async function startGame() {
  round = 1;
  seq = [];
  pi = 0;
  playing = true;
  setCenterText('Stop');
  updateDisplay();
  setStatus('Get ready\u2026');
  await countdown();
  if (!playing) return;
  addNote();
}

async function stopGame() {
  busy = true;
  playing = false;
  accepting = false;
  lockPads(true);

  COLORS.forEach(c => padOn(c));

  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  const lfo = audioCtx.createOscillator(), lfoGain = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(600, audioCtx.currentTime);
  o.frequency.linearRampToValueAtTime(150, audioCtx.currentTime + 0.6);
  lfo.type = 'sine'; lfo.frequency.value = 8;
  lfoGain.gain.value = 30;
  lfo.connect(lfoGain); lfoGain.connect(o.frequency);
  g.gain.setValueAtTime(0.3, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.7);
  o.connect(g); g.connect(audioCtx.destination);
  lfo.start(); o.start();
  o.stop(audioCtx.currentTime + 0.7); lfo.stop(audioCtx.currentTime + 0.7);

  const order = ['yellow', 'blue', 'red', 'green'];
  for (let i = 0; i < 4; i++) {
    await sleep(150);
    padOff(order[i]);
  }
  await sleep(200);

  setCenterText('Start');
  $('round').textContent = '\u2014';
  $('step').textContent = '\u2014';
  setStatus('Press start to play');
  busy = false;
}

/* ══════════════════════════════
   § EVENT HANDLERS
   ══════════════════════════════ */
document.querySelectorAll('.pad').forEach(p =>
  p.addEventListener('pointerdown', () => {
    resumeAudio();
    if (!playing) { lightPad(p.dataset.color, playerSoundDuration); return; }
    tap(p.dataset.color);
  })
);

$('centerBtn').addEventListener('pointerdown', () => {
  resumeAudio();
  if (busy) return;
  if (playing) stopGame(); else startGame();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeHelp(); return; }
  if (!accepting) return;
  const m = { q: 'green', w: 'red', a: 'yellow', s: 'blue' };
  if (m[e.key.toLowerCase()]) tap(m[e.key.toLowerCase()]);
});

/* ══════════════════════════════
   § HELP MODAL
   ══════════════════════════════ */
const helpModal = $('helpModal');

function openHelp() {
  helpModal.classList.remove('hidden');
  helpModal.classList.add('flex');
}

function closeHelp() {
  helpModal.classList.add('hidden');
  helpModal.classList.remove('flex');
}

$('helpBtn').addEventListener('pointerdown', openHelp);
$('helpClose').addEventListener('pointerdown', closeHelp);
helpModal.addEventListener('pointerdown', e => {
  if (e.target === helpModal) closeHelp();
});
