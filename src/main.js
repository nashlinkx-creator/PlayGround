import * as THREE from 'three'
import { createWorld } from './world.js'
import { createSkater } from './skater.js'
import { SkateAudio } from './audio.js'
import { ParticleSystem } from './effects.js'

/* ------------------------------------------------------------------ *
 *  THRASH PARK — 2 minute trick run
 * ------------------------------------------------------------------ */

const $ = id => document.getElementById(id)
const canvas = $('gl')
const isCoarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches || window.innerWidth <= 720

const ui = {
  hud: $('hud'),
  intro: $('intro'),
  results: $('results'),
  pause: $('pauseOverlay'),
  loader: $('loader'),
  score: $('score'),
  best: $('bestScore'),
  timer: $('timer'),
  timerPanel: $('timerPanel'),
  timerFill: $('timerFill'),
  comboPanel: $('comboPanel'),
  comboMult: $('comboMult'),
  comboBase: $('comboBase'),
  comboTricks: $('comboTricks'),
  trickPop: $('trickPop'),
  trickFeed: $('trickFeed'),
  balanceWrap: $('balanceWrap'),
  balanceMark: $('balanceMark'),
  speed: $('speedVal'),
  status: $('statusMsg'),
  countdown: $('countdown'),
  countNum: $('countNum'),
  touch: $('touch'),
  finalScore: $('finalScore'),
  newBest: $('newBest'),
  statBest: $('statBest'),
  statLanded: $('statLanded'),
  statCombo: $('statCombo'),
  statBails: $('statBails'),
  confetti: $('confetti'),
  soundBtn: $('soundBtn'),
  pauseBtn: $('pauseBtn'),
  startBtn: $('startBtn'),
  againBtn: $('againBtn'),
  menuBtn: $('menuBtn'),
  resumeBtn: $('resumeBtn'),
  quitBtn: $('quitBtn'),
}

/* fonts are needed by the procedural canvas textures */
try {
  await Promise.all([
    document.fonts.load('900 16px "Lato Park"'),
    document.fonts.load('700 16px "Lato Park"'),
  ])
} catch { /* fall back to system fonts */ }

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCoarse ? 1.6 : 2))
renderer.setSize(window.innerWidth, window.innerHeight, false)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
renderer.outputColorSpace = THREE.SRGBColorSpace
if (isCoarse) {
  renderer.shadowMap.type = THREE.PCFShadowMap
}

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 520)

const world = createWorld(scene)
if (isCoarse) {
  world.sun.shadow.mapSize.set(1024, 1024)
}
const skater = createSkater(world.skaterTextures.deck, world.skaterTextures.grip)
scene.add(skater.root)

const dust = new ParticleSystem(scene, { color: 0xdcc9a7, count: 150, gravity: 2.4, drag: 2.8 })
const sparks = new ParticleSystem(scene, { color: 0xffb13b, count: 200, gravity: 13, drag: 0.5, additive: true })
const audio = new SkateAudio()

/* ---------------- state ---------------- */
const game = {
  state: 'menu',
  score: 0,
  best: 0,
  time: 120,
  tricksLanded: 0,
  bails: 0,
  bestTrickName: '—',
  bestTrickPts: 0,
  biggestCombo: 0,
  newBest: false,
  finishTimer: 0,
  started: false,
  lastSecond: 120,
  countdown: 0,
  countdownShown: 0,
}

try {
  game.best = Number(localStorage.getItem('thrashpark.best') || 0) || 0
} catch { game.best = 0 }

const player = {
  x: 0, y: 0, z: 22.5,
  vx: 0, vy: 0, vz: 0,
  heading: Math.PI,
  speed: 0,
  grounded: true,
  air: false,
  airTime: 0,
  spinDeg: 0,
  spinTier: 0,
  flip: null,
  charging: false,
  charge: 0,
  manual: false,
  manualTime: 0,
  manualBalance: 0,
  manualBalanceVel: 0,
  grab: false,
  grabTime: 0,
  grabWarned: false,
  grind: null,
  bail: null,
  verticalSpeed: 0,
  pushing: false,
  pushTimer: 0,
  lean: 0,
  coyote: 0,
  groundInfo: null,
  lastGroundType: 'flat',
}

const combo = {
  active: false,
  points: 0,
  mult: 0,
  names: [],
  grace: 0,
}

const keys = new Set()
const touchInput = { x: 0, y: 0, active: false }
let touchGrab = false
let touchManual = false
let touchFlipCycle = 0
let menuTime = 0
let camHeading = Math.PI
let shake = 0
let finishFlash = 0
const camLook = new THREE.Vector3(0, 1.2, 0)
const tmpVec = new THREE.Vector3()

const GRAV = 26
const MAX_SPEED = 17.5
const PUSH = 8.2
const BRAKE = 9.5
const TURN_RATE = 2.35
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const format = n => Math.round(n).toLocaleString('en-US')

/* ---------------- UI helpers ---------------- */
let statusTimer = 0
function showStatus(text, ms = 1200) {
  ui.status.textContent = text
  ui.status.classList.add('show')
  clearTimeout(statusTimer)
  statusTimer = setTimeout(() => ui.status.classList.remove('show'), ms)
}

function feed(text, pts, tone = '') {
  const el = document.createElement('div')
  el.className = 'feed-item ' + tone
  el.innerHTML = `<span>${text}</span>${pts != null ? `<b>${format(pts)}</b>` : ''}`
  ui.trickFeed.appendChild(el)
  while (ui.trickFeed.children.length > 4) ui.trickFeed.firstChild.remove()
  setTimeout(() => el.remove(), 2800)
}

let popTimer = 0
function popTrick(name, pts) {
  ui.trickPop.innerHTML = `${name}<span class="pts">+${format(pts)}</span>`
  ui.trickPop.classList.remove('pop')
  void ui.trickPop.offsetWidth
  ui.trickPop.classList.add('pop')
  clearTimeout(popTimer)
  popTimer = setTimeout(() => ui.trickPop.classList.remove('pop'), 1200)
}

function updateScoreUI(flash = false) {
  ui.score.textContent = format(game.score)
  ui.best.textContent = 'BEST ' + format(game.best)
  if (flash) {
    ui.score.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.14)', color: '#ffd23f' }, { transform: 'scale(1)' }],
      { duration: 380, easing: 'cubic-bezier(.2,1.4,.4,1)' }
    )
  }
}

function updateComboUI() {
  if (combo.active) {
    ui.comboPanel.classList.add('show')
    ui.comboMult.textContent = 'x' + Math.max(1, combo.mult)
    ui.comboBase.textContent = format(combo.points)
    const names = combo.names.slice(-3)
    ui.comboTricks.textContent = names.length ? names.join('  ·  ') : 'KEEP IT ALIVE'
  } else {
    ui.comboPanel.classList.remove('show')
  }
}

