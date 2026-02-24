// ── AI TTS Studio - renderer.js ───────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {

// ── DOM refs ───────────────────────────────────────────────────────
const ttsInput     = document.getElementById('tts-input');
const voiceSelect  = document.getElementById('voice-select');
const speakBtn     = document.getElementById('speak-btn');
const stopBtn      = document.getElementById('stop-btn');
const ttsFeedback  = document.getElementById('tts-feedback');
const apiKeyInput  = document.getElementById('api-key');
const personaInput = document.getElementById('persona-input');
const aiBtn        = document.getElementById('ai-btn');
const aiProgress   = document.getElementById('ai-progress');

const pitchRange   = document.getElementById('pitch-range');
const rateRange    = document.getElementById('rate-range');
const volumeRange  = document.getElementById('volume-range');
const stutterRange = document.getElementById('stutter-range');
const bpmRange     = document.getElementById('bpm-range');

const pitchSliderVal = document.getElementById('pitch-slider-val');
const rateSliderVal  = document.getElementById('rate-slider-val');
const volumeVal      = document.getElementById('volume-val');
const stutterVal     = document.getElementById('stutter-val');
const bpmVal         = document.getElementById('bpm-val');

const pitchKnob    = document.getElementById('pitch-knob');
const rateKnob     = document.getElementById('rate-knob');
const pitchKnobVal = document.getElementById('pitch-knob-val');
const rateKnobVal  = document.getElementById('rate-knob-val');

const musicPlayBtn = document.getElementById('music-play-btn');
const musicStopBtn = document.getElementById('music-stop-btn');

let voices = [];
let activeStyle = 'talk';
let activeEmo   = 'neutral';
let activeAI    = 'story';
let activeGenre = 'pop';

// ── Feedback ───────────────────────────────────────────────────────
function setFeedback(msg, color) {
  ttsFeedback.style.color = color || '#00ffe7';
  ttsFeedback.textContent = msg;
}

// ── Voices ─────────────────────────────────────────────────────────
function populateVoices() {
  const v = window.speechSynthesis.getVoices();
  if (v.length > 0) voices = v;
  if (!voiceSelect) return;
  voiceSelect.innerHTML = '';
  voices.forEach((voice, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = voice.name + ' (' + voice.lang + ')' + (voice.default ? ' ★' : '');
    voiceSelect.appendChild(opt);
  });
}
if (typeof window.speechSynthesis !== 'undefined') {
  populateVoices();
  window.speechSynthesis.onvoiceschanged = populateVoices;
  setTimeout(populateVoices, 500);
}

// ── Chip selection helpers ─────────────────────────────────────────
function setupChips(selector, onSelect) {
  document.querySelectorAll(selector).forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll(selector).forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      onSelect(chip.dataset[Object.keys(chip.dataset)[0]]);
    });
  });
}
setupChips('.chip',       val => { activeStyle = val; applyStylePreset(val); });
setupChips('.emo-chip',   val => { activeEmo   = val; applyEmoPreset(val);   });
setupChips('.ai-chip',    val => { activeAI    = val; });
setupChips('.music-chip', val => { activeGenre = val; });

// ── Style presets ──────────────────────────────────────────────────
function applyStylePreset(style) {
  const p = {
    talk:         { pitch:1.0,  rate:1.0  },
    sing:         { pitch:1.6,  rate:0.85 },
    narrate:      { pitch:0.85, rate:0.78 },
    stutter:      { pitch:1.0,  rate:0.95 },
    robot:        { pitch:0.3,  rate:0.9  },
    whisper:      { pitch:1.2,  rate:0.75 },
    chipmunk:     { pitch:2.0,  rate:1.4  },
    giant:        { pitch:0.1,  rate:0.65 },
    slowmo:       { pitch:0.8,  rate:0.4  },
    'excited-spk':{ pitch:1.5,  rate:1.6  },
    'sing-stutter':{ pitch:1.6, rate:0.85 },
    'narrate-slow':{ pitch:0.85,rate:0.55 },
  }[style] || { pitch:1.0, rate:1.0 };
  pitchRange.value = p.pitch;
  rateRange.value  = p.rate;
  syncDisplays(); syncKnobs();
}

