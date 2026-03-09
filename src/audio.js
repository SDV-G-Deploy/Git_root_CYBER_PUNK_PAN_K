import { CONFIG } from './config.js';

export function createAudioController() {
  let context = null;
  let master = null;
  let muted = false;
  let noiseBuffer = null;
  let lastFlowAt = 0;

  function getAudioContext() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.AudioContext || window.webkitAudioContext || null;
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
    master.gain.value = muted ? 0 : CONFIG.SOUND.MASTER_GAIN;
    master.connect(context.destination);
    return context;
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

    return true;
  }

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);

    if (master && context) {
      const target = muted ? 0.0001 : CONFIG.SOUND.MASTER_GAIN;
      master.gain.setTargetAtTime(target, context.currentTime, 0.01);
    }

    return !muted;
  }

  function toggleMute() {
    return setMuted(!muted);
  }

  function isMuted() {
    return muted;
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
    gain.connect(master);

    source.start(startTime);
    source.stop(startTime + duration);
  }

  function createTone(type, frequency, startTime, duration, options) {
    const ctx = context;
    if (!ctx || !master) {
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
    gain.connect(master);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }

  function playClick() {
    const ctx = ensureContext();
    if (!ctx || muted || ctx.state !== 'running') {
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

  function playFlow(payload) {
    const ctx = ensureContext();
    if (!ctx || muted || ctx.state !== 'running') {
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

  function playOverload() {
    const ctx = ensureContext();
    if (!ctx || muted || ctx.state !== 'running') {
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

  function play(eventType, payload) {
    if (eventType === 'node_activated') {
      playClick();
      return;
    }

    if (eventType === 'energy_flow') {
      playFlow(payload);
      return;
    }

    if (eventType === 'overload') {
      playOverload();
    }
  }

  return {
    unlock,
    play,
    toggleMute,
    setMuted,
    isMuted
  };
}