function updateTimerUI() {
  const t = Math.max(0, game.time)
  const m = Math.floor(t / 60)
  const s = Math.ceil(t % 60)
  ui.timer.textContent = `${m}:${String(Math.min(59, s)).padStart(2, '0')}`
  ui.timerFill.style.transform = `scaleX(${clamp(t / 120, 0, 1)})`
  ui.timerPanel.classList.toggle('hurry', t <= 10.05)
}

/* ---------------- scoring ---------------- */
function addTrick(name, base, { mult = true, sound = true } = {}) {
  if (!combo.active) {
    combo.active = true
    combo.points = 0
    combo.mult = 0
    combo.names = []
  }
  combo.points += base
  if (mult) {
    combo.mult += 1
    combo.names.push(name)
    game.tricksLanded += 1
  }
  combo.grace = 1.0
  if (base > game.bestTrickPts) {
    game.bestTrickPts = base
    game.bestTrickName = name
  }
  popTrick(name, base)
  feed(name, base)
  updateComboUI()
  if (sound) audio.trick(name === 'SHOVE-IT' ? 'shoveit' : name === 'HEELFLIP' ? 'heelflip' : 'kickflip', combo.mult > 4)
}

function cashCombo(silent = false) {
  if (!combo.active) return 0
  const mult = Math.max(1, combo.mult)
  const gain = Math.round(combo.points * mult)
  game.score += gain
  game.biggestCombo = Math.max(game.biggestCombo, gain)
  combo.active = false
  combo.points = 0
  combo.mult = 0
  combo.names = []
  updateComboUI()
  updateScoreUI(true)
  if (!silent) {
    showStatus(`BANKED +${format(gain)}`, 1300)
    feed('COMBO BANKED', gain, 'cash')
    audio.cash(mult)
  }
  return gain
}

function loseCombo() {
  if (!combo.active) return
  combo.active = false
  combo.points = 0
  combo.mult = 0
  combo.names = []
  updateComboUI()
  showStatus('COMBO LOST', 900)
}

/* ---------------- player lifecycle ---------------- */
function resetPlayer() {
  const spawn = world.spawn
  player.x = spawn.x
  player.z = spawn.z
  player.heading = spawn.heading
  player.y = world.groundInfo(spawn.x, spawn.z).y
  player.vx = 0
  player.vz = 0
  player.vy = 0
  player.speed = 0
  player.grounded = true
  player.air = false
  player.airTime = 0
  player.spinDeg = 0
  player.spinTier = 0
  player.flip = null
  player.charging = false
  player.charge = 0
  player.manual = false
  player.grab = false
  player.grabTime = 0
  player.grabWarned = false
  player.grind = null
  player.bail = null
  player.verticalSpeed = 0
  player.pushing = false
  player.lean = 0
  player.groundInfo = world.groundInfo(player.x, player.z)
  player.lastGroundType = 'flat'
  skater.setBailReset()
  skater.root.position.set(player.x, player.y, player.z)
  skater.root.rotation.y = player.heading
}

function resetRunState() {
  game.score = 0
  game.time = 120
  game.tricksLanded = 0
  game.bails = 0
  game.bestTrickName = '—'
  game.bestTrickPts = 0
  game.biggestCombo = 0
  game.newBest = false
  game.finishTimer = 0
  game.lastSecond = 120
  combo.active = false
  combo.points = 0
  combo.mult = 0
  combo.names = []
  ui.trickFeed.innerHTML = ''
  ui.trickPop.classList.remove('pop')
  ui.comboPanel.classList.remove('show')
  ui.results.classList.add('hidden')
  ui.pause.classList.add('hidden')
  ui.countdown.classList.add('hidden')
  ui.confetti.innerHTML = ''
  resetPlayer()
  updateScoreUI()
  updateTimerUI()
}

function flashCount(text, go = false) {
  ui.countNum.textContent = text
  ui.countNum.className = ''
  void ui.countNum.offsetWidth
  ui.countNum.className = go ? 'go tick' : 'tick'
}

function beginRolling() {
  player.vx = Math.sin(player.heading) * 5.4
  player.vz = Math.cos(player.heading) * 5.4
  player.speed = 5.4
  game.state = 'running'
  game.lastSecond = 120
  showStatus('DROP IN!', 1500)
  audio.go()
}

function startRun() {
  audio.init()
  ui.intro.classList.add('hidden')
  ui.results.classList.add('hidden')
  ui.pause.classList.add('hidden')
  ui.hud.classList.add('show')
  ui.hud.classList.remove('hidden')
  if (isCoarse) {
    ui.touch.classList.remove('hidden')
  }
  resetRunState()
  ui.pauseBtn.disabled = false
  camHeading = player.heading
  const f = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading))
  camera.position.set(player.x - f.x * 6.2, player.y + 3.2, player.z - f.z * 6.2)
  camLook.set(player.x + f.x * 3, player.y + 1.3, player.z + f.z * 3)
  camera.lookAt(camLook)
  game.started = true
  game.countdown = 3
  game.countdownShown = 3
  game.state = 'countdown'
  ui.countdown.classList.remove('hidden')
  flashCount('3')
  audio.beep(false)
  audio.setMuted(audio.muted)
  updateScoreUI()
  updateTimerUI()
}

function updateCountdown(elapsed) {
  game.countdown -= elapsed
  const seconds = Math.ceil(Math.max(0, game.countdown))
  if (seconds > 0 && seconds !== game.countdownShown) {
    game.countdownShown = seconds
    flashCount(String(seconds))
    audio.beep(seconds === 1)
  }
  if (game.countdown <= 0) {
    ui.countdown.classList.add('hidden')
    beginRolling()
  }
}

function finishRun() {
  if (game.state !== 'running') return
  game.state = 'finished'
  game.finishTimer = 0
  game.time = 0
  game.lastSecond = 0
  player.charging = false
  player.charge = 0
  player.grab = false
  player.manual = false
  player.grind = null
  player.bail = null
  player.flip = null
  player.air = false
  player.grounded = true
  player.vx = 0
  player.vz = 0
  player.vy = 0
  player.y = world.groundInfo(player.x, player.z).y
  cashCombo(true)
  game.biggestCombo = Math.max(game.biggestCombo, 0)
  if (game.score > game.best) {
    game.newBest = true
    game.best = game.score
    try { localStorage.setItem('thrashpark.best', String(game.best)) } catch {}
  }
  updateScoreUI()
  updateTimerUI()
  game.lastSecond = 0
  audio.finish()
  audio.grind(false)
  ui.hud.classList.add('show')
  ui.hud.classList.remove('hidden')
  ui.timerPanel.classList.remove('hurry')
  ui.comboPanel.classList.remove('show')
  showStatus('TIME!', 1500)
  ui.pauseBtn.disabled = true
  cameraOrbitStart = player.heading + Math.PI
}