// ── Emotion presets ────────────────────────────────────────────────
function applyEmoPreset(emo) {
  const p = {
    neutral:  { pitch:1.0,  rate:1.0  },
    happy:    { pitch:1.3,  rate:1.2  },
    sad:      { pitch:0.8,  rate:0.75 },
    angry:    { pitch:0.9,  rate:1.5  },
    scared:   { pitch:1.4,  rate:1.6  },
    romantic: { pitch:1.1,  rate:0.8  },
    excited:  { pitch:1.5,  rate:1.5  },
    calm:     { pitch:0.9,  rate:0.8  },
  }[emo] || { pitch:1.0, rate:1.0 };
  pitchRange.value = p.pitch;
  rateRange.value  = p.rate;
  syncDisplays(); syncKnobs();
}

// ── Slider sync ────────────────────────────────────────────────────
function syncDisplays() {
  if (pitchSliderVal) pitchSliderVal.textContent = parseFloat(pitchRange.value).toFixed(2);
  if (rateSliderVal)  rateSliderVal.textContent  = parseFloat(rateRange.value).toFixed(2);
  if (pitchKnobVal)   pitchKnobVal.textContent   = parseFloat(pitchRange.value).toFixed(2);
  if (rateKnobVal)    rateKnobVal.textContent    = parseFloat(rateRange.value).toFixed(2);
  if (volumeVal)      volumeVal.textContent      = parseFloat(volumeRange.value).toFixed(2);
  if (stutterVal)     stutterVal.textContent     = stutterRange.value + 'x';
  if (bpmVal)         bpmVal.textContent         = bpmRange.value;
}
[pitchRange, rateRange, volumeRange, stutterRange, bpmRange].forEach(el => {
  el && el.addEventListener('input', () => { syncDisplays(); syncKnobs(); });
});

// ── Rotary knobs ───────────────────────────────────────────────────
function setupKnob(knob, rangeEl) {
  if (!knob || !rangeEl) return;
  let startY, startVal;
  knob.addEventListener('mousedown', e => {
    startY   = e.clientY;
    startVal = parseFloat(rangeEl.value);
    const min = parseFloat(rangeEl.min), max = parseFloat(rangeEl.max);
    const step = parseFloat(rangeEl.step) || 0.05;
    const onMove = ev => {
      let v = Math.min(max, Math.max(min, startVal + (startY - ev.clientY) * step * 1.5));
      rangeEl.value = Math.round(v / step) * step;
      syncDisplays(); syncKnobs();
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  });
}
setupKnob(pitchKnob, pitchRange);
setupKnob(rateKnob,  rateRange);

function syncKnobs() {
  const rot = (r) => -140 + ((parseFloat(r.value) - parseFloat(r.min)) / (parseFloat(r.max) - parseFloat(r.min))) * 280;
  const pd = pitchKnob && pitchKnob.querySelector('.knob-dot');
  const rd = rateKnob  && rateKnob.querySelector('.knob-dot');
  if (pd) pd.style.transform = 'translateX(-50%) rotate(' + rot(pitchRange) + 'deg)';
  if (rd) rd.style.transform = 'translateX(-50%) rotate(' + rot(rateRange)  + 'deg)';
}

// ── EQ Bars ────────────────────────────────────────────────────────
const eqWrap = document.getElementById('eq-wrap');
const eqBars = [];
if (eqWrap) {
  for (let i = 0; i < 16; i++) {
    const b = document.createElement('div');
    b.className = 'eq-bar'; b.style.height = '3px';
    eqWrap.appendChild(b); eqBars.push(b);
  }
}
let eqId = null;
function startEQ(color) {
  stopEQ();
  const grad = color || 'linear-gradient(to top,#00ffe7,#0066ff)';
  eqId = setInterval(() => {
    eqBars.forEach(b => { b.style.height = (4 + Math.random() * 44) + 'px'; b.style.background = grad; });
  }, 80);
}
function stopEQ() {
  if (eqId) { clearInterval(eqId); eqId = null; }
  eqBars.forEach(b => b.style.height = '3px');
}

// ── Text helpers ───────────────────────────────────────────────────
function stutterText(text, times) {
  return text.replace(/\b(\w)(\w*)/g, (m, f, r) => (f + '-').repeat(times) + f + r);
}
function processText(text) {
  const s = activeStyle;
  const t = parseInt(stutterRange.value) || 2;
  if (s === 'stutter' || s === 'sing-stutter') return stutterText(text, t);
  return text;
}

// ── AI GENERATE ───────────────────────────────────────────────────
aiBtn && aiBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
  const topic  = ttsInput.value.trim();
  if (!apiKey)  { setFeedback('⚠ Enter your OpenAI API key first.', '#ff4455'); return; }
  if (!topic)   { setFeedback('⚠ Enter a topic or text first.', '#ff4455'); return; }
  if (typeof window.ttsApp === 'undefined') { setFeedback('⚠ ttsApp bridge not found - restart app.', '#ff4455'); return; }

  aiBtn.disabled = true;
  setFeedback('✦ Generating with AI...', '#9b59ff');
  if (aiProgress) { aiProgress.style.width = '0%'; }

  // Animate progress bar
  let prog = 0;
  const progId = setInterval(() => {
    prog = Math.min(prog + 2, 88);
    if (aiProgress) aiProgress.style.width = prog + '%';
  }, 120);

  const result = await window.ttsApp.generateAI(apiKey, activeAI, topic, personaInput ? personaInput.value.trim() : '');
  clearInterval(progId);
  if (aiProgress) aiProgress.style.width = '100%';
  setTimeout(() => { if (aiProgress) aiProgress.style.width = '0%'; }, 600);

  aiBtn.disabled = false;
  if (result.error) {
    setFeedback('✘ AI Error: ' + result.error, '#ff4455');
  } else {
    ttsInput.value = result.text;
    setFeedback('✦ AI content ready! Click Speak to play.', '#9b59ff');
  }
});

