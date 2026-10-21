// Brickbloom audio: every sound and the music are synthesised live with WebAudio (no audio files).
window.SFX = (() => {
  let ac = null, master, musicGain, musicOn = localStorage.bbMusic !== '0', sfxOn = localStorage.bbSfx !== '0', timer = null;
  function init() {
    if (ac) return; const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    ac = new A(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = 0.12; musicGain.connect(master);
    if (musicOn) startMusic();
  }
  ['pointerdown', 'keydown'].forEach(e => addEventListener(e, () => { init(); if (ac && ac.state === 'suspended') ac.resume(); }, { passive: true }));
  function tone(f, d, type = 'square', vol = 0.2, slide = 0, when = 0, dest) {
    if (!ac) return; const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(d, vol = 0.2, hp = 800) {
    if (!ac) return; const b = ac.createBuffer(1, ac.sampleRate * d, ac.sampleRate), x = b.getChannelData(0);
    for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
    s.buffer = b; s.connect(f); f.connect(g); g.connect(master); s.start();
  }
  const S = {
    hit: () => { noise(0.06, 0.15, 1500); tone(180, 0.05, 'square', 0.06, -60); },
    break: () => { noise(0.18, 0.25, 400); tone(140, 0.15, 'triangle', 0.15, -90); },
    place: () => tone(330, 0.07, 'square', 0.1, 80),
    jump: () => tone(260, 0.12, 'square', 0.07, 300),
    gem: () => { tone(988, 0.07, 'square', 0.08); tone(1318, 0.12, 'square', 0.08, 0, 0.06); },
    chat: () => tone(660, 0.05, 'sine', 0.08),
    good: () => [523, 659, 784, 1046].forEach((f, k) => tone(f, 0.12, 'square', 0.08, 0, k * 0.07)),
    bad: () => tone(200, 0.25, 'sawtooth', 0.08, -120),
    open: () => tone(440, 0.06, 'triangle', 0.1, 220),
    splash: () => { noise(0.3, 0.2, 200); tone(90, 0.3, 'sine', 0.2, -40); },
  };
  // generative chiptune: pentatonic arpeggio + bass, 4-bar loop with random variation
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16], CHORDS = [0, -3, 5, 3];
  function startMusic() {
    if (!ac || timer) return; let step = 0; const bpm = 104, dt = 60 / bpm / 2;
    timer = setInterval(() => {
      const bar = Math.floor(step / 8) % 4, root = 57 + CHORDS[bar], hz = n => 440 * Math.pow(2, (n - 69) / 12);
      if (step % 8 === 0) tone(hz(root - 12), dt * 7, 'triangle', 0.5, 0, 0, musicGain);
      if (step % 2 === 0 || Math.random() < 0.4) tone(hz(root + SCALE[(step * 3 + bar + (Math.random() < 0.2 ? 2 : 0)) % SCALE.length]), dt * 0.9, 'square', 0.18, 0, 0, musicGain);
      if (step % 4 === 2) { const b = ac.createBufferSource(); void b; }
      step++;
    }, dt * 1000);
  }
  function stopMusic() { clearInterval(timer); timer = null; }
  return {
    play: n => { if (sfxOn && ac && S[n]) S[n](); },
    toggleMusic() { musicOn = !musicOn; localStorage.bbMusic = musicOn ? '1' : '0'; init(); musicOn ? startMusic() : stopMusic(); return musicOn; },
    toggleSfx() { sfxOn = !sfxOn; localStorage.bbSfx = sfxOn ? '1' : '0'; return sfxOn; },
    get musicOn() { return musicOn; }, get sfxOn() { return sfxOn; },
  };
})();