function showResults() {
  ui.finalScore.textContent = format(game.score)
  ui.statBest.textContent = game.bestTrickName
  ui.statLanded.textContent = String(game.tricksLanded)
  ui.statCombo.textContent = format(game.biggestCombo)
  ui.statBails.textContent = String(game.bails)
  ui.newBest.classList.toggle('hidden', !game.newBest)
  ui.results.classList.remove('hidden')
  ui.newBest.textContent = game.newBest ? 'NEW PERSONAL BEST' : ''
  if (game.newBest) {
    makeConfetti()
    audio.cash(6)
  }
  ui.againBtn.focus({ preventScroll: true })
}

function makeConfetti() {
  ui.confetti.innerHTML = ''
  const colors = ['#ff5a1f', '#ffd23f', '#12b8a6', '#f6e5c4', '#e8488b']
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('i')
    piece.style.left = Math.random() * 100 + '%'
    piece.style.background = colors[i % colors.length]
    piece.style.animationDuration = 2.4 + Math.random() * 2.6 + 's'
    piece.style.animationDelay = Math.random() * 1.4 + 's'
    piece.style.transform = `rotate(${Math.random() * 360}deg)`
    if (Math.random() > 0.6) {
      piece.style.width = '6px'
      piece.style.height = '6px'
      piece.style.borderRadius = '50%'
    }
    ui.confetti.appendChild(piece)
  }
}

function toMenu() {
  game.state = 'menu'
  game.started = false
  menuTime = 0
  ui.results.classList.add('hidden')
  ui.pause.classList.add('hidden')
  ui.hud.classList.remove('show')
  ui.intro.classList.remove('hidden')
  ui.touch.classList.add('hidden')
  resetRunState()
  resetPlayer()
  ui.finalScore.textContent = '0'
  ui.timerPanel.classList.remove('hurry')
  audio.grind(false)
  ui.pauseBtn.disabled = false
}

/* ---------------- input ---------------- */
const prevented = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'])

function steerInput() {
  let s = 0
  if (keys.has('KeyD') || keys.has('ArrowRight')) s += 1
  if (keys.has('KeyA') || keys.has('ArrowLeft')) s -= 1
  if (touchInput.active) s += touchInput.x
  return clamp(s, -1, 1)
}
function forwardInput() {
  let f = 0
  if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1
  if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1
  if (touchInput.active) f += -touchInput.y
  return clamp(f, -1, 1)
}
function grabHeld() {
  return keys.has('KeyG') || touchGrab
}
function manualHeld() {
  return keys.has('KeyC') || touchManual
}

function onJumpPress() {
  if (game.state === 'menu') { startRun(); return }
  if (game.state !== 'running' || player.bail) return
  if (player.grind) { grindJump(); return }
  if (player.grounded) {
    if (player.manual) endManual()
    if (!player.charging) {
      player.charging = true
      player.charge = 0
    }
  }
}

function onJumpRelease() {
  if (game.state !== 'running' || player.bail) return
  if (player.charging) {
    doJump(Math.max(0.12, player.charge))
  }
}

function doJump(charge = 0.2) {
  if (!player.grounded || player.bail) return
  player.charging = false
  player.charge = 0
  const info = world.groundInfo(player.x, player.z)
  let power = 6.2 + charge * 3.4
  if (info.type === 'quarter' && player.y > 1.2) power += 1.2
  if (player.manual) endManual()
  player.grounded = false
  player.air = true
  player.vy = power
  player.y += 0.04
  player.airTime = 0
  player.spinDeg = 0
  player.spinTier = 0
  player.grabWarned = false
  player.verticalSpeed = 0
  audio.ollie(charge)
  for (let i = 0; i < 5; i++) {
    dust.spawn(player.x + (Math.random() - 0.5) * 0.5, player.y + 0.03, player.z + (Math.random() - 0.5) * 0.5, {
      vx: (Math.random() - 0.5) * 1.4, vy: 0.3 + Math.random() * 0.7, vz: (Math.random() - 0.5) * 1.4,
      size: 0.18 + Math.random() * 0.2, life: 0.4 + Math.random() * 0.3, alpha: 0.4,
    })
  }
}

function startFlip(type) {
  if (!player.air || player.flip) return
  const data = {
    kickflip: { name: 'KICKFLIP', pts: 150, duration: 0.38 },
    heelflip: { name: 'HEELFLIP', pts: 150, duration: 0.38 },
    shoveit: { name: 'POP SHOVE-IT', pts: 125, duration: 0.34 },
  }[type]
  if (!data) return
  player.flip = { type, progress: 0, duration: data.duration, name: data.name, pts: data.pts }
  audio.trick(type)
}

function onTrickKey(type) {
  if (game.state !== 'running' || player.bail) return
  if (player.grind) {
    grindJump()
    if (player.air) startFlip(type)
    return
  }
  if (player.grounded) {
    if (player.charging) { player.charging = false; player.charge = 0 }
    doJump(0.42)
  }
  if (player.air) startFlip(type)
}

function grindJump() {
  if (!player.grind) return
  const g = player.grind
  audio.grind(false)
  audio.ollie(0.5)
  player.vx = (g.rail.bx - g.rail.ax) / g.len * g.dir * g.speed
  player.vz = (g.rail.bz - g.rail.az) / g.len * g.dir * g.speed
  player.grind = null
  player.grounded = false
  player.air = true
  player.vy = 6.4
  player.y += 0.05
  player.airTime = 0
  player.spinDeg = 0
  player.spinTier = 0
  player.grabWarned = false
  for (let i = 0; i < 8; i++) {
    sparks.spawn(player.x, player.y, player.z, {
      vx: (Math.random() - 0.5) * 3, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 3,
      size: 0.05 + Math.random() * 0.06, life: 0.2 + Math.random() * 0.3, alpha: 1,
    })
  }
}

/* keyboard */
window.addEventListener('keydown', e => {
  if (prevented.has(e.code)) e.preventDefault()
  if (e.repeat) return
  keys.add(e.code)
  if (game.state === 'menu' && (e.code === 'Enter' || e.code === 'Space')) {
    startRun()
    return
  }
  if (e.code === 'Space') onJumpPress()
  if (e.code === 'KeyJ') onTrickKey('kickflip')
  if (e.code === 'KeyK') onTrickKey('heelflip')
  if (e.code === 'KeyL') onTrickKey('shoveit')
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause()
  if (e.code === 'KeyM') toggleMute()
  if (e.code === 'KeyR' && game.state === 'finished') startRun()
  if (e.code === 'Enter' && game.state === 'finished') startRun()
})

window.addEventListener('keyup', e => {
  keys.delete(e.code)
  if (e.code === 'Space') onJumpRelease()
})

window.addEventListener('blur', () => {
  keys.clear()
  touchInput.active = false
  touchInput.x = 0
  touchInput.y = 0
  if (player.charging) {
    player.charging = false
    player.charge = 0
  }
})

