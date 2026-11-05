import * as THREE from 'three'

/* ------------------------------------------------------------------ *
 *  Procedural skater. Chunky, readable silhouette, animated by state.
 * ------------------------------------------------------------------ */

const C = {
  hoodie: 0xf0b53a,
  hoodieDark: 0xd99a22,
  sleeve: 0xe6a92c,
  pants: 0x152d3d,
  pantsLight: 0x1d3c4e,
  skin: 0xb87a52,
  skinDark: 0x9d6440,
  cap: 0x12b8a6,
  capDark: 0x0b8f81,
  shoe: 0xf6e5c4,
  sole: 0xff5a1f,
  hair: 0x3a2517,
  grip: 0x1a1c1d,
}

function mat(color, roughness = 0.75, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness })
}

const MAT = {
  hoodie: mat(C.hoodie, 0.86),
  hoodieDark: mat(C.hoodieDark, 0.86),
  sleeve: mat(C.sleeve, 0.86),
  pants: mat(C.pants, 0.9),
  pantsLight: mat(C.pantsLight, 0.9),
  skin: mat(C.skin, 0.72),
  skinDark: mat(C.skinDark, 0.72),
  cap: mat(C.cap, 0.78),
  capDark: mat(C.capDark, 0.78),
  shoe: mat(C.shoe, 0.8),
  sole: mat(C.sole, 0.7),
  hair: mat(C.hair, 0.95),
  grip: mat(C.grip, 1),
  wood: mat(0xc98d4e, 0.8),
  metal: mat(0xcfd8dc, 0.3, 0.85),
  wheel: mat(0xf1e5c8, 0.55),
}

function capsule(radius, length, material, radial = 9) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, radial), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function makeDeckGeometry() {
  const w = 0.46, l = 1.56, r = 0.2
  const s = new THREE.Shape()
  s.moveTo(-w / 2 + r, -l / 2)
  s.lineTo(w / 2 - r, -l / 2)
  s.quadraticCurveTo(w / 2, -l / 2, w / 2, -l / 2 + r)
  s.lineTo(w / 2, l / 2 - r)
  s.quadraticCurveTo(w / 2, l / 2, w / 2 - r, l / 2)
  s.lineTo(-w / 2 + r, l / 2)
  s.quadraticCurveTo(-w / 2, l / 2, -w / 2, l / 2 - r)
  s.lineTo(-w / 2, -l / 2 + r)
  s.quadraticCurveTo(-w / 2, -l / 2, -w / 2 + r, -l / 2)
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.06, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 10,
  })
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, -0.03, 0)
  return geo
}