// ── SPEAK ─────────────────────────────────────────────────────────
speakBtn && speakBtn.addEventListener('click', () => {
  let text = processText(ttsInput.value.trim());
  if (!text) { setFeedback('⚠ Enter some text first.', '#ff4455'); return; }
  window.speechSynthesis.cancel();

  const utterance  = new window.SpeechSynthesisUtterance(text);
  const idx        = parseInt(voiceSelect ? voiceSelect.value : 0);
  const voice      = (!isNaN(idx) && voices[idx]) ? voices[idx] : (voices[0] || null);
  if (voice) utterance.voice = voice;
  utterance.pitch  = parseFloat(pitchRange.value);
  utterance.rate   = parseFloat(rateRange.value);
  utterance.volume = parseFloat(volumeRange.value);

  speakBtn.disabled = true;
  setFeedback('▶ Speaking... [' + activeStyle.toUpperCase() + ' / ' + activeEmo.toUpperCase() + ']', '#00ffe7');
  startEQ();

  utterance.onend   = () => { stopEQ(); speakBtn.disabled = false; setFeedback('✔ Done.', '#00ff88'); };
  utterance.onerror = e  => { stopEQ(); speakBtn.disabled = false; setFeedback('✘ TTS Error: ' + (e.error || 'unknown'), '#ff4455'); };
  window.speechSynthesis.speak(utterance);
});

// ── STOP ──────────────────────────────────────────────────────────
stopBtn && stopBtn.addEventListener('click', () => {
  window.speechSynthesis.cancel();
  stopEQ(); stopMusic();
  if (speakBtn) speakBtn.disabled = false;
  setFeedback('■ Stopped.', '#ff9900');
});

// ── MUSIC COMPOSER (Web Audio API) ────────────────────────────────
let audioCtx = null, musicNodes = [], musicRunning = false, musicTimer = null;