/* touch joystick */
const stick = $('stick')
const stickKnob = $('stickKnob')
let stickPointer = null
function stickCenter() {
  const r = stick.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, radius: r.width / 2 }
}
function updateStick(e) {
  const c = stickCenter()
  let dx = e.clientX - c.x
  let dy = e.clientY - c.y
  const len = Math.hypot(dx, dy) || 1
  const max = c.radius * 0.62
  const cl = Math.min(max, len)
  dx = dx / len * cl
  dy = dy / len * cl
  touchInput.x = clamp(dx / max, -1, 1)
  touchInput.y = clamp(dy / max, -1, 1)
  touchInput.active = true
  stickKnob.style.transform = `translate(${dx}px, ${dy}px)`
}
stick.addEventListener('pointerdown', e => {
  stickPointer = e.pointerId
  stick.setPointerCapture(e.pointerId)
  updateStick(e)
  e.preventDefault()
})
stick.addEventListener('pointermove', e => {
  if (stickPointer === e.pointerId) updateStick(e)
})
function releaseStick(e) {
  if (stickPointer !== e.pointerId) return
  stickPointer = null
  touchInput.active = false
  touchInput.x = 0
  touchInput.y = 0
  stickKnob.style.transform = 'translate(0px, 0px)'
}
stick.addEventListener('pointerup', releaseStick)
stick.addEventListener('pointercancel', releaseStick)

/* touch buttons */
for (const btn of document.querySelectorAll('.tbtn')) {
  const action = btn.dataset.action
  btn.addEventListener('pointerdown', e => {
    e.preventDefault()
    btn.setPointerCapture(e.pointerId)
    btn.classList.add('on')
    if (action === 'ollie') onJumpPress()
    else if (action === 'flip') {
      const types = ['kickflip', 'heelflip', 'shoveit']
      touchFlipCycle = (touchFlipCycle + 1) % types.length
      onTrickKey(types[(touchFlipCycle + 2) % types.length])
    } else if (action === 'grab') {
      touchGrab = true
    } else if (action === 'manual') {
      touchManual = true
    }
  })
  const up = e => {
    e.preventDefault()
    btn.classList.remove('on')
    if (action === 'ollie') onJumpRelease()
    else if (action === 'grab') touchGrab = false
    else if (action === 'manual') touchManual = false
  }
  btn.addEventListener('pointerup', up)
  btn.addEventListener('pointercancel', up)
  btn.addEventListener('pointerleave', e => {
    if (e.buttons === 0) return
    if (action === 'grab') touchGrab = false
    if (action === 'manual') touchManual = false
  })
}

/* UI buttons */
ui.startBtn.addEventListener('click', startRun)
ui.againBtn.addEventListener('click', startRun)
ui.menuBtn.addEventListener('click', toMenu)
ui.resumeBtn.addEventListener('click', togglePause)
ui.quitBtn.addEventListener('click', endRunEarly)
ui.soundBtn.addEventListener('click', toggleMute)
ui.pauseBtn.addEventListener('click', togglePause)

function toggleMute() {
  audio.init()
  audio.setMuted(!audio.muted)
  ui.soundBtn.classList.toggle('off', audio.muted)
  ui.soundBtn.setAttribute('aria-label', audio.muted ? 'Enable sound' : 'Mute sound')
}

function togglePause() {
  if (game.state === 'running') {
    game.state = 'paused'
    ui.pause.classList.remove('hidden')
    audio.grind(false)
    if (player.charging) { player.charging = false; player.charge = 0 }
  } else if (game.state === 'paused') {
    game.state = 'running'
    ui.pause.classList.add('hidden')
  }
}

function endRunEarly() {
  if (game.state !== 'paused') return
  game.state = 'running'
  ui.pause.classList.add('hidden')
  finishRun()
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'running') togglePause()
})

/* ---------------- physics ---------------- */
function updateCharge(dt) {
  if (!player.charging) return
  if (!player.grounded) { player.charging = false; player.charge = 0; return }
  player.charge = Math.min(1, player.charge + dt * 1.9)
}

function updateGrounded(dt) {
  const p = player
  const info = world.groundInfo(p.x, p.z)
  p.groundInfo = info
  const steer = steerInput()
  const fwd = forwardInput()

  p.lean += ((steer * (p.manual ? 0.25 : 0.5)) - p.lean) * Math.min(1, dt * 8)

  // steering changes facing; velocity follows with grip
  const turnScale = p.manual ? 0.58 : 1
  p.heading += steer * TURN_RATE * turnScale * dt * (0.55 + Math.min(1, p.speed / 12) * 0.6)

  let sp = Math.hypot(p.vx, p.vz)
  if (sp > 0.35) {
    const velAngle = Math.atan2(p.vx, p.vz)
    let diff = p.heading - velAngle
    diff = Math.atan2(Math.sin(diff), Math.cos(diff))
    const grip = p.manual ? 3.2 : 6.5
    const na = velAngle + diff * (1 - Math.exp(-grip * dt))
    p.vx = Math.sin(na) * sp
    p.vz = Math.cos(na) * sp
  }

  // pushing
  p.pushing = false
  if (fwd > 0.18) {
    if (sp < MAX_SPEED) {
      p.vx += Math.sin(p.heading) * PUSH * fwd * dt
      p.vz += Math.cos(p.heading) * PUSH * fwd * dt
      p.pushing = true
      p.pushTimer -= dt
      if (p.pushTimer <= 0) {
        p.pushTimer = 0.36 / Math.max(0.4, fwd)
        audio.push()
      }
    }
  } else {
    p.pushTimer = 0
  }
  if (fwd < -0.15) {
    const dec = BRAKE * Math.min(1, -fwd) * dt
    if (sp > 0.01) {
      const ns = Math.max(0, sp - dec)
      p.vx *= ns / sp
      p.vz *= ns / sp
    }
  }

  // slope gravity along the direction of travel
  sp = Math.hypot(p.vx, p.vz)
  if (sp > 0.3) {
    const dx = p.vx / sp, dz = p.vz / sp
    const ahead = world.groundInfo(p.x + dx * 0.9, p.z + dz * 0.9).y
    const behind = world.groundInfo(p.x - dx * 0.9, p.z - dz * 0.9).y
    const grade = clamp((ahead - behind) / 1.8, -3.2, 3.2)
    const slopeAccel = -GRAV * 0.66 * grade / Math.sqrt(1 + grade * grade)
    p.vx += dx * slopeAccel * dt
    p.vz += dz * slopeAccel * dt
  } else {
    // stalled on a transition: let gravity roll the board back downhill
    const gi = world.groundInfo(p.x, p.z)
    const gx = gi.normal.x, gz = gi.normal.z
    const gm = Math.hypot(gx, gz)
    if (gm > 0.035) {
      const a = GRAV * 0.62 * gm
      p.vx += (gx / gm) * a * dt
      p.vz += (gz / gm) * a * dt
    }
  }

  // rolling resistance
  sp = Math.hypot(p.vx, p.vz)
  if (sp > 0.01) {
    const drag = (p.charging ? 2.6 : 0.55) * dt + (p.manual ? 0.4 : 0) * dt
    const ns = Math.max(0, sp - drag)
    p.vx *= ns / sp
    p.vz *= ns / sp
    if (p.manual && ns < 2.3) endManual()
  }
  sp = Math.min(MAX_SPEED + 4, Math.hypot(p.vx, p.vz))
  if (sp > 0.01) {
    const cur = Math.hypot(p.vx, p.vz)
    if (sp !== cur) { p.vx *= sp / cur; p.vz *= sp / cur }
  }
  p.speed = Math.hypot(p.vx, p.vz)

  // integrate
  const oldY = p.y
  let nx = p.x + p.vx * dt
  let nz = p.z + p.vz * dt
  const b = world.bounds
  if (nx < b.x0) { nx = b.x0; p.vx = Math.max(0, p.vx) * 0.2 }
  if (nx > b.x1) { nx = b.x1; p.vx = Math.min(0, p.vx) * 0.2 }
  if (nz < b.z0) { nz = b.z0; p.vz = Math.max(0, p.vz) * 0.2 }
  if (nz > b.z1) { nz = b.z1; p.vz = Math.min(0, p.vz) * 0.2 }

  const newInfo = world.groundInfo(nx, nz)
  const rise = newInfo.y - p.y
  const limit = 8.5 * dt + 0.24
  const steep = newInfo.type === 'quarter' || newInfo.type === 'bowl' || newInfo.type === 'wedge'
  if (rise > limit && !steep) {
    // vertical face: stop at the wall
    p.vx *= 0.08
    p.vz *= 0.08
    p.verticalSpeed = 0
    p.y = info.y
    if (Math.abs(rise) > 0.6) {
      for (let i = 0; i < 6; i++) {
        dust.spawn(nx, p.y + 0.3, nz, {
          vx: (Math.random() - 0.5) * 1.6, vy: Math.random() * 1.2, vz: (Math.random() - 0.5) * 1.6,
          size: 0.2 + Math.random() * 0.3, life: 0.4 + Math.random() * 0.3, alpha: 0.4,
        })
      }
    }
    return
  }

  const drop = p.y - newInfo.y
  const typeChanged = newInfo.type !== p.lastGroundType
  if (typeChanged && drop > 0.34) {
    // leaving a lip, ledge or ramp edge
    p.x = nx
    p.z = nz
    if (p.verticalSpeed > 1.3) {
      playerAirborne(clamp(p.verticalSpeed * 1.04, 2.4, 13.5), oldY)
    } else {
      playerAirborne(0, oldY)
    }
    return
  }

  p.x = nx
  p.z = nz
  p.y = newInfo.y
  p.verticalSpeed = dt > 0 ? (p.y - oldY) / dt : 0
  p.lastGroundType = newInfo.type
  if (p.manual) updateManual(dt)
}