export function createSkater(deckTexture, gripTexture) {
  const root = new THREE.Group()
  root.rotation.order = 'YXZ'
  const tilt = new THREE.Group()
  root.add(tilt)

  /* ---------------- board ---------------- */
  const boardRoot = new THREE.Group()
  boardRoot.position.y = 0.175
  tilt.add(boardRoot)

  const deckMat = new THREE.MeshStandardMaterial({ map: deckTexture, roughness: 0.7 })
  const gripMat = new THREE.MeshStandardMaterial({ map: gripTexture, roughness: 0.98 })
  const deck = new THREE.Mesh(makeDeckGeometry(), [MAT.wood, MAT.wood])
  deck.castShadow = true
  deck.receiveShadow = true
  boardRoot.add(deck)
  const grip = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 1.46), gripMat)
  grip.rotation.x = -Math.PI / 2
  grip.position.y = 0.046
  grip.castShadow = false
  boardRoot.add(grip)
  const graphic = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 1.48), deckMat)
  graphic.rotation.x = Math.PI / 2
  graphic.position.y = -0.045
  boardRoot.add(graphic)

  for (const z of [-0.48, 0.48]) {
    const truck = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.07, 0.14), MAT.metal)
    truck.position.set(0, -0.075, z)
    truck.castShadow = true
    boardRoot.add(truck)
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.56, 6), MAT.metal)
    axle.rotation.z = Math.PI / 2
    axle.position.set(0, -0.11, z)
    axle.castShadow = true
    boardRoot.add(axle)
    for (const x of [-0.24, 0.24]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.065, 12), MAT.wheel)
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(x, -0.117, z)
      wheel.castShadow = true
      boardRoot.add(wheel)
    }
  }

  /* ---------------- body ---------------- */
  const body = new THREE.Group()
  body.position.y = 0.36
  tilt.add(body)

  // hips
  const hips = capsule(0.19, 0.13, MAT.pants, 10)
  hips.position.y = 0.61
  hips.scale.set(1.15, 1, 0.78)
  body.add(hips)
  // belt
  const belt = box(0.4, 0.07, 0.3, MAT.hoodieDark)
  belt.position.y = 0.74
  body.add(belt)

  // torso / hoodie
  const torso = capsule(0.245, 0.36, MAT.hoodie, 12)
  torso.position.y = 1.0
  torso.scale.set(1.08, 1, 0.74)
  body.add(torso)
  const chest = box(0.4, 0.3, 0.2, MAT.hoodie)
  chest.position.set(0, 1.03, 0.08)
  chest.rotation.x = 0.08
  body.add(chest)
  // hood roll
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.065, 8, 16, Math.PI * 1.5), MAT.hoodieDark)
  hood.rotation.x = Math.PI / 2
  hood.rotation.z = Math.PI * 0.25
  hood.position.set(0, 1.21, -0.03)
  hood.castShadow = true
  body.add(hood)
  // pocket
  const pocket = box(0.3, 0.1, 0.06, MAT.hoodieDark)
  pocket.position.set(0, 0.86, 0.2)
  body.add(pocket)
  // back number decal
  const numCanvas = document.createElement('canvas')
  numCanvas.width = 128
  numCanvas.height = 128
  const nctx = numCanvas.getContext('2d')
  nctx.fillStyle = 'rgba(0,0,0,0)'
  nctx.fillRect(0, 0, 128, 128)
  nctx.fillStyle = '#12222b'
  nctx.font = '900 96px "Lato Park", sans-serif'
  nctx.textAlign = 'center'
  nctx.textBaseline = 'middle'
  nctx.fillText('13', 64, 68)
  const numTex = new THREE.CanvasTexture(numCanvas)
  numTex.colorSpace = THREE.SRGBColorSpace
  const num = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ map: numTex, transparent: true }))
  num.position.set(0, 1.05, -0.194)
  num.rotation.y = Math.PI
  body.add(num)

  // neck + head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.08, 8), MAT.skin)
  neck.position.y = 1.28
  body.add(neck)
  const head = new THREE.Group()
  head.position.y = 1.4
  body.add(head)
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 16), MAT.skin)
  skull.scale.set(1, 1.08, 1.02)
  skull.castShadow = true
  head.add(skull)
  // ears
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), MAT.skinDark)
    ear.position.set(sx * 0.145, 0, 0)
    head.add(ear)
  }
  // sunglasses
  const glasses = box(0.23, 0.055, 0.05, MAT.pants)
  glasses.position.set(0, 0.035, 0.13)
  head.add(glasses)
  for (const sx of [-1, 1]) {
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.045), new THREE.MeshStandardMaterial({ color: 0x0c222c, roughness: 0.15, metalness: 0.5 }))
    lens.position.set(sx * 0.055, 0.035, 0.158)
    head.add(lens)
  }
  // cap
  const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.152, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), MAT.cap)
  capDome.position.y = 0.075
  capDome.scale.set(1.03, 0.9, 1.03)
  capDome.castShadow = true
  head.add(capDome)
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.025, 16, 1, false, 0, Math.PI), MAT.capDark)
  brim.position.set(0, 0.075, 0.15)
  brim.rotation.x = 0.08
  brim.scale.z = 0.7
  brim.castShadow = true
  head.add(brim)
  // messy hair out the back
  for (let i = 0; i < 4; i++) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 5), MAT.hair)
    tuft.position.set((i - 1.5) * 0.05, 0.0, -0.15)
    tuft.rotation.x = -1.2
    head.add(tuft)
  }

  // arms
  function makeArm(side) {
    const shoulder = new THREE.Group()
    shoulder.position.set(side * 0.3, 1.14, 0)
    body.add(shoulder)
    const upper = capsule(0.072, 0.21, MAT.sleeve)
    upper.position.y = -0.15
    shoulder.add(upper)
    const elbow = new THREE.Group()
    elbow.position.y = -0.3
    shoulder.add(elbow)
    const fore = capsule(0.062, 0.19, MAT.skin)
    fore.position.y = -0.13
    elbow.add(fore)
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.072, 0.07, 8), MAT.sleeve)
    cuff.position.y = -0.02
    elbow.add(cuff)
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), MAT.skin)
    hand.position.y = -0.27
    hand.scale.set(1, 1.1, 0.8)
    elbow.add(hand)
    // wrist band
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.063, 0.017, 6, 10), MAT.hoodieDark)
    band.rotation.x = Math.PI / 2
    band.position.y = -0.2
    elbow.add(band)
    return { shoulder, elbow, hand }
  }
  const armL = makeArm(1)
  const armR = makeArm(-1)

  // legs
  function makeLeg(side) {
    const hip = new THREE.Group()
    hip.position.set(side * 0.13, 0.6, 0)
    body.add(hip)
    const thigh = capsule(0.092, 0.23, MAT.pants)
    thigh.position.y = -0.18
    hip.add(thigh)
    const knee = new THREE.Group()
    knee.position.y = -0.33
    hip.add(knee)
    const shin = capsule(0.075, 0.22, MAT.pantsLight)
    shin.position.y = -0.17
    knee.add(shin)
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.09, 8), MAT.shoe)
    sock.position.y = -0.3
    knee.add(sock)
    // shoe
    const shoe = new THREE.Group()
    shoe.position.set(0, -0.33, 0.05)
    knee.add(shoe)
    const upper = box(0.14, 0.09, 0.3, MAT.shoe)
    upper.position.z = 0.03
    shoe.add(upper)
    const sole = box(0.15, 0.035, 0.32, MAT.sole)
    sole.position.set(0, -0.062, 0.03)
    shoe.add(sole)
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), MAT.shoe)
    toe.scale.set(0.92, 0.65, 1)
    toe.position.set(0, -0.01, 0.17)
    shoe.add(toe)
    return { hip, knee, shoe }
  }
  const legL = makeLeg(1)
  const legR = makeLeg(-1)

  // knee pads
  for (const leg of [legL, legR]) {
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), MAT.pantsLight)
    pad.scale.set(1, 1.1, 0.7)
    pad.position.set(0, 0, 0.06)
    pad.castShadow = true
    leg.knee.add(pad)
  }

  root.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true
      obj.receiveShadow = true
    }
  })

  /* ---------------- animation ---------------- */
  const pose = {
    crouch: 0, air: 0, grab: 0, grind: 0, manual: 0, bail: 0,
    lean: 0, balance: 0, speed: 0, pushing: 0, flip: null, grabAmount: 0,
  }
  let smooth = {
    crouch: 0.15, air: 0, grab: 0, grind: 0, manual: 0, lean: 0, balance: 0, bail: 0,
  }
  let boardRoll = 0
  let boardYaw = 0
  let boardPitch = 0
  let flipAxis = 'z'
  let flipSign = 1
  let flipAngle = 0
  let t = 0
  let bailSpin = 0

  const ease = (a, b, x) => a + (b - a) * x

  function update(dt, s) {
    t += dt
    const k = Math.min(1, dt * 11)
    smooth.crouch = ease(smooth.crouch, s.crouch ?? 0.15, k)
    smooth.air = ease(smooth.air, s.air ? 1 : 0, k)
    smooth.grab = ease(smooth.grab, s.grab ? 1 : 0, Math.min(1, dt * 14))
    smooth.grind = ease(smooth.grind, s.grind ? 1 : 0, k)
    smooth.manual = ease(smooth.manual, s.manual ? 1 : 0, Math.min(1, dt * 9))
    smooth.lean = ease(smooth.lean, (s.lean || 0), k)
    smooth.balance = ease(smooth.balance, s.balance || 0, k)
    smooth.bail = ease(smooth.bail, s.bail ? 1 : 0, Math.min(1, dt * 10))

    const crouch = smooth.crouch
    const air = smooth.air
    const grab = smooth.grab
    const grind = smooth.grind
    const manual = smooth.manual

    // whole body lean / tilt
    tilt.rotation.z = smooth.lean * 0.28 + smooth.balance * 0.42
    tilt.rotation.x = -manual * 0.1 - air * 0.06 + crouch * 0.04
    tilt.position.y = 0
    if (s.bail) {
      bailSpin += dt * 8
      tilt.rotation.z = Math.sin(bailSpin) * 0.9
      tilt.rotation.x = 1.25 + Math.sin(bailSpin * 0.7) * 0.4
      tilt.position.y = Math.max(0, Math.sin(bailSpin * 0.9)) * 0.58
      body.position.y = 0.36
    } else {
      bailSpin = 0
      body.position.y = 0.36 - crouch * 0.13 - grab * 0.08
    }

    // torso pose
    torso.rotation.x = 0.06 + crouch * 0.2 + manual * 0.12 - air * 0.05 + grab * 0.2
    torso.rotation.z = -smooth.balance * 0.15
    chest.rotation.x = torso.rotation.x * 0.8
    chest.rotation.z = torso.rotation.z
    head.rotation.x = -torso.rotation.x * 0.55 - manual * 0.18
    head.rotation.z = smooth.balance * 0.1

    // legs: crouch, air tuck, grind stance
    const push = s.pushing ? Math.sin(t * 12) : 0
    const baseThigh = -0.36
    const airTuck = air * 0.5
    legL.hip.rotation.x = baseThigh - crouch * 0.45 - airTuck * 0.8 + manual * 0.08
    legL.hip.rotation.z = 0.08 + air * 0.22
    legL.knee.rotation.x = 0.72 + crouch * 0.75 + air * 0.9
    legR.hip.rotation.x = 0.1 - crouch * 0.4 - airTuck * 0.35 + push * 0.22
    legR.hip.rotation.z = -0.08 - air * 0.22
    legR.knee.rotation.x = 0.6 + crouch * 0.8 + air * 0.55 - Math.max(0, push) * 0.2
    // manual: front foot lifts
    legL.hip.rotation.x -= manual * 0.25
    legL.knee.rotation.x += manual * 0.35
    // grind: wide stance / knees out
    legL.hip.rotation.z += grind * 0.12
    legR.hip.rotation.z -= grind * 0.12
    legL.knee.rotation.x += grind * 0.2
    legR.knee.rotation.x += grind * 0.2

    // arms
    const armOut = 0.42 + air * 0.55 + grind * 0.6 + grab * 0.1
    armL.shoulder.rotation.z = -armOut - smooth.balance * 0.3 + (s.bail ? Math.sin(bailSpin * 1.3) * 0.8 : 0)
    armR.shoulder.rotation.z = armOut - smooth.balance * 0.3 - (s.bail ? Math.sin(bailSpin * 1.3) * 0.8 : 0)
    armL.shoulder.rotation.x = -0.2 - air * 0.45 - grind * 0.15 + Math.sin(t * 1.7) * 0.035
    armR.shoulder.rotation.x = -0.16 - air * 0.4 - grind * 0.2 - Math.sin(t * 1.7) * 0.035
    armL.elbow.rotation.x = -0.45 - air * 0.3 - grind * 0.2
    armR.elbow.rotation.x = -0.4 - air * 0.25 - grind * 0.2 - grab * 0.4
    // grab: right hand reaches to the board
    if (grab > 0.01) {
      armR.shoulder.rotation.z = 0.05
      armR.shoulder.rotation.x = -0.95
      armR.elbow.rotation.x = -0.35
    }
    if (s.bail) {
      armL.shoulder.rotation.x = 1.1 + Math.sin(bailSpin) * 0.6
      armR.shoulder.rotation.x = 1.0 + Math.cos(bailSpin * 0.8) * 0.6
      armL.elbow.rotation.x = -0.2
      armR.elbow.rotation.x = -0.2
      legL.hip.rotation.x = -0.2 + Math.sin(bailSpin * 1.4) * 0.6
      legR.hip.rotation.x = 0.25 + Math.cos(bailSpin * 1.3) * 0.6
      legL.knee.rotation.x = 0.4
      legR.knee.rotation.x = 0.4
    }

    // board
    boardPitch = ease(boardPitch, manual ? -0.34 : (air ? -0.06 : 0), Math.min(1, dt * 8))
    let targetRoll = grab ? 0.42 : 0
    let targetYaw = 0
    if (s.flip) {
      const p = Math.min(1, Math.max(0, s.flip.progress))
      const e = p * p * (3 - 2 * p)
      if (s.flip.type === 'kickflip') {
        targetRoll = e * Math.PI * 2
      } else if (s.flip.type === 'heelflip') {
        targetRoll = -e * Math.PI * 2
      } else if (s.flip.type === 'shoveit') {
        targetYaw = -e * Math.PI * 2
      }
    }
    if (s.flip) {
      const p = Math.min(1, Math.max(0, s.flip.progress))
      const e = p * p * (3 - 2 * p)
      if (s.flip.type === 'kickflip') boardRoll = e * Math.PI * 2
      else if (s.flip.type === 'heelflip') boardRoll = -e * Math.PI * 2
      else if (s.flip.type === 'shoveit') boardYaw = -e * Math.PI * 2
    } else {
      boardRoll = ease(boardRoll, 0, Math.min(1, dt * 14))
      boardYaw = ease(boardYaw, 0, Math.min(1, dt * 14))
    }
    if (s.bail) {
      boardRoll += dt * 9
      boardYaw += dt * 5
      boardRoot.position.y = 0.18 + Math.abs(Math.sin(bailSpin)) * 0.22
      boardRoot.position.x = Math.sin(bailSpin * 0.8) * 0.18
    } else {
      boardRoot.position.y = ease(boardRoot.position.y, 0.175, Math.min(1, dt * 10))
      boardRoot.position.x = ease(boardRoot.position.x, 0, Math.min(1, dt * 10))
    }
    boardRoot.rotation.x = boardPitch
    boardRoot.rotation.z = boardRoll + (grab ? 0.0 : 0)
    boardRoot.rotation.y = boardYaw
    // feet follow the board roll slightly during flip
    if (s.flip && s.flip.type !== 'shoveit') {
      legL.hip.rotation.z += Math.sin(boardRoll) * 0.025
      legR.hip.rotation.z += Math.sin(boardRoll) * 0.025
    }

    // idle bob and hair
    if (!s.grounded && !s.grab) {
      head.rotation.y = Math.sin(t * 2.2) * 0.04 + (s.spinning || 0) * 0.3
    } else {
      head.rotation.y = ease(head.rotation.y, 0, Math.min(1, dt * 5))
    }
  }

  return {
    root,
    boardRoot,
    update,
    setBailReset() {
      tilt.rotation.set(0, 0, 0)
      tilt.position.y = 0
      body.position.y = 0.36
      boardRoot.position.set(0, 0.175, 0)
      boardRoot.rotation.set(0, 0, 0)
      smooth.bail = 0
      bailSpin = 0
    },
  }
}
