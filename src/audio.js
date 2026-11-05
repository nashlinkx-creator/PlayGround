/* ------------------------------------------------------------------ *
 *  Tiny WebAudio engine: no samples, everything synthesised on the fly.
 * ------------------------------------------------------------------ */

export class SkateAudio {
  constructor() {
    this.ctx = null
    this.muted = false
    this.ready = false
    this.rollGain = null
    this.rollFilter = null
    this.grindGain = null
    this.musicTimer = null
    this.step = 0
    this.nextStep = 0
    this.bpm = 104
  }

  init() {
    if (this.ready) {
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return
    }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0.9
    this.master.connect(ctx.destination)
    this.sfx = ctx.createGain()
    this.sfx.gain.value = 0.85
    this.sfx.connect(this.master)
    this.music = ctx.createGain()
    this.music.gain.value = 0.16
    this.music.connect(this.master)

    // reusable noise buffer
    const len = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    this.noiseBuffer = buffer

    // wheel roll
    const roll = ctx.createBufferSource()
    roll.buffer = buffer
    roll.loop = true
    const rollFilter = ctx.createBiquadFilter()
    rollFilter.type = 'bandpass'
    rollFilter.frequency.value = 700
    rollFilter.Q.value = 0.8
    const rollGain = ctx.createGain()
    rollGain.gain.value = 0
    roll.connect(rollFilter).connect(rollGain).connect(this.sfx)
    roll.start()
    this.rollGain = rollGain
    this.rollFilter = rollFilter

    // grind scrape
    const grind = ctx.createBufferSource()
    grind.buffer = buffer
    grind.loop = true
    const grindFilter = ctx.createBiquadFilter()
    grindFilter.type = 'bandpass'
    grindFilter.frequency.value = 2900
    grindFilter.Q.value = 2.4
    const grindGain = ctx.createGain()
    grindGain.gain.value = 0
    grind.connect(grindFilter).connect(grindGain).connect(this.sfx)
    grind.start()
    this.grindGain = grindGain
    this.grindFilter = grindFilter

    this.ready = true
    this.startMusic()
  }