function playerAirborne(vy, fromY) {
  const p = player
  p.grounded = false
  p.air = true
  p.vy = vy
  p.y = fromY
  p.airTime = 0
  p.spinDeg = 0
  p.spinTier = 0
  p.grabWarned = false
  p.verticalSpeed = 0
  p.lastGroundType = 'air'
  if (vy > 5) audio.ollie(0.6)
}

function updateAir(dt) {
  const p = player
  p.airTime += dt
  const steer = steerInput()

  // spins are free in the air
  if (Math.abs(steer) > 0.02) {
    const delta = steer * 5.4 * dt
    p.heading += delta
    p.spinDeg += Math.abs(delta) * 180 / Math.PI
    while (p.spinTier < 5 && p.spinDeg >= 180 * (p.spinTier + 1)) {
      p.spinTier += 1
      const deg = p.spinTier * 180
      const pts = [0, 130, 260, 380, 540, 720][p.spinTier]
      addTrick(`${deg} SPIN`, pts)
    }
  }

  // flip progression
  if (p.flip) {
    p.flip.progress += dt / p.flip.duration
    if (p.flip.progress >= 1) {
      addTrick(p.flip.name, p.flip.pts)
      p.flip = null
    }
  }

  // grab
  if (grabHeld()) {
    if (!p.grab) {
      p.grab = true
      p.grabTime = 0
      p.grabWarned = false
      addTrick('INDY GRAB', 100)
      showStatus('GRAB! RELEASE BEFORE LANDING', 1000)
    }
    p.grabTime += dt
    combo.points += 36 * dt
    combo.grace = 1
    if (combo.active) updateComboUI()
  } else if (p.grab) {
    p.grab = false
  }

  // air drag + gravity
  const drag = Math.exp(-0.22 * dt)
  p.vx *= drag
  p.vz *= drag
  p.vy -= GRAV * dt
  p.x += p.vx * dt
  p.y += p.vy * dt
  p.z += p.vz * dt
  p.speed = Math.hypot(p.vx, p.vz)

  const b = world.bounds
  if (p.x < b.x0) { p.x = b.x0; p.vx = Math.abs(p.vx) * 0.15 }
  if (p.x > b.x1) { p.x = b.x1; p.vx = -Math.abs(p.vx) * 0.15 }
  if (p.z < b.z0) { p.z = b.z0; p.vz = Math.abs(p.vz) * 0.15 }
  if (p.z > b.z1) { p.z = b.z1; p.vz = -Math.abs(p.vz) * 0.15 }

  // rails take priority over the ground
  if (p.vy <= 0.8 && tryStartGrind()) return

  const info = world.groundInfo(p.x, p.z)
  if (p.y <= info.y + 0.015 && p.vy <= 0) {
    land(info)
    return
  }

  // near-ground warning for grabs
  if (p.grab && !p.grabWarned && p.vy < 0 && p.y - info.y < 1.5) {
    p.grabWarned = true
    showStatus('RELEASE THE GRAB!', 700)
    audio.beep(false)
  }
}

const RAIL_TOLERANCE = 0.82

function railDistance(rail, x, z) {
  const dx = rail.bx - rail.ax
  const dz = rail.bz - rail.az
  const len2 = dx * dx + dz * dz
  let t = ((x - rail.ax) * dx + (z - rail.az) * dz) / len2
  t = clamp(t, 0, 1)
  const px = rail.ax + dx * t
  const pz = rail.az + dz * t
  return { dist: Math.hypot(x - px, z - pz), t, len: Math.sqrt(len2) }
}

function tryStartGrind() {
  const p = player
  if (p.flip && p.flip.progress < 0.85) return false
  let best = null
  for (const rail of world.rails) {
    if (p.y < rail.y - 0.62 || p.y > rail.y + 0.42) continue
    const d = railDistance(rail, p.x, p.z)
    if (d.dist < RAIL_TOLERANCE && (!best || d.dist < best.d.dist)) best = { rail, d }
  }
  if (!best) return false
  startGrind(best.rail, best.d)
  return true
}

