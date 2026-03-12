import { CONFIG } from './config.js';

export function createAudioController() {
  let context = null;
  let master = null;
  let sfxBus = null;
  let musicBus = null;
  let sfxMuted = false;
  let musicMuted = true;
  let noiseBuffer = null;
  let lastFlowAt = 0;
  let musicLayer = null;

  function getAudioContext() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.AudioContext || window.webkitAudioContext || null;
  }

  function syncBusGains() {
    if (!context || !sfxBus || !musicBus || !master) {
      return;
    }

    const now = context.currentTime;
    sfxBus.gain.setTargetAtTime(sfxMuted ? 0.0001 : 1, now, 0.02);
    musicBus.gain.setTargetAtTime(musicMuted ? 0.0001 : 0.55, now, 0.06);
    master.gain.setTargetAtTime(CONFIG.SOUND.MASTER_GAIN, now, 0.02);
  }

  function ensureContext() {
    if (context) {
      return context;
    }

    const AudioContextRef = getAudioContext();
    if (!AudioContextRef) {
      return null;
    }

    context = new AudioContextRef();
    master = context.createGain();
    sfxBus = context.createGain();
    musicBus = context.createGain();

    master.gain.value = CONFIG.SOUND.MASTER_GAIN;
    sfxBus.gain.value = sfxMuted ? 0.0001 : 1;
    musicBus.gain.value = musicMuted ? 0.0001 : 0.55;

    sfxBus.connect(master);
    musicBus.connect(master);
    master.connect(context.destination);

    return context;
  }

  function stopMusicLayer() {
    if (!context || !musicLayer) {
      return;
    }

    const now = context.currentTime;
    const fadeOut = 0.2;
    musicLayer.padGain.gain.cancelScheduledValues(now);
    musicLayer.padGain.gain.setTargetAtTime(0.0001, now, fadeOut * 0.35);

    const stopAt = now + fadeOut + 0.1;
    musicLayer.oscA.stop(stopAt);
    musicLayer.oscB.stop(stopAt);
    musicLayer.drift.stop(stopAt);
    musicLayer = null;
  }

  function startMusicLayer() {
    const ctx = ensureContext();
    if (!ctx || musicLayer || musicMuted || ctx.state !== 'running') {
      return;
    }

    const now = ctx.currentTime;
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const drift = ctx.createOscillator();
    const driftGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const padGain = ctx.createGain();

    oscA.type = 'triangle';
    oscB.type = 'sine';
    drift.type = 'sine';

    oscA.frequency.setValueAtTime(74, now);
    oscB.frequency.setValueAtTime(111, now);
    drift.frequency.setValueAtTime(0.08, now);
    driftGain.gain.setValueAtTime(7, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(780, now);
    filter.Q.setValueAtTime(0.5, now);

    padGain.gain.setValueAtTime(0.0001, now);
    padGain.gain.linearRampToValueAtTime(0.11, now + 0.5);

    drift.connect(driftGain);
    driftGain.connect(oscA.detune);
    driftGain.connect(oscB.detune);

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(padGain);
    padGain.connect(musicBus);

    oscA.start(now);
    oscB.start(now);
    drift.start(now);

    musicLayer = {
      oscA,
      oscB,
      drift,
      padGain
    };
  }

  async function unlock() {
    const ctx = ensureContext();
    if (!ctx) {
      return false;
    }

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (error) {
        return false;
      }
    }

    syncBusGains();
    if (!musicMuted) {
      startMusicLayer();
    }

    return true;
  }

  function setMuted(nextMuted) {
    sfxMuted = Boolean(nextMuted);
    syncBusGains();
    return !sfxMuted;
  }

  function toggleMute() {
    return setMuted(!sfxMuted);
  }

  function isMuted() {
    return sfxMuted;
  }

  function setMusicMuted(nextMuted) {
    musicMuted = Boolean(nextMuted);
    syncBusGains();

    if (musicMuted) {
      stopMusicLayer();
    } else {
      startMusicLayer();
    }

    return !musicMuted;
  }

  function toggleMusic() {
    return setMusicMuted(!musicMuted);
  }

  function isMusicMuted() {
    return musicMuted;
  }

  function createNoiseSource(ctx, startTime, duration, volume) {
    if (!noiseBuffer) {
      noiseBuffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * 0.25)), ctx.sampleRate);
      const channel = noiseBuffer.getChannelData(0);
      for (let i = 0; i < channel.length; i += 1) {
        channel[i] = Math.random() * 2 - 1;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(820, startTime);
    filter.Q.setValueAtTime(0.9, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0001, volume), startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(sfxBus);

    source.start(startTime);
    source.stop(startTime + duration);
  }

  function createTone(type, frequency, startTime, duration, options) {
    const ctx = context;
    if (!ctx || !sfxBus) {
      return;
    }

    const opts = options || {};
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    if (Number.isFinite(opts.frequencyEnd)) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, opts.frequencyEnd), startTime + duration);
    }

    filter.type = opts.filterType || 'lowpass';
    filter.frequency.setValueAtTime(opts.filterFrequency || 1800, startTime);
    filter.Q.setValueAtTime(opts.q || 0.7, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(opts.volume || 0.08, startTime + (opts.attack || 0.01));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(sfxBus);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }

  function playPowerClick() {
    const ctx = ensureContext();
    if (!ctx || sfxMuted || ctx.state !== 'running') {
      return;
    }

    const now = ctx.currentTime;
    createTone('triangle', 680, now, 0.09, {
      volume: 0.06,
      frequencyEnd: 980,
      filterFrequency: 2100,
      q: 1.2,
      attack: 0.005
    });
  }

  function playFirewallToggle(payload) {
    const ctx = ensureContext();
    if (!ctx || sfxMuted || ctx.state !== 'running') {
      return;
    }

    const mode = payload && Number.isFinite(payload.mode) ? payload.mode : 1;
    const outputs = payload && Number.isFinite(payload.outputs) ? payload.outputs : 1;
    const now = ctx.currentTime;
    createTone('square', 420 + mode * 45, now, 0.08, {
      volume: 0.045,
      frequencyEnd: 560 + outputs * 20,
      filterFrequency: 1700,
      q: 1.1,
      attack: 0.004
    });
  }

  function playFlow(payload) {
    const ctx = ensureContext();
    if (!ctx || sfxMuted || ctx.state !== 'running') {
      return;
    }

    const nowMs = Date.now();
    if (nowMs - lastFlowAt < CONFIG.SOUND.FLOW_DEBOUNCE_MS) {
      return;
    }

    lastFlowAt = nowMs;

    const energy = payload && Number.isFinite(payload.energy) ? payload.energy : 1;
    const now = ctx.currentTime;
    createTone('sine', 220 + energy * 35, now, 0.11, {
      volume: 0.03,
      frequencyEnd: 320 + energy * 25,
      filterFrequency: 1200,
      q: 0.9,
      attack: 0.008
    });
  }

  function playBreakerPrime() {
    const ctx = ensureContext();
    if (!ctx || sfxMuted || ctx.state !== 'running') {
      return;
    }

    const now = ctx.currentTime;
    createTone('triangle', 310, now, 0.13, {
      volume: 0.05,
      frequencyEnd: 470,
      filterFrequency: 1450,
      q: 0.9,
      attack: 0.006
    });
  }

  function playPurifierPulse() {
    const ctx = ensureContext();
    if (!ctx || sfxMuted || ctx.state !== 'running') {
      return;
    }

    const now = ctx.currentTime;
    createTone('sine', 520, now, 0.1, {
      volume: 0.05,
      frequencyEnd: 720,
      filterFrequency: 2200,
      q: 1.3,
      attack: 0.004
    });
  }

  function playBreakerDissipated(payload) {
    const ctx = ensureContext();
    if (!ctx || sfxMuted || ctx.state !== 'running') {
      return;
    }

    const amount = payload && Number.isFinite(payload.amount) ? payload.amount : 1;
    const now = ctx.currentTime;
    createTone('sawtooth', 260, now, 0.14, {
      volume: Math.min(0.07, 0.03 + amount * 0.01),
      frequencyEnd: 130,
      filterFrequency: 900,
      q: 0.8,
      attack: 0.005
    });
  }

  function playOverload() {
    const ctx = ensureContext();
    if (!ctx || sfxMuted || ctx.state !== 'running') {
      return;
    }

    const now = ctx.currentTime;
    createNoiseSource(ctx, now, 0.18, 0.08);
    createTone('sawtooth', 240, now, 0.22, {
      volume: 0.06,
      frequencyEnd: 70,
      filterFrequency: 900,
      q: 0.8,
      attack: 0.003
    });
    createTone('triangle', 90, now, 0.28, {
      volume: 0.04,
      frequencyEnd: 45,
      filterFrequency: 500,
      q: 0.7,
      attack: 0.004
    });
  }

  function playRunEnd(payload) {
    const ctx = ensureContext();
    if (!ctx || sfxMuted || ctx.state !== 'running') {
      return;
    }

    const result = payload && payload.result ? payload.result : 'lose';
    const now = ctx.currentTime;

    if (result === 'win') {
      createTone('triangle', 420, now, 0.15, {
        volume: 0.07,
        frequencyEnd: 640,
        filterFrequency: 2100,
        q: 1,
        attack: 0.004
      });
      createTone('sine', 620, now + 0.07, 0.16, {
        volume: 0.06,
        frequencyEnd: 860,
        filterFrequency: 2400,
        q: 0.9,
        attack: 0.004
      });
      return;
    }

    createTone('sawtooth', 250, now, 0.22, {
      volume: 0.06,
      frequencyEnd: 80,
      filterFrequency: 760,
      q: 0.8,
      attack: 0.004
    });
  }

  function play(eventType, payload) {
    if (eventType === 'node_activated') {
      if (payload && payload.nodeType === 'firewall') {
        playFirewallToggle(payload);
        return;
      }
      playPowerClick();
      return;
    }

    if (eventType === 'firewall_toggled') {
      playFirewallToggle(payload);
      return;
    }

    if (eventType === 'energy_flow') {
      playFlow(payload);
      return;
    }

    if (eventType === 'breaker_primed') {
      playBreakerPrime();
      return;
    }

    if (eventType === 'purifier_pulse') {
      playPurifierPulse();
      return;
    }

    if (eventType === 'breaker_dissipated') {
      playBreakerDissipated(payload);
      return;
    }

    if (eventType === 'overload') {
      playOverload();
      return;
    }

    if (eventType === 'run_end') {
      playRunEnd(payload);
    }
  }

  return {
    unlock,
    play,
    toggleMute,
    setMuted,
    isMuted,
    toggleMusic,
    setMusicMuted,
    isMusicMuted
  };
}