  setMuted(muted) {
    this.muted = muted
    if (!this.ready) return
    this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.05)
  }

  update(dt, { grounded, speed, grinding }) {
    if (!this.ready) return
    const now = this.ctx.currentTime
    const targetRoll = grounded && !grinding ? Math.min(0.055, 0.008 + speed * 0.0028) : 0
    this.rollGain.gain.setTargetAtTime(targetRoll, now, 0.08)
    this.rollFilter.frequency.setTargetAtTime(420 + speed * 75, now, 0.1)
    this.grindGain.gain.setTargetAtTime(grinding ? 0.05 : 0, now, 0.05)
    if (this.grindFilter) this.grindFilter.frequency.setTargetAtTime(2500 + speed * 100, now, 0.1)
  }

  burst({ duration = 0.2, type = 'highpass', freq = 1200, q = 0.7, gain = 0.2, when = 0, sweep = null }) {
    if (!this.ready) return
    const ctx = this.ctx
    const t = ctx.currentTime + when
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.setValueAtTime(freq, t)
    filter.Q.value = q
    if (sweep) filter.frequency.exponentialRampToValueAtTime(Math.max(60, sweep), t + duration)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    src.connect(filter).connect(g).connect(this.sfx)
    src.start(t, Math.random() * 1.2)
    src.stop(t + duration + 0.02)
  }

  tone({ freq = 440, endFreq = null, duration = 0.2, type = 'sine', gain = 0.14, when = 0, attack = 0.005, dest = null }) {
    if (!this.ready) return
    const ctx = this.ctx
    const t = ctx.currentTime + when
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + duration)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(g).connect(dest || this.sfx)
    osc.start(t)
    osc.stop(t + duration + 0.03)
  }

  push() {
    this.burst({ duration: 0.18, type: 'bandpass', freq: 900, q: 0.9, gain: 0.11, sweep: 350 })
    this.tone({ freq: 130, endFreq: 70, duration: 0.09, type: 'triangle', gain: 0.035 })
  }

  ollie(power = 1) {
    this.tone({ freq: 220 + power * 40, endFreq: 82, duration: 0.14, type: 'triangle', gain: 0.12 })
    this.burst({ duration: 0.07, type: 'highpass', freq: 1400, gain: 0.16 })
  }

  land(strength = 1) {
    this.tone({ freq: 110, endFreq: 38, duration: 0.24, type: 'sine', gain: 0.2 * strength })
    this.burst({ duration: 0.16, type: 'lowpass', freq: 560, q: 0.6, gain: 0.18 * strength })
  }

  trick(type = 'kickflip', big = false) {
    const base = type === 'shoveit' ? 520 : type === 'heelflip' ? 900 : 780
    this.burst({ duration: big ? 0.34 : 0.22, type: 'bandpass', freq: base, q: 1.4, gain: 0.1, sweep: base * 2.6 })
    this.tone({ freq: base * 0.3, endFreq: base * 0.16, duration: 0.12, type: 'triangle', gain: 0.04 })
  }

  grind(on) {
    if (!this.ready) return
    if (on) {
      this.burst({ duration: 0.2, type: 'highpass', freq: 2200, gain: 0.13 })
      this.tone({ freq: 320, endFreq: 220, duration: 0.3, type: 'sawtooth', gain: 0.035 })
    }
  }

  cash(mult = 2) {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    for (let i = 0; i < Math.min(4, 1 + Math.floor(mult / 2)); i++) {
      this.tone({ freq: notes[i], duration: 0.22, type: 'triangle', gain: 0.1, when: i * 0.065 })
    }
  }

  bail() {
    this.burst({ duration: 0.5, type: 'lowpass', freq: 1600, q: 0.5, gain: 0.26, sweep: 180 })
    this.tone({ freq: 240, endFreq: 58, duration: 0.5, type: 'sawtooth', gain: 0.08 })
    this.tone({ freq: 90, endFreq: 30, duration: 0.4, type: 'sine', gain: 0.2 })
  }

  beep(final = false) {
    this.tone({ freq: final ? 880 : 660, duration: 0.16, type: 'square', gain: 0.055 })
  }

  go() {
    this.tone({ freq: 660, duration: 0.1, type: 'square', gain: 0.05 })
    this.tone({ freq: 990, duration: 0.22, type: 'square', gain: 0.05, when: 0.1 })
  }

  finish() {
    const notes = [783.99, 659.25, 523.25, 392]
    notes.forEach((f, i) => this.tone({ freq: f, duration: 0.28, type: 'triangle', gain: 0.1, when: i * 0.12 }))
    this.burst({ duration: 0.9, type: 'bandpass', freq: 900, gain: 0.06, sweep: 200 })
  }

  /* ---------------- music ---------------- */
  kick(t) {
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, t)
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.16)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
    osc.connect(g).connect(this.music)
    osc.start(t)
    osc.stop(t + 0.25)
  }

  snare(t) {
    const ctx = this.ctx
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const f = ctx.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 1500
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13)
    src.connect(f).connect(g).connect(this.music)
    src.start(t, Math.random())
    src.stop(t + 0.16)
  }

  hat(t, open = false) {
    const ctx = this.ctx
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const f = ctx.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 7000
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.19 : 0.05))
    src.connect(f).connect(g).connect(this.music)
    src.start(t, Math.random())
    src.stop(t + 0.24)
  }

  bass(t, freq) {
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(420, t)
    f.frequency.exponentialRampToValueAtTime(140, t + 0.2)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24)
    osc.connect(f).connect(g).connect(this.music)
    osc.start(t)
    osc.stop(t + 0.28)
  }

  startMusic() {
    if (!this.ready || this.musicTimer) return
    const stepDur = 60 / this.bpm / 4
    this.nextStep = this.ctx.currentTime + 0.1
    const bassLine = [55, 55, 82.4, 55, 73.4, 73.4, 61.7, 82.4]
    const schedule = () => {
      if (!this.ctx) return
      while (this.nextStep < this.ctx.currentTime + 0.25) {
        const s = this.step % 32
        const t = this.nextStep
        if (s % 4 === 0) this.kick(t)
        if (s === 8 || s === 24) this.snare(t)
        if (s === 14 || s === 30) this.snare(t)
        this.hat(t, s % 8 === 6)
        if (s % 2 === 0) this.bass(t, bassLine[(s / 2) % bassLine.length])
        this.nextStep += stepDur
        this.step++
      }
      this.musicTimer = setTimeout(schedule, 90)
    }
    schedule()
  }
}