function startGrind(rail, d) {
  const p = player
  if (p.flip && p.flip.progress < 0.9) {
    bail('flip')
    return
  }
  const dx = (rail.bx - rail.ax) / d.len
  const dz = (rail.bz - rail.az) / d.len
  const dot = p.vx * dx + p.vz * dz
  const dir = dot >= 0 ? 1 : -1
  p.grind = {
    rail,
    dir,
    t: d.t,
    len: d.len,
    speed: Math.max(5.2, Math.min(18, Math.hypot(p.vx, p.vz) * 0.92)),
    balance: 0,
    balanceVel: (Math.random() - 0.5) * 1.1,
    seed: Math.random() * 8,
    points: 0,
    railName: rail.name || 'GRIND',
  }
  p.flip = null
  p.grab = false
  p.manual = false
  p.grounded = false
  p.air = false
  p.vy = 0
  p.x = rail.ax + (rail.bx - rail.ax) * d.t
  p.z = rail.az + (rail.bz - rail.az) * d.t
  p.y = rail.y + 0.045
  p.vx = dx * dir * Math.min(18, p.grind.speed)
  p.vz = dz * dir * Math.min(18, p.grind.speed)
  p.speed = p.grind.speed
  p.heading = Math.atan2(p.vx, p.vz)
  p.airTime = 0
  p.spinDeg = 0
  p.spinTier = 0
  p.grabWarned = false
  const names = rail.kind === 'coping' ? 'COPING GRIND' : rail.kind === 'ledge' ? '5-0 GRIND' : '50-50 GRIND'
  addTrick(names, 130)
  feed(p.grind.railName, null, 'rail')
  audio.grind(true)
  audio.land(0.6)
  showStatus(rail.kind === 'coping' ? 'VERT GRIND' : 'GRIND! BALANCE WITH A/D', 1200)
  shake = Math.max(shake, 0.35)
}

function updateGrind(dt) {
  const p = player
  const g = p.grind
  if (!g) return
  const steer = steerInput()
  g.t += g.dir * g.speed * dt / g.len
  if (g.t < 0.004 || g.t > 0.996) {
    endGrind(g.t > 0.5)
    return
  }
  p.x = g.rail.ax + (g.rail.bx - g.rail.ax) * g.t
  p.z = g.rail.az + (g.rail.bz - g.rail.az) * g.t
  p.y = g.rail.y + 0.045
  g.speed = Math.max(3.5, g.speed - 0.65 * dt)
  const dx = (g.rail.bx - g.rail.ax) / g.len
  const dz = (g.rail.bz - g.rail.az) / g.len
  p.vx = dx * g.dir * g.speed
  p.vz = dz * g.dir * g.speed
  p.heading = Math.atan2(p.vx, p.vz)
  p.speed = g.speed
  p.lean += (steer * 0.5 - p.lean) * Math.min(1, dt * 8)

  // balance minigame: keep the marker centred with A/D
  g.balanceVel += (Math.sin(performance.now() * 0.0035 + g.seed) * 0.55 + steer * 2.7) * dt
  g.balanceVel *= 1 - 1.5 * dt
  g.balance += g.balanceVel * dt
  if (Math.abs(g.balance) > 1) {
    bail('balance')
    return
  }
  combo.points += 55 * dt
  combo.grace = 1
  if (combo.active) updateComboUI()

  // sparks
  const sparkCount = Math.random() < dt * 70 ? 3 : 1
  for (let i = 0; i < sparkCount; i++) {
    sparks.spawn(p.x + (Math.random() - 0.5) * 0.4, p.y + 0.02, p.z + (Math.random() - 0.5) * 0.4, {
      vx: -dx * g.dir * (1 + Math.random() * 3) + (Math.random() - 0.5) * 1.5,
      vy: 0.3 + Math.random() * 2.2,
      vz: -dz * g.dir * (1 + Math.random() * 3) + (Math.random() - 0.5) * 1.5,
      size: 0.035 + Math.random() * 0.055,
      life: 0.18 + Math.random() * 0.3,
      alpha: 1,
    })
  }
  if (Math.random() < dt * 9) dust.spawn(p.x, p.y - 0.1, p.z, { vx: 0, vy: 0.2, vz: 0, size: 0.18, life: 0.5, alpha: 0.3 })
}

function endGrind(atEnd) {
  const p = player
  const g = p.grind
  if (!g) return
  audio.grind(false)
  p.vx = (g.rail.bx - g.rail.ax) / g.len * g.dir * g.speed
  p.vz = (g.rail.bz - g.rail.az) / g.len * g.dir * g.speed
  p.grind = null
  p.grounded = false
  p.air = true
  p.vy = atEnd ? 4.4 : 1.2
  p.y += 0.05
  p.airTime = 0
  p.spinDeg = 0
  p.spinTier = 0
  p.grabWarned = false
}

function updateManual(dt) {
  const p = player
  if (!p.manual) return
  p.manualTime += dt
  const steer = steerInput()
  p.manualBalanceVel += (Math.sin(performance.now() * 0.0025 + 1.3) * 0.38 + steer * 2.4) * dt
  p.manualBalanceVel *= 1 - 2.0 * dt
  p.manualBalance += p.manualBalanceVel * dt
  if (Math.abs(p.manualBalance) > 1.38) {
    bail('balance')
    return
  }
  combo.points += 34 * dt
  combo.grace = 1
  if (combo.active) updateComboUI()
  p.lean += (steer * 0.4 - p.lean) * Math.min(1, dt * 8)
  if (Math.random() < dt * 7) {
    dust.spawn(p.x, p.y + 0.02, p.z, { vx: (Math.random() - 0.5) * 0.6, vy: 0.1, vz: (Math.random() - 0.5) * 0.6, size: 0.16, life: 0.35, alpha: 0.25 })
  }
}

function startManual() {
  const p = player
  if (p.manual || !p.grounded || p.grind || p.speed < 2.2) return
  p.manual = true
  p.manualTime = 0
  p.manualBalance = 0
  p.manualBalanceVel = (Math.random() - 0.5) * 0.7
  addTrick('MANUAL', 100)
  showStatus('MANUAL! HOLD C · BALANCE WITH A/D', 1400)
}

function endManual() {
  player.manual = false
  player.manualBalance = 0
  player.manualBalanceVel = 0
}