const SCALES = {
  pop:      [261.63,293.66,329.63,349.23,392.00,440.00,493.88,523.25],
  jazz:     [261.63,293.66,311.13,349.23,369.99,415.30,466.16,523.25],
  dramatic: [130.81,146.83,155.56,174.61,196.00,220.00,246.94,261.63],
  lofi:     [261.63,293.66,329.63,392.00,440.00,523.25,587.33,659.25],
  horror:   [130.81,138.59,146.83,155.56,164.81,174.61,185.00,195.99],
  happy:    [261.63,293.66,329.63,349.23,392.00,440.00,493.88,523.25],
  sad:      [261.63,277.18,311.13,349.23,369.99,415.30,466.16,493.88],
  ambient:  [220.00,246.94,261.63,293.66,329.63,369.99,415.30,440.00],
};
const WAVEFORMS = { pop:'sine', jazz:'triangle', dramatic:'sawtooth', lofi:'triangle', horror:'sawtooth', happy:'sine', sad:'sine', ambient:'sine' };
const EQ_COLORS = {
  pop:'linear-gradient(to top,#ff3399,#9b59ff)',
  jazz:'linear-gradient(to top,#ffe600,#ff8800)',
  dramatic:'linear-gradient(to top,#ff4455,#9b59ff)',
  lofi:'linear-gradient(to top,#00ff88,#00ffe7)',
  horror:'linear-gradient(to top,#ff4455,#220000)',
  happy:'linear-gradient(to top,#ffe600,#00ff88)',
  sad:'linear-gradient(to top,#0066ff,#9b59ff)',
  ambient:'linear-gradient(to top,#00ffe7,#9b59ff)',
};

function stopMusic() {
  musicRunning = false;
  if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
  musicNodes.forEach(n => { try { n.stop(); } catch(e){} });
  musicNodes = [];
  if (audioCtx) { audioCtx.close(); audioCtx = null; }
  stopEQ();
}

function playTone(freq, startTime, duration, wave, gainVal, ctx, masterGain) {
  const osc  = ctx.createOscillator();
  const gn   = ctx.createGain();
  osc.type   = wave;
  osc.frequency.setValueAtTime(freq, startTime);
  gn.gain.setValueAtTime(0, startTime);
  gn.gain.linearRampToValueAtTime(gainVal, startTime + 0.04);
  gn.gain.linearRampToValueAtTime(0, startTime + duration - 0.04);
  osc.connect(gn); gn.connect(masterGain);
  osc.start(startTime); osc.stop(startTime + duration);
  musicNodes.push(osc);
}

function playBeat(startTime, ctx, masterGain) {
  const noise = ctx.createOscillator();
  const ng    = ctx.createGain();
  noise.type  = 'square';
  noise.frequency.setValueAtTime(80, startTime);
  ng.gain.setValueAtTime(0.15, startTime);
  ng.gain.linearRampToValueAtTime(0, startTime + 0.1);
  noise.connect(ng); ng.connect(masterGain);
  noise.start(startTime); noise.stop(startTime + 0.1);
  musicNodes.push(noise);
}

function startMusic() {
  stopMusic();
  musicRunning = true;
  audioCtx     = new (window.AudioContext || window.webkitAudioContext)();
  const master = audioCtx.createGain();
  master.gain.setValueAtTime(0.35, audioCtx.currentTime);
  master.connect(audioCtx.destination);

  const scale  = SCALES[activeGenre]  || SCALES.pop;
  const wave   = WAVEFORMS[activeGenre] || 'sine';
  const bpm    = parseInt(bpmRange.value) || 100;
  const beat   = 60 / bpm;
  const eqCol  = EQ_COLORS[activeGenre] || EQ_COLORS.pop;

  startEQ(eqCol);

  let step = 0;
  function scheduleStep() {
    if (!musicRunning) return;
    const t   = audioCtx.currentTime;
    const idx = Math.floor(Math.random() * scale.length);
    const dur = beat * (Math.random() > 0.7 ? 2 : 1);
    playTone(scale[idx], t, dur * 0.85, wave, 0.2, audioCtx, master);
    if (activeGenre !== 'ambient') {
      const chord = scale[(idx + 2) % scale.length];
      playTone(chord, t, dur * 0.85, wave, 0.12, audioCtx, master);
    }
    if (['pop','jazz','happy','dramatic'].includes(activeGenre) && step % 2 === 0) {
      playBeat(t, audioCtx, master);
    }
    step++;
    musicTimer = setTimeout(scheduleStep, dur * 1000);
  }
  scheduleStep();
}

musicPlayBtn && musicPlayBtn.addEventListener('click', startMusic);
musicStopBtn && musicStopBtn.addEventListener('click', () => { stopMusic(); setFeedback('■ Music stopped.', '#ff9900'); });

// ── Init ───────────────────────────────────────────────────────────
syncDisplays();
syncKnobs();

}); // end DOMContentLoaded