function land(info) {
  const p = player
  const impact = clamp(-p.vy / 12, 0.15, 1.4)
  p.y = info.y
  p.grounded = true
  p.air = false
  p.vy = 0
  p.verticalSpeed = 0
  p.airTime = p.airTime || 0

  // bail conditions
  if (p.grab) {
    bail('grab')
    return
  }
  if (p.flip && p.flip.progress < 0.88) {
    bail('flip')
    return
  }
  if (p.flip) {
    addTrick(p.flip.name, p.flip.pts)
    p.flip = null
  }

  if (p.airTime > 0.62) {
    addTrick(p.airTime > 1.15 ? 'BIG AIR' : 'AIR', 55 + Math.round(p.airTime * 75))
  }

  // landing style
  if (Math.hypot(p.vx, p.vz) > 1) {
    p.heading = Math.atan2(p.vx, p.vz)
  }
  p.lastGroundType = info.type
  p.groundInfo = info
  p.airTime = 0
  p.spinDeg = 0
  p.spinTier = 0
  player.grabWarned = false
  audio.land(impact)
  shake = Math.max(shake, clamp(impact * 0.6, 0.15, 0.9))
  dust.burst(player.x, player.y + 0.04, player.z, Math.round(10 + impact * 12), 1.8 + impact, { up: 0.4, size: 0.24, alpha: 0.5, life: 0.75 })
  if (impact > 0.65) {
    showStatus('STOMPED IT', 700)
  }
  if (manualHeld() && Math.hypot(p.vx, p.vz) > 2.2) startManual()
}

function bail(reason) {
  const p = player
  if (p.bail || game.state !== 'running') return
  p.bail = { t: 0, duration: 1.4, reason }
  p.flip = null
  p.grab = false
  p.manual = false
  p.grind = null
  p.charging = false
  p.charge = 0
  p.grounded = false
  p.air = true
  p.vy = Math.max(p.vy, 2.4)
  p.y += 0.04
  game.bails += 1
  loseCombo()
  audio.bail()
  audio.grind(false)
  shake = 1.2
  dust.burst(p.x, p.y + 0.1, p.z, 26, 2.8, { up: 1.5, size: 0.35, alpha: 0.6, life: 1 })
  const messages = {
    grab: 'BAIL! LET GO OF THE GRAB',
    flip: 'BAIL! FLIP WASN\'T LANDED',
    balance: 'BAIL! LOST BALANCE',
  }
  showStatus(messages[reason] || 'BAIL!', 1600)
  feed('BAIL', null, 'bail')
}

function updateBail(dt) {
  const p = player
  const b = p.bail
  b.t += dt
  p.vy -= GRAV * dt
  p.x += p.vx * dt
  p.y += p.vy * dt
  p.z += p.vz * dt
  p.vx *= Math.exp(-1.3 * dt)
  p.vz *= Math.exp(-1.3 * dt)
  const info = world.groundInfo(p.x, p.z)
  if (p.y <= info.y) {
    p.y = info.y
    p.vy = 0
    p.vx *= Math.exp(-5 * dt)
    p.vz *= Math.exp(-5 * dt)
    if (Math.random() < dt * 30) {
      dust.spawn(p.x, p.y + 0.06, p.z, {
        vx: (Math.random() - 0.5) * 1.5, vy: 0.3, vz: (Math.random() - 0.5) * 1.5,
        size: 0.24, life: 0.5, alpha: 0.35,
      })
    }
  }
  p.speed = Math.hypot(p.vx, p.vz)
  if (b.t >= b.duration) {
    p.bail = null
    p.grounded = true
    p.air = false
    p.flip = null
    p.grab = false
    p.manual = false
    p.grind = null
    p.vy = 0
    p.vx = 0
    p.vz = 0
    p.y = world.groundInfo(p.x, p.z).y
    p.verticalSpeed = 0
    p.airTime = 0
    p.spinDeg = 0
    p.spinTier = 0
    skater.setBailReset()
    if (Math.hypot(p.x, p.z) < 1) { p.x = 0; p.z = 22.5 }
  }
}

function updatePlayer(dt, realDt = dt) {
  const p = player
  updateCharge(dt)
  if (p.bail) {
    updateBail(dt)
  } else if (p.grind) {
    updateGrind(dt)
  } else if (p.grounded) {
    // grab only works in the air
    if (p.grab) p.grab = false
    updateGrounded(dt)
    if (manualHeld() && !p.charging && !p.manual && p.speed > 2.2) startManual()
    if (!manualHeld() && p.manual) endManual()
  } else {
    updateAir(dt)
  }

  // keep the combo window alive while doing something stylish
  if (combo.active) {
    if (p.air || p.grind || p.manual || p.charging) {
      combo.grace = 0.95
    } else {
      combo.grace -= dt
      if (combo.grace <= 0) cashCombo()
    }
  }

  // timer
  if (game.state === 'running') {
    game.time -= realDt
    if (game.time <= 0) {
      game.time = 0
      updateTimerUI()
      finishRun()
      return
    }
    const sec = Math.ceil(game.time)
    if (sec !== game.lastSecond) {
      game.lastSecond = sec
      if (sec <= 10 && sec > 0) audio.beep(sec <= 3)
    }
    updateTimerUI()
  }
}

/* ---------------- camera ---------------- */
let cameraOrbitStart = 0

function updateCamera(dt) {
  if (game.state === 'menu') {
    menuTime += dt
    const a = 0.78 + menuTime * 0.055
    const r = 40
    camera.position.set(Math.sin(a) * r, 15.5 + Math.sin(menuTime * 0.24) * 1.4, Math.cos(a) * r - 2)
    camLook.set(0, 1.6, -2)
    camera.lookAt(camLook)
    camera.fov += (56 - camera.fov) * Math.min(1, dt * 3)
    camera.updateProjectionMatrix()
    return
  }

  if (game.state === 'finished') {
    const p = player
    const a = cameraOrbitStart + game.finishTimer * 0.35
    const r = 8.5
    camera.position.set(p.x + Math.sin(a) * r, p.y + 4.2 + Math.sin(game.finishTimer * 0.5) * 0.3, p.z + Math.cos(a) * r)
    camLook.set(p.x, p.y + 1.15, p.z)
    camera.lookAt(camLook)
    camera.fov += (50 - camera.fov) * Math.min(1, dt * 2)
    camera.updateProjectionMatrix()
    return
  }

  const p = player
  camHeading += Math.atan2(Math.sin(p.heading - camHeading), Math.cos(p.heading - camHeading)) * (1 - Math.exp(-dt * (p.air ? 2.2 : 4.2)))
  const fx = Math.sin(camHeading)
  const fz = Math.cos(camHeading)
  const speedRatio = clamp(p.speed / MAX_SPEED, 0, 1)
  const dist = 6.1 + speedRatio * 1.35
  const height = 3.15 + speedRatio * 0.45
  const desiredX = p.x - fx * dist
  const desiredZ = p.z - fz * dist
  const desiredY = p.y + height
  const k = 1 - Math.exp(-dt * 6.2)
  camera.position.x += (desiredX - camera.position.x) * k
  camera.position.y += (desiredY - camera.position.y) * k * (p.air ? 0.7 : 1)
  camera.position.z += (desiredZ - camera.position.z) * k
  // keep the camera inside the valley
  camera.position.x = clamp(camera.position.x, -39, 39)
  camera.position.z = clamp(camera.position.z, -39, 39)
  if (camera.position.y < 1.1) camera.position.y = 1.1

  if (shake > 0.001) {
    camera.position.x += (Math.random() - 0.5) * shake * 0.28
    camera.position.y += (Math.random() - 0.5) * shake * 0.22
    camera.position.z += (Math.random() - 0.5) * shake * 0.28
    shake *= Math.exp(-dt * 5.5)
  }

  const lookAhead = 3.2 + speedRatio * 2.2
  const targetX = p.x + fx * lookAhead
  const targetY = p.y + 1.35
  const targetZ = p.z + fz * lookAhead
  const lk = 1 - Math.exp(-dt * 8)
  camLook.x += (targetX - camLook.x) * lk
  camLook.y += (targetY - camLook.y) * lk
  camLook.z += (targetZ - camLook.z) * lk
  camera.lookAt(camLook)

  const targetFov = 56 + speedRatio * 9 + (p.air ? 2 : 0)
  camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 3)
  camera.updateProjectionMatrix()
}

/* ---------------- per-frame visuals ---------------- */
function syncSkater(dt) {
  const p = player
  skater.root.position.set(p.x, p.y, p.z)
  skater.root.rotation.y = p.heading
  const steer = steerInput()
  let balance = 0
  if (p.grind) balance = p.grind.balance
  else if (p.manual) balance = p.manualBalance
  skater.update(dt, {
    grounded: p.grounded || !!p.grind,
    air: p.air && !p.grind && !p.bail,
    crouch: p.charging ? 0.35 + p.charge * 0.65 : (p.manual ? 0.34 : 0.13),
    grab: p.grab,
    grind: !!p.grind,
    manual: p.manual,
    bail: !!p.bail,
    flip: p.flip,
    pushing: p.pushing && p.grounded,
    lean: p.lean + (p.grounded ? steer * 0.12 : 0),
    balance,
    spinning: p.air ? steer * 0.2 : 0,
  })
}

function syncHud() {
  const p = player
  if (p.grind || p.manual) {
    ui.balanceWrap.classList.remove('hidden')
    const bal = p.grind ? p.grind.balance : p.manualBalance
    ui.balanceMark.style.left = `${50 + clamp(bal, -1, 1) * 50}%`
    ui.balanceWrap.classList.toggle('danger', Math.abs(bal) > 0.7)
  } else {
    ui.balanceWrap.classList.add('hidden')
  }
  ui.speed.textContent = String(Math.round(p.speed * 2.15))
}

/* ---------------- init ---------------- */
resetPlayer()
updateScoreUI()
updateTimerUI()
if (isCoarse) {
  ui.touch.classList.remove('hidden')
  ui.touch.classList.add('enabled')
}
const particleScale = () => window.innerHeight * renderer.getPixelRatio() * 1.0
dust.setScale(particleScale())
sparks.setScale(particleScale())

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCoarse ? 1.6 : 2))
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  dust.setScale(particleScale())
  sparks.setScale(particleScale())
})

/* ---------------- main loop ---------------- */
const clock = new THREE.Clock()
let firstFrame = true
let hudTimer = 0

function frame() {
  requestAnimationFrame(frame)
  const raw = clock.getDelta()
  const dt = Math.min(0.045, raw)
  const realDt = Math.min(0.25, raw)
  hudTimer += dt

  if (game.state === 'menu') {
    updateCamera(dt)
    skater.root.position.set(world.spawn.x, world.groundInfo(world.spawn.x, world.spawn.z).y, world.spawn.z)
    skater.root.rotation.y = world.spawn.heading
    skater.update(dt, { grounded: true, crouch: 0.1, air: false, grab: false, grind: false, manual: false, bail: false, flip: null, pushing: false, lean: 0, balance: 0 })
    audio.update(dt, { grounded: false, speed: 0, grinding: false })
  } else if (game.state === 'countdown') {
    updateCountdown(realDt)
    updateCamera(dt)
    skater.root.position.set(world.spawn.x, world.groundInfo(world.spawn.x, world.spawn.z).y, world.spawn.z)
    skater.root.rotation.y = world.spawn.heading
    skater.update(dt, { grounded: true, crouch: 0.1, air: false, grab: false, grind: false, manual: false, bail: false, flip: null, pushing: false, lean: 0, balance: 0 })
    audio.update(dt, { grounded: false, speed: 0, grinding: false })
  } else if (game.state === 'running') {
    updatePlayer(dt, realDt)
    syncSkater(dt)
    updateCamera(dt)
    audio.update(dt, { grounded: player.grounded, speed: player.speed, grinding: !!player.grind })
    if (hudTimer > 0.09) {
      hudTimer = 0
      syncHud()
    }
  } else if (game.state === 'paused') {
    skater.update(dt * 0.15, {
      grounded: player.grounded || !!player.grind,
      air: player.air && !player.grind,
      crouch: 0.2, grab: false, grind: !!player.grind, manual: false, bail: false,
      flip: player.flip ? { ...player.flip, progress: player.flip.progress } : null,
      pushing: false, lean: 0, balance: player.grind ? player.grind.balance : 0,
    })
    audio.update(dt, { grounded: false, speed: 0, grinding: false })
  } else if (game.state === 'finished') {
    game.finishTimer += realDt
    // settle the skater while the results roll in
    if (player.bail) {
      player.bail.t += dt
      if (player.bail.t > player.bail.duration) player.bail = null
    }
    if (!player.bail && !player.grounded) {
      player.vy -= GRAV * dt
      player.y += player.vy * dt
      const gy = world.groundInfo(player.x, player.z).y
      if (player.y <= gy) { player.y = gy; player.vy = 0; player.grounded = true; player.air = false }
    }
    syncSkater(dt)
    updateCamera(dt)
    audio.update(dt, { grounded: player.grounded, speed: 0, grinding: false })
    if (game.finishTimer > 1.35 && ui.results.classList.contains('hidden')) showResults()
  }

  world.update(dt)
  dust.update(dt)
  sparks.update(dt)
  renderer.render(scene, camera)

  if (firstFrame) {
    firstFrame = false
    ui.loader.classList.add('done')
    setTimeout(() => ui.loader.remove(), 700)
    window.__ready = true
    document.body.classList.add('ready')
  }
}

resetPlayer()
updateCamera(0.016)
frame()

/* debug / automation surface */
window.__game = {
  get state() { return game.state },
  get score() { return game.score },
  get time() { return game.time },
  get countdown() { return game.countdown },
  get combo() { return { ...combo, names: combo.names.slice() } },
  get player() { return player },
  get bails() { return game.bails },
  get tricks() { return game.tricksLanded },
  start: startRun,
  restart: startRun,
  skipCountdown: () => { if (game.state === 'countdown') game.countdown = 0.001 },
  finish: finishRun,
  menu: toMenu,
  pause: togglePause,
  addTrick,
  cash: () => cashCombo(),
  jump: onJumpPress,
  release: onJumpRelease,
  trick: onTrickKey,
  setKey: (code, down) => { if (down) keys.add(code); else keys.delete(code) },
  camera,
  scene,
  renderer,
  world,
}
