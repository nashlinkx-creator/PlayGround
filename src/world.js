import * as THREE from 'three'

/* ------------------------------------------------------------------ *
 *  THRASH PARK — procedural skate park
 *  All geometry and textures are generated at runtime. No downloads.
 * ------------------------------------------------------------------ */

const HALF = 34          // plaza half-size
const CLAMP = 33.15
const SUN_DIR = new THREE.Vector3(0.58, 0.54, -0.61).normalize()

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvasTexture(w, h, draw, { repeat = null, srgb = true } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(canvas)
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(repeat[0], repeat[1])
  }
  return tex
}

function noise(ctx, w, h, amount, alpha = 0.05, seed = 1) {
  const rnd = mulberry32(seed)
  for (let i = 0; i < amount; i++) {
    const g = Math.floor(rnd() * 255)
    ctx.fillStyle = `rgba(${g},${g},${g},${alpha})`
    const s = 1 + rnd() * 3
    ctx.fillRect(rnd() * w, rnd() * h, s, s)
  }
}

function makeConcrete(seed = 3, repeat = [10, 10], base = '#cfc6b4') {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, w, h)
    const rnd = mulberry32(seed)
    for (let i = 0; i < 9000; i++) {
      const v = rnd()
      ctx.fillStyle = v > 0.5
        ? `rgba(255,255,255,${0.02 + rnd() * 0.05})`
        : `rgba(50,44,34,${0.02 + rnd() * 0.06})`
      ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3)
    }
    for (let i = 0; i < 9; i++) {
      const x = rnd() * w, y = rnd() * h
      const r = 30 + rnd() * 110
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgba(70,60,44,${0.025 + rnd() * 0.05})`)
      g.addColorStop(1, 'rgba(70,60,44,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    // expansion joints at the tile edges
    ctx.strokeStyle = 'rgba(58,52,42,0.35)'
    ctx.lineWidth = 3
    ctx.strokeRect(1.5, 1.5, w - 3, h - 3)
    // hairline cracks
    ctx.strokeStyle = 'rgba(65,58,46,0.23)'
    ctx.lineWidth = 1.2
    for (let c = 0; c < 4; c++) {
      let x = rnd() * w, y = rnd() * h
      ctx.beginPath()
      ctx.moveTo(x, y)
      for (let s = 0; s < 6; s++) {
        x += (rnd() - 0.5) * 55
        y += rnd() * 42
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    noise(ctx, w, h, 2400, 0.05, seed + 9)
  }, { repeat })
}

function makeGrip() {
  return canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#191b1c'
    ctx.fillRect(0, 0, w, h)
    noise(ctx, w, h, 14000, 0.13, 12)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    for (let i = 0; i < 16; i++) {
      ctx.beginPath()
      ctx.moveTo(0, (i / 16) * h)
      ctx.lineTo(w, (i / 16) * h)
      ctx.stroke()
    }
  })
}

function makeDeckGraphic() {
  return canvasTexture(256, 768, (ctx, w, h) => {
    ctx.fillStyle = '#f6e5c4'
    ctx.fillRect(0, 0, w, h)
    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.fillStyle = '#ff5a1f'
    for (let i = 0; i < 18; i++) {
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, 340, (i / 18) * Math.PI * 2, ((i + 1) / 18) * Math.PI * 2)
      ctx.closePath()
      if (i % 2 === 0) ctx.fill()
    }
    ctx.fillStyle = '#0c222c'
    ctx.beginPath()
    ctx.arc(0, 0, 150, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f6e5c4'
    ctx.font = '900 132px "Lato Park", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('TP', 0, 6)
    ctx.restore()
    ctx.fillStyle = '#0c222c'
    ctx.font = '700 24px "Lato Park", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('THRASH PARK', w / 2, h - 34)
    ctx.save()
    ctx.translate(w / 2, 44)
    ctx.fillStyle = '#0c222c'
    ctx.font = '900 28px "Lato Park", sans-serif'
    ctx.fillText('2:00', 0, 0)
    ctx.restore()
  })
}

function makeVertTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#b9b3a5'
    ctx.fillRect(0, 0, w, h)
    const rnd = mulberry32(21)
    for (let i = 0; i < 6000; i++) {
      ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(40,34,26,0.05)'
      ctx.fillRect(rnd() * w, rnd() * h, 2, 2)
    }
    // painted horizontal bands (v = 0 bottom of ramp, v = 1 lip)
    ctx.fillStyle = '#f2e3c6'
    ctx.fillRect(0, 0, w, h * 0.17)
    ctx.fillStyle = '#12b8a6'
    ctx.fillRect(0, h * 0.17, w, h * 0.055)
    ctx.fillStyle = '#ff5a1f'
    ctx.fillRect(0, h * 0.33, w, h * 0.035)
    ctx.fillStyle = 'rgba(12,34,44,0.55)'
    ctx.fillRect(0, h * 0.47, w, 4)
    // big ramp lettering running up the transition
    ctx.save()
    ctx.translate(w * 0.5, h * 0.6)
    ctx.rotate(-0.03)
    ctx.fillStyle = 'rgba(255,90,31,0.82)'
    ctx.font = '900 96px "Lato Park", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('SEND IT', 0, 0)
    ctx.restore()
    // scuffs
    ctx.strokeStyle = 'rgba(40,36,30,0.15)'
    for (let i = 0; i < 30; i++) {
      const y = rnd() * h
      ctx.beginPath()
      ctx.moveTo(rnd() * w, y)
      ctx.lineTo(rnd() * w, y + rnd() * 8)
      ctx.stroke()
    }
    noise(ctx, w, h, 2000, 0.045, 8)
  })
}

function makePoolTexture() {
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#1a7d8c'
    ctx.fillRect(0, 0, w, h)
    const rnd = mulberry32(55)
    const tile = 42
    for (let y = 0; y < h; y += tile) {
      for (let x = 0; x < w; x += tile) {
        const n = rnd()
        ctx.fillStyle = n > 0.72 ? '#2b9cae' : n > 0.35 ? '#1f8b9b' : '#187585'
        ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4)
        ctx.fillStyle = 'rgba(255,255,255,0.07)'
        ctx.fillRect(x + 2, y + 2, tile - 4, 2)
      }
    }
    // painted sun + wordmark in the deep end
    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.globalAlpha = 0.9
    ctx.fillStyle = '#ffd23f'
    for (let i = 0; i < 16; i++) {
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, 280, (i / 16) * Math.PI * 2, ((i + 1) / 16) * Math.PI * 2)
      ctx.closePath()
      if (i % 2 === 0) ctx.fill()
    }
    ctx.fillStyle = '#f6e5c4'
    ctx.beginPath()
    ctx.arc(0, 0, 160, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ff5a1f'
    ctx.font = '900 110px "Lato Park", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('POOL', 0, 4)
    ctx.restore()
    ctx.globalAlpha = 0.35
    ctx.strokeStyle = '#f6e5c4'
    ctx.lineWidth = 9
    ctx.beginPath()
    ctx.arc(w / 2, h / 2, 360, 0, Math.PI * 2)
    ctx.stroke()
    noise(ctx, w, h, 5000, 0.05, 17)
  })
}

function makeGraffiti(seed, palette = ['#ff5a1f', '#ffd23f', '#12b8a6', '#f6e5c4', '#e8488b']) {
  const words = ['SK8', 'THRASH', 'NO RULES', 'SEND IT', 'RAD', 'STAY LOUD', 'PARK LIFE', 'ROAST']
  return canvasTexture(1024, 512, (ctx, w, h) => {
    const rnd = mulberry32(seed)
    ctx.fillStyle = '#c9c0ad'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 1200; i++) {
      ctx.fillStyle = `rgba(40,34,26,${0.01 + rnd() * 0.05})`
      ctx.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 8, 1 + rnd() * 4)
    }
    ctx.fillStyle = 'rgba(30,40,42,0.16)'
    ctx.fillRect(0, h * 0.82, w, h * 0.18)
    // spray bursts
    for (let i = 0; i < 6; i++) {
      const cx = rnd() * w, cy = h * (0.3 + rnd() * 0.5), r = 30 + rnd() * 80
      ctx.fillStyle = palette[Math.floor(rnd() * palette.length)] + '33'
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
    }
    // big tag words
    const count = 3
    for (let i = 0; i < count; i++) {
      const word = words[Math.floor(rnd() * words.length)]
      ctx.save()
      ctx.translate(90 + rnd() * (w - 260), 130 + rnd() * (h - 230))
      ctx.rotate((rnd() - 0.5) * 0.4)
      const size = 82 + rnd() * 74
      ctx.font = `900 ${size}px "Lato Park", sans-serif`
      ctx.textAlign = 'center'
      const color = palette[Math.floor(rnd() * palette.length)]
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgba(9,24,30,0.92)'
      ctx.lineWidth = size * 0.22
      ctx.strokeText(word, 0, 0)
      ctx.fillStyle = color
      ctx.fillText(word, 0, 0)
      ctx.strokeStyle = 'rgba(246,229,196,0.85)'
      ctx.lineWidth = size * 0.035
      ctx.strokeText(word, 0, 0)
      // drips
      ctx.fillStyle = color
      for (let d = 0; d < 5; d++) {
        const dx = (rnd() - 0.5) * size * word.length * 0.45
        ctx.fillRect(dx, size * 0.35, 3 + rnd() * 3, 12 + rnd() * 44)
      }
      ctx.restore()
    }
    // little stars and scribbles
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = palette[Math.floor(rnd() * palette.length)] + 'cc'
      ctx.lineWidth = 2 + rnd() * 4
      ctx.beginPath()
      const x = rnd() * w, y = rnd() * h
      ctx.moveTo(x, y)
      for (let k = 0; k < 4; k++) ctx.lineTo(x + (rnd() - 0.5) * 80, y + (rnd() - 0.5) * 60)
      ctx.stroke()
    }
    noise(ctx, w, h, 4000, 0.06, seed + 2)
  })
}

function makeBanner() {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = '#ff5a1f'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#ffd23f'
    ctx.fillRect(0, 0, w, 12)
    ctx.fillRect(0, h - 12, w, 12)
    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.fillStyle = '#f6e5c4'
    ctx.font = '900 128px "Lato Park", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('THRASH PARK', 0, -8)
    ctx.fillStyle = '#0c222c'
    ctx.font = '900 30px "Lato Park", sans-serif'
    ctx.letterSpacing = '12px'
    ctx.fillText('SKATE JAM  •  2026', 0, 72)
    ctx.restore()
  })
}

function makeDecal() {
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.rotate(-0.16)
    // sunburst
    for (let i = 0; i < 24; i++) {
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, 430, (i / 24) * Math.PI * 2, ((i + 1) / 24) * Math.PI * 2)
      ctx.closePath()
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,90,31,0.88)' : 'rgba(255,210,63,0.9)'
      ctx.fill()
    }
    ctx.fillStyle = '#0c222c'
    ctx.beginPath()
    ctx.arc(0, 0, 300, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#f6e5c4'
    ctx.lineWidth = 12
    ctx.beginPath()
    ctx.arc(0, 0, 288, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#f6e5c4'
    ctx.font = '900 148px "Lato Park", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('THRASH', 0, -62)
    ctx.fillStyle = '#ff5a1f'
    ctx.font = '900 168px "Lato Park", sans-serif'
    ctx.fillText('PARK', 0, 92)
    ctx.fillStyle = '#ffd23f'
    ctx.font = '900 34px "Lato Park", sans-serif'
    ctx.letterSpacing = '10px'
    ctx.fillText('SUNSET VALLEY', 0, 236)
    ctx.restore()
    // outer ring
    ctx.strokeStyle = 'rgba(246,229,196,0.65)'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(w / 2, h / 2, 470, 0, Math.PI * 2)
    ctx.stroke()
  })
}

function makePadPrint(label, accent = '#f6e5c4') {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = accent
    ctx.globalAlpha = 0.9
    ctx.lineWidth = 9
    ctx.strokeRect(20, 20, w - 40, h - 40)
    // corner speed stripes
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, w, h)
    ctx.clip()
    ctx.globalAlpha = 0.5
    ctx.fillStyle = accent
    for (let i = 0; i < 5; i++) {
      const off = i * 34
      ctx.save()
      ctx.translate(20 + off, 20)
      ctx.rotate(Math.PI / 4)
      ctx.fillRect(0, 0, 14, 120)
      ctx.restore()
      ctx.save()
      ctx.translate(w - 20 - off, h - 20)
      ctx.rotate(Math.PI / 4)
      ctx.fillRect(0, 0, 14, 120)
      ctx.restore()
    }
    ctx.restore()
    // center chip
    ctx.globalAlpha = 0.92
    ctx.fillStyle = '#0c222c'
    ctx.fillRect(w * 0.14, h * 0.36, w * 0.72, h * 0.28)
    ctx.globalAlpha = 1
    ctx.fillStyle = accent
    ctx.font = '900 78px "Lato Park", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, w / 2, h * 0.5 + 4)
  })
}

function makeWindows() {
  return canvasTexture(256, 512, (ctx, w, h) => {
    // mid-rise facade: strong window grid so the skyline reads at distance
    ctx.fillStyle = '#84959c'
    ctx.fillRect(0, 0, w, h)
    const rnd = mulberry32(41)
    // vertical pilasters
    for (let x = 0; x < w; x += 64) {
      ctx.fillStyle = 'rgba(52,68,74,0.28)'
      ctx.fillRect(x, 0, 8, h)
    }
    for (let y = 10; y < h; y += 26) {
      ctx.fillStyle = 'rgba(40,54,60,0.16)'
      ctx.fillRect(0, y + 18, w, 3)
      for (let x = 12; x < w - 16; x += 27) {
        const n = rnd()
        ctx.fillStyle = n > 0.78
          ? 'rgba(255,226,166,0.78)'
          : n > 0.5
            ? 'rgba(38,62,72,0.58)'
            : 'rgba(26,45,54,0.72)'
        ctx.fillRect(x, y, 14, 15)
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.fillRect(x, y, 14, 2)
      }
    }
    const vg = ctx.createLinearGradient(0, 0, 0, h)
    vg.addColorStop(0, 'rgba(255,241,220,0.16)')
    vg.addColorStop(1, 'rgba(80,102,108,0.2)')
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, w, h)
  })
}

function makeCloud() {
  return canvasTexture(512, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const rnd = mulberry32(77)
    for (let i = 0; i < 22; i++) {
      const x = 60 + rnd() * (w - 120)
      const y = 95 + rnd() * 90
      const r = 40 + rnd() * 78
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, 'rgba(255,248,236,0.82)')
      g.addColorStop(0.55, 'rgba(255,244,228,0.42)')
      g.addColorStop(1, 'rgba(255,244,228,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
  })
}

/* ----------------------------- geometry helpers ----------------------------- */

function gridGeometry(x0, x1, z0, z1, nx, nz, height, uvFn) {
  const geo = new THREE.BufferGeometry()
  const pos = []
  const uv = []
  const idx = []
  for (let j = 0; j <= nz; j++) {
    const z = z0 + (z1 - z0) * (j / nz)
    for (let i = 0; i <= nx; i++) {
      const x = x0 + (x1 - x0) * (i / nx)
      const y = height(x, z)
      pos.push(x, y, z)
      if (uvFn) {
        const [u, v] = uvFn(x, z, i / nx, j / nz)
        uv.push(u, v)
      } else {
        uv.push(x / 6, z / 6)
      }
    }
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i
      const b = a + 1
      const c = a + nx + 1
      const d = c + 1
      idx.push(a, c, b, c, d, b)
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

function sideWallGeometry(x, z0, z1, nz, height, bottom = 0) {
  const geo = new THREE.BufferGeometry()
  const pos = []
  const uv = []
  const idx = []
  for (let j = 0; j <= nz; j++) {
    const z = z0 + (z1 - z0) * (j / nz)
    const y = height(x, z)
    pos.push(x, bottom, z)
    pos.push(x, Math.max(bottom, y), z)
    uv.push(z / 5, 0, z / 5, 1)
  }
  for (let j = 0; j < nz; j++) {
    const a = j * 2
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

function endWallGeometry(z, x0, x1, nx, height) {
  const geo = new THREE.BufferGeometry()
  const pos = []
  const uv = []
  const idx = []
  for (let j = 0; j <= nx; j++) {
    const x = x0 + (x1 - x0) * (j / nx)
    const y = height(x, z)
    pos.push(x, 0, z)
    pos.push(x, y, z)
    uv.push(x / 5, 0, x / 5, 1)
  }
  for (let j = 0; j < nx; j++) {
    const a = j * 2
    idx.push(a, a + 2, a + 1, a + 2, a + 3, a + 1)
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

/* -------------------------------------------------------------------------- */

export function createWorld(scene) {
  const surfaces = []
  const rails = []
  const palms = []
  const clouds = []
  const animated = []
  const bowl = { cx: 18.5, cz: 19.5, r: 6.8, depth: 1.85, trans: 2.3 }

  /* ---------------- textures & materials ---------------- */
  const concreteMap = makeConcrete(3, [1, 1], '#c6bdac')
  const concreteSideMap = makeConcrete(11, [1, 1], '#b3ab9c')
  const gripMap = makeGrip()
  const deckMap = makeDeckGraphic()
  const vertMap = makeVertTexture()
  const poolMap = makePoolTexture()
  const decalMap = makeDecal()
  const bannerMap = makeBanner()
  const cloudMap = makeCloud()
  const windowMap = makeWindows()
  const graffitiMaps = [makeGraffiti(4), makeGraffiti(9), makeGraffiti(17), makeGraffiti(28)]
  const padManualMap = makePadPrint('MANUAL', '#f6e5c4')
  const padLedgeMap = makePadPrint('GRIND', '#ffd23f')
  const padFunMap = makePadPrint('FUNBOX', '#f6e5c4')

  const concrete = new THREE.MeshStandardMaterial({ map: concreteMap, roughness: 0.93, metalness: 0.02 })
  const concreteDark = new THREE.MeshStandardMaterial({ map: concreteSideMap, color: 0xa8a193, roughness: 0.95 })
  const vertMat = new THREE.MeshStandardMaterial({ map: vertMap, roughness: 0.82, metalness: 0.02 })
  const poolMat = new THREE.MeshStandardMaterial({ map: poolMap, roughness: 0.55, metalness: 0.06 })
  const metal = new THREE.MeshStandardMaterial({ color: 0xd7dee2, roughness: 0.28, metalness: 0.92 })
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x58666d, roughness: 0.45, metalness: 0.75 })
  const painted = {
    orange: new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.7 }),
    teal: new THREE.MeshStandardMaterial({ color: 0x12b8a6, roughness: 0.7 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xf6e5c4, roughness: 0.8 }),
    navy: new THREE.MeshStandardMaterial({ color: 0x12313d, roughness: 0.8 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.72 }),
  }
  const graffitiMats = graffitiMaps.map(map => new THREE.MeshBasicMaterial({ map }))
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd7de, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.55 })
  // Graffiti source art is 2:1. Tile it instead of stretching it across wide walls.
  const artCache = new Map()
  function artMaterial(index, width, height, offset = 0) {
    const aspect = width / Math.max(0.1, height)
    const key = `${index}|${aspect.toFixed(2)}|${offset.toFixed(2)}`
    if (artCache.has(key)) return artCache.get(key)
    const tex = graffitiMaps[index % graffitiMaps.length].clone()
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(Math.max(1, aspect / 2), 1)
    tex.offset.x = offset % 1
    tex.needsUpdate = true
    const material = new THREE.MeshBasicMaterial({ map: tex })
    artCache.set(key, material)
    return material
  }

  const add = (mesh, cast = true, receive = true) => {
    mesh.castShadow = cast
    mesh.receiveShadow = receive
    scene.add(mesh)
    return mesh
  }

  /* ---------------- lighting / sky ---------------- */
  const hemi = new THREE.HemisphereLight(0xbfe5ff, 0xc09a6c, 0.78)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight(0xfff0cf, 2.15)
  sun.position.copy(SUN_DIR).multiplyScalar(72)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -46
  sun.shadow.camera.right = 46
  sun.shadow.camera.top = 46
  sun.shadow.camera.bottom = -46
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 170
  sun.shadow.bias = -0.0006
  sun.shadow.normalBias = 0.035
  scene.add(sun)
  scene.add(sun.target)
  sun.target.position.set(0, 0, -2)

  const fill = new THREE.DirectionalLight(0x9ecfe3, 0.45)
  fill.position.set(-40, 26, 30)
  scene.add(fill)

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x1f6fa9) },
      midColor: { value: new THREE.Color(0x82c4dd) },
      horizonColor: { value: new THREE.Color(0xffce8f) },
      hazeColor: { value: new THREE.Color(0xf2d4a9) },
      sunDir: { value: SUN_DIR.clone() },
      sunColor: { value: new THREE.Color(0xfff3d0) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 hazeColor;
      uniform vec3 sunDir;
      uniform vec3 sunColor;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(horizonColor, midColor, smoothstep(-0.02, 0.24, h));
        col = mix(col, topColor, smoothstep(0.16, 0.72, h));
        float sd = max(dot(d, normalize(sunDir)), 0.0);
        col += sunColor * pow(sd, 18.0) * 0.28;
        col += sunColor * pow(sd, 380.0) * 0.9;
        col += sunColor * pow(sd, 3200.0) * 2.4;
        col = mix(hazeColor, col, smoothstep(-0.08, 0.02, h));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
  const sky = new THREE.Mesh(new THREE.SphereGeometry(280, 40, 24), skyMat)
  sky.frustumCulled = false
  scene.add(sky)

  scene.fog = new THREE.FogExp2(0xeccfae, 0.0033)

  // clouds
  for (let i = 0; i < 7; i++) {
    const mat = new THREE.SpriteMaterial({ map: cloudMap, transparent: true, opacity: 0.5, depthWrite: false, fog: false })
    const sprite = new THREE.Sprite(mat)
    const a = (i / 7) * Math.PI * 2 + 0.4
    const r = 110 + (i % 3) * 38
    sprite.position.set(Math.cos(a) * r, 38 + (i % 4) * 16, Math.sin(a) * r - 10)
    const s = 55 + (i % 3) * 22
    sprite.scale.set(s, s * 0.46, 1)
    scene.add(sprite)
    clouds.push({ sprite, a, r, speed: 0.003 + (i % 3) * 0.0015, y: sprite.position.y })
  }

  /* ---------------- ground & plaza ---------------- */
  const plazaShape = new THREE.Shape()
  plazaShape.moveTo(-HALF, -HALF)
  plazaShape.lineTo(HALF, -HALF)
  plazaShape.lineTo(HALF, HALF)
  plazaShape.lineTo(-HALF, HALF)
  plazaShape.closePath()
  const bowlHole = new THREE.Path()
  bowlHole.absarc(bowl.cx, -bowl.cz, bowl.r, 0, Math.PI * 2, true)
  plazaShape.holes.push(bowlHole)
  const plazaGeo = new THREE.ShapeGeometry(plazaShape, 48)
  const plazaTex = concreteMap.clone()
  plazaTex.repeat.set(0.14, 0.14)
  plazaTex.needsUpdate = true
  const plazaMat = new THREE.MeshStandardMaterial({ map: plazaTex, roughness: 0.93, metalness: 0.02 })
  const plaza = new THREE.Mesh(plazaGeo, plazaMat)
  plaza.rotation.x = -Math.PI / 2
  plaza.receiveShadow = true
  scene.add(plaza)

  // outer ground with the same pool-shaped cut-out so the bowl can sit below grade
  const outerShape = new THREE.Shape()
  outerShape.moveTo(-280, -280)
  outerShape.lineTo(280, -280)
  outerShape.lineTo(280, 280)
  outerShape.lineTo(-280, 280)
  outerShape.closePath()
  const outerHole = new THREE.Path()
  outerHole.absarc(bowl.cx, -bowl.cz, bowl.r, 0, Math.PI * 2, true)
  outerShape.holes.push(outerHole)
  const outer = new THREE.Mesh(
    new THREE.ShapeGeometry(outerShape, 48),
    new THREE.MeshStandardMaterial({ color: 0xc7ab7f, roughness: 1 })
  )
  outer.rotation.x = -Math.PI / 2
  outer.position.y = -0.18
  outer.receiveShadow = true
  scene.add(outer)

  // painted expansion joints that stop short of the pool
  const jointMat = new THREE.MeshBasicMaterial({ color: 0x948b7a, transparent: true, opacity: 0.5 })
  for (let i = -4; i <= 4; i++) {
    const z = i * 7.4
    if (Math.abs(z - bowl.cz) < bowl.r + 0.4) {
      const half = Math.sqrt(Math.max(0, bowl.r * bowl.r - (z - bowl.cz) ** 2))
      const a = bowl.cx - half, b = bowl.cx + half
      for (const [u0, u1] of [[-HALF, a], [b, HALF]]) {
        if (u1 - u0 < 0.5) continue
        const line = new THREE.Mesh(new THREE.PlaneGeometry(u1 - u0, 0.09), jointMat)
        line.rotation.x = -Math.PI / 2
        line.position.set((u0 + u1) / 2, 0.012, z)
        scene.add(line)
      }
    } else {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, 0.09), jointMat)
      line.rotation.x = -Math.PI / 2
      line.position.set(0, 0.012, z)
      scene.add(line)
    }
    const x = i * 7.4
    if (Math.abs(x - bowl.cx) < bowl.r + 0.4) {
      const half = Math.sqrt(Math.max(0, bowl.r * bowl.r - (x - bowl.cx) ** 2))
      const a = bowl.cz - half, b = bowl.cz + half
      for (const [v0, v1] of [[-HALF, a], [b, HALF]]) {
        if (v1 - v0 < 0.5) continue
        const line2 = new THREE.Mesh(new THREE.PlaneGeometry(0.09, v1 - v0), jointMat)
        line2.rotation.x = -Math.PI / 2
        line2.position.set(x, 0.012, (v0 + v1) / 2)
        scene.add(line2)
      }
    } else {
      const line2 = new THREE.Mesh(new THREE.PlaneGeometry(0.09, HALF * 2), jointMat)
      line2.rotation.x = -Math.PI / 2
      line2.position.set(x, 0.012, 0)
      scene.add(line2)
    }
  }

  // painted center decal
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 15),
    new THREE.MeshBasicMaterial({ map: decalMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
  )
  decal.rotation.x = -Math.PI / 2
  decal.position.set(0, 0.025, 10.5)
  scene.add(decal)

  // a few painted slabs / colour blocking
  const paintBlock = (x, z, w, d, color, rot = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 }))
    m.rotation.x = -Math.PI / 2
    m.rotation.z = rot
    m.position.set(x, 0.02, z)
    scene.add(m)
  }
  paintBlock(-21, 17, 8, 3, 0x12b8a6, 0.1)
  paintBlock(4, 19, 10, 1.2, 0xff5a1f, -0.15)
  paintBlock(25, -16, 10, 2, 0xffd23f, 0.3)

  // printed graphics on the flat pads
  const padPrint = (map, x, z, w, d, y, rot = 0) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
    )
    mesh.rotation.x = -Math.PI / 2
    mesh.rotation.z = rot
    mesh.position.set(x, y, z)
    scene.add(mesh)
    return mesh
  }

  /* ---------------- height field surfaces ---------------- */
  function addBox(x0, x1, z0, z1, h, type = 'box') {
    surfaces.push({ type, x0, x1, z0, z1, height: () => h, h })
  }

  const boxMesh = (x0, x1, z0, z1, h, mat = concrete, y = 0) => {
    const w = x1 - x0, d = z1 - z0
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    mesh.position.set((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2)
    return add(mesh)
  }

  function addWedge(x0, x1, z0, z1, h, dir, mat = concrete) {
    // dir: 'z+' rises toward +z, 'z-' rises toward -z
    const t = (z) => dir === 'z+' ? (z - z0) / (z1 - z0) : (z1 - z) / (z1 - z0)
    const height = (x, z) => h * Math.max(0, Math.min(1, t(z)))
    surfaces.push({ type: 'wedge', x0, x1, z0, z1, height, h, dir })
    const geo = gridGeometry(x0, x1, z0, z1, 8, 10, height)
    add(new THREE.Mesh(geo, mat))
    add(new THREE.Mesh(sideWallGeometry(x0, z0, z1, 12, height), concreteDark), true, true)
    add(new THREE.Mesh(sideWallGeometry(x1, z0, z1, 12, height), concreteDark), true, true)
    const topZ = dir === 'z+' ? z1 : z0
    add(new THREE.Mesh(endWallGeometry(topZ, x0, x1, 8, height), concreteDark), true, true)
    // metal edge at the top lip
    const lip = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.045, 0.1), metal)
    lip.position.set((x0 + x1) / 2, h - 0.01, topZ)
    add(lip)
    // painted chevrons on the ramp
    for (let i = 1; i <= 3; i++) {
      const tz = dir === 'z+' ? z0 + (z1 - z0) * (i / 4) : z1 - (z1 - z0) * (i / 4)
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 0.5, 0.3), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff5a1f : 0xf6e5c4, transparent: true, opacity: 0.7 }))
      bar.rotation.x = -Math.PI / 2
      bar.position.set((x0 + x1) / 2, height(0, tz) + 0.018, tz)
      scene.add(bar)
    }
    return { height }
  }

  function addQuarter(baseX, dir, r, z0, z1, mat = vertMat) {
    // dir -1: rises toward -x (left wall). dir +1: rises toward +x.
    const lipX = baseX + dir * r
    const x0 = Math.min(baseX, lipX), x1 = Math.max(baseX, lipX)
    const height = (x, z) => {
      const d = dir < 0 ? baseX - x : x - baseX
      if (d <= 0) return 0
      if (d >= r) return r
      return r - Math.sqrt(Math.max(0, r * r - d * d))
    }
    surfaces.push({ type: 'quarter', x0, x1, z0, z1, height, h: r, dir, baseX, lipX, r })
    const geo = gridGeometry(x0, x1, z0, z1, 24, 24, height, (x, z, i, j) => {
      const d = dir < 0 ? baseX - x : x - baseX
      return [(z - z0) / 7, Math.min(1, Math.max(0, d / r))]
    })
    add(new THREE.Mesh(geo, mat))
    add(new THREE.Mesh(sideWallGeometry(x0, z0, z1, 24, height), concreteDark), true, true)
    add(new THREE.Mesh(sideWallGeometry(x1, z0, z1, 24, height), concreteDark), true, true)
    // deck behind lip
    const deckX0 = dir < 0 ? -HALF : lipX
    const deckX1 = dir < 0 ? lipX : HALF
    const deck = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(deckX1 - deckX0), 0.35, z1 - z0), concrete)
    deck.position.set((deckX0 + deckX1) / 2, r - 0.175, (z0 + z1) / 2)
    add(deck)
    surfaces.push({ type: 'box', x0: Math.min(deckX0, deckX1), x1: Math.max(deckX0, deckX1), z0, z1, height: () => r, h: r })

    // coping
    const coping = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, z1 - z0, 12), metal)
    coping.rotation.x = Math.PI / 2
    coping.position.set(lipX, r + 0.02, (z0 + z1) / 2)
    add(coping)
    rails.push({
      ax: lipX, az: z0 + 0.1, bx: lipX, bz: z1 - 0.1, y: r + 0.08,
      kind: 'coping', name: 'VERT COPING',
    })

    // vertical back wall behind the deck
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.8, r + 4.4, z1 - z0 + 6), concreteDark)
    wall.position.set(dir < 0 ? -HALF - 0.4 : HALF + 0.4, (r + 4.4) / 2, (z0 + z1) / 2)
    add(wall)
    const mural = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0 + 5, 5.4), artMaterial(dir < 0 ? 1 : 2, z1 - z0 + 5, 5.4, 0.17))
    mural.position.set(dir < 0 ? -HALF + 0.012 : HALF - 0.012, r + 1.3, (z0 + z1) / 2)
    mural.rotation.y = dir < 0 ? Math.PI / 2 : -Math.PI / 2
    add(mural, false, false)
    // coping paint line
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, 0.28), painted.yellow)
    stripe.position.set(dir < 0 ? -HALF + 0.02 : HALF - 0.02, r + 0.18, (z0 + z1) / 2)
    stripe.rotation.y = dir < 0 ? Math.PI / 2 : -Math.PI / 2
    scene.add(stripe)
    return { height }
  }

  /* ---------------- center funbox ---------------- */
  // top
  addBox(-5, 5, -9, -1, 1.2)
  boxMesh(-5, 5, -9, -1, 1.2)
  // kickers both sides (ramps rise toward the box)
  addWedge(-5, 5, -1, 3.2, 1.2, 'z-')
  addWedge(-5, 5, -13.2, -9, 1.2, 'z+')
  // colored top stripe + side art
  const fbStripe = new THREE.Mesh(new THREE.BoxGeometry(10.06, 0.09, 8.06), painted.orange)
  fbStripe.position.set(0, 1.24, -5)
  add(fbStripe)
  const fbStripe2 = new THREE.Mesh(new THREE.BoxGeometry(10.1, 0.06, 8.1), painted.cream)
  fbStripe2.position.set(0, 1.16, -5)
  add(fbStripe2)
  padPrint(padFunMap, 0, -5, 9.4, 7.4, 1.30, 0)
  const sideArt = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 0.95), artMaterial(0, 7.4, 0.95, 0.05))
  sideArt.position.set(5.012, 0.62, -5)
  sideArt.rotation.y = Math.PI / 2
  add(sideArt, false, false)
  const sideArt2 = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 0.95), artMaterial(2, 7.4, 0.95, 0.55))
  sideArt2.position.x = -5.012
  sideArt2.rotation.y = -Math.PI / 2
  add(sideArt2, false, false)
  // rails on the deck
  for (const x of [-3.4, 3.4]) {
    rails.push({ ax: x, az: -8.2, bx: x, bz: -1.8, y: 1.52, kind: 'rail', name: 'FUNBOX RAIL' })
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 6.4, 8), metal)
    r.rotation.x = Math.PI / 2
    r.position.set(x, 1.48, -5)
    add(r)
    for (const z of [-7.6, -5, -2.4]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), metal)
      post.position.set(x, 1.33, z)
      add(post)
    }
  }
  // coping along the top side edges
  for (const x of [-5, 5]) {
    rails.push({ ax: x, az: -8.9, bx: x, bz: -1.1, y: 1.255, kind: 'ledge', name: 'FUNBOX EDGE' })
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 7.8), metal)
    edge.position.set(x, 1.21, -5)
    add(edge)
  }

  /* ---------------- vert quarter pipes ---------------- */
  addQuarter(-27.5, -1, 4.8, -11, 11)
  addQuarter(27.5, 1, 4.8, -11, 11)

  /* ---------------- far bank + platform ---------------- */
  addBox(-11, 11, -30, -23, 2.2)
  boxMesh(-11, 11, -30, -23, 2.2)
  addWedge(-11, 11, -23, -16, 2.2, 'z-')
  // platform lip rail
  rails.push({ ax: -7.5, az: -28.9, bx: 7.5, bz: -28.9, y: 2.7, kind: 'rail', name: 'PLATFORM RAIL' })
  const platRail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 15, 8), metal)
  platRail.rotation.z = Math.PI / 2
  platRail.position.set(0, 2.66, -28.9)
  add(platRail)
  for (const x of [-6, 0, 6]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.46, 6), metal)
    post.position.set(x, 2.43, -28.9)
    add(post)
  }
  // front ledge of platform (drop edge)
  for (const x of [-11, 11]) {
    rails.push({ ax: x, az: -30, bx: x, bz: -23, y: 2.26, kind: 'ledge', name: 'PLATFORM EDGE' })
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 7), metal)
    edge.position.set(x, 2.21, -26.5)
    add(edge)
  }
  // big wall art behind platform
  const farMural = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.2), artMaterial(3, 13, 3.2, 0.42))
  farMural.position.set(-21, 2.6, -33.9)
  add(farMural, false, false)
  // orange stripe on the platform face
  const platStripe = new THREE.Mesh(new THREE.BoxGeometry(22.05, 0.18, 0.08), painted.teal)
  platStripe.position.set(0, 2.1, -23.0)
  add(platStripe)

  /* ---------------- street pads ---------------- */
  // manual pad
  addBox(-22, -15, -2, 5, 0.5)
  boxMesh(-22, -15, -2, 5, 0.5, painted.navy)
  const padTop = new THREE.Mesh(new THREE.BoxGeometry(7.02, 0.045, 7.02), painted.orange)
  padTop.position.set(-18.5, 0.51, 1.5)
  add(padTop)
  padPrint(padManualMap, -18.5, 1.5, 6.3, 6.3, 0.545, 0.06)
  rails.push({ ax: -21.9, az: -1.9, bx: -15.1, bz: -1.9, y: 0.57, kind: 'ledge', name: 'MANUAL PAD' })
  rails.push({ ax: -21.9, az: 4.9, bx: -15.1, bz: 4.9, y: 0.57, kind: 'ledge', name: 'MANUAL PAD' })

  // long ledge
  addBox(13, 20, 2, 8, 0.8)
  boxMesh(13, 20, 2, 8, 0.8)
  const ledgeTop = new THREE.Mesh(new THREE.BoxGeometry(7.05, 0.05, 6.05), painted.teal)
  ledgeTop.position.set(16.5, 0.81, 5)
  add(ledgeTop)
  padPrint(padLedgeMap, 16.5, 5, 6.4, 5.4, 0.845, -0.04)
  for (const z of [2, 8]) {
    rails.push({ ax: 13.05, az: z, bx: 19.95, bz: z, y: 0.86, kind: 'ledge', name: 'LEDGE' })
    const edge = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.05, 0.09), metal)
    edge.position.set(16.5, 0.81, z)
    add(edge)
  }

  // flat rail
  rails.push({ ax: 7.5, az: 4.5, bx: 7.5, bz: 19.5, y: 0.6, kind: 'rail', name: 'FLAT BAR' })
  {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 15, 8), metal)
    rail.rotation.x = Math.PI / 2
    rail.position.set(7.5, 0.56, 12)
    add(rail)
    for (const z of [5.2, 9.3, 13.4, 17.5, 19]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.56, 6), metal)
      post.position.set(7.5, 0.28, z)
      add(post)
    }
  }

  // low rail near the manual pad
  rails.push({ ax: -9, az: 7, bx: -9, bz: 16.5, y: 0.55, kind: 'rail', name: 'LOW BAR' })
  {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 9.5, 8), metal)
    rail.rotation.x = Math.PI / 2
    rail.position.set(-9, 0.51, 11.75)
    add(rail)
    for (const z of [7.4, 11.2, 15]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), metal)
      post.position.set(-9, 0.26, z)
      add(post)
    }
  }

  // kickers
  addWedge(-21.5, -17.5, 17, 21, 1.15, 'z-', painted.teal)
  addWedge(20.5, 24.5, -14, -10, 1.0, 'z-', painted.orange)
  // small bank on the west edge
  addWedge(-30, -25.5, 16, 24, 1.3, 'z+', concreteDark)

  /* ---------------- bowl ---------------- */
  {
    const { cx, cz, r, depth, trans } = bowl
    const bowlHeight = (x, z) => {
      const rr = Math.hypot(x - cx, z - cz)
      if (rr > r) return 0
      if (rr < r - trans) return -depth
      const t = (rr - (r - trans)) / trans
      return -depth * (1 - Math.sqrt(Math.max(0, 1 - t * t)))
    }
    const rings = 26, seg = 64
    const positions = []
    const uvs = []
    const indices = []
    // center vertex
    positions.push(cx, -depth, cz)
    uvs.push(0.5, 0.5)
    for (let ri = 1; ri <= rings; ri++) {
      const rr = (ri / rings) * r
      for (let si = 0; si < seg; si++) {
        const a = (si / seg) * Math.PI * 2
        const x = cx + Math.cos(a) * rr
        const z = cz + Math.sin(a) * rr
        positions.push(x, bowlHeight(x, z), z)
        uvs.push(0.5 + Math.cos(a) * 0.5 * (rr / r), 0.5 + Math.sin(a) * 0.5 * (rr / r))
      }
    }
    for (let si = 0; si < seg; si++) {
      const b = 1 + si
      const c = 1 + ((si + 1) % seg)
      indices.push(0, c, b)
    }
    for (let ri = 1; ri < rings; ri++) {
      const start = 1 + (ri - 1) * seg
      const next = 1 + ri * seg
      for (let si = 0; si < seg; si++) {
        const s2 = (si + 1) % seg
        const a = start + si
        const b = start + s2
        const c = next + si
        const d = next + s2
        indices.push(a, c, b, b, c, d)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    const bowlMesh = new THREE.Mesh(geo, poolMat)
    bowlMesh.material.side = THREE.DoubleSide
    bowlMesh.receiveShadow = true
    bowlMesh.castShadow = false
    scene.add(bowlMesh)

    // coping ring
    const coping = new THREE.Mesh(new THREE.TorusGeometry(r, 0.11, 10, 80), metal)
    coping.rotation.x = Math.PI / 2
    coping.position.set(cx, 0.03, cz)
    add(coping)
    // ladder
    const ladder = new THREE.Group()
    for (const sx of [-0.28, 0.28]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.2, 8), metal)
      bar.position.set(sx, 0.7, 0)
      ladder.add(bar)
    }
    for (let i = 0; i < 4; i++) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.56, 8), metal)
      rung.rotation.z = Math.PI / 2
      rung.position.set(0, 0.1 + i * 0.5, 0)
      ladder.add(rung)
    }
    ladder.position.set(cx - r + 0.05, -0.2, cz + 2.2)
    ladder.rotation.y = 0.5
    ladder.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
    scene.add(ladder)

    // painted deck ring outside coping
    const deckRing = new THREE.Mesh(new THREE.RingGeometry(r + 0.05, r + 1.1, 80), new THREE.MeshBasicMaterial({ color: 0xff5a1f, transparent: true, opacity: 0.35 }))
    deckRing.rotation.x = -Math.PI / 2
    deckRing.position.set(cx, 0.025, cz)
    scene.add(deckRing)

    bowl.heightAt = bowlHeight
  }

  /* ---------------- perimeter walls ---------------- */
  const wallH = 2.2
  const wallTex = concreteSideMap.clone()
  wallTex.repeat.set(7, 2)
  wallTex.needsUpdate = true
  const wallMatMap = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.94 })
  const addWallPanel = (x, z, w, h, rotY, matIndex = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.7), wallMatMap)
    mesh.position.set(x, h / 2, z)
    mesh.rotation.y = rotY
    add(mesh)
    // segmented, properly proportioned graffiti instead of one stretched decal
    const segments = Math.max(1, Math.round(w / 13))
    const segW = w / segments
    const artH = Math.min(h - 0.35, 2.15)
    for (let i = 0; i < segments; i++) {
      const artW = segW - 0.55
      const art = new THREE.Mesh(
        new THREE.PlaneGeometry(artW, artH),
        artMaterial(matIndex + i, artW, artH, i * 0.31 + matIndex * 0.13)
      )
      art.position.set(x, h * 0.5, z)
      art.rotation.y = rotY
      art.translateX((i - (segments - 1) / 2) * segW)
      art.translateZ(0.355)
      add(art, false, false)
    }
    // cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.9), painted.cream)
    cap.position.set(x, h + 0.03, z)
    cap.rotation.y = rotY
    add(cap)
    return mesh
  }
  // near wall with gate graphic (entry)
  addWallPanel(0, HALF + 0.35, HALF * 2, wallH, Math.PI, 0)
  addWallPanel(-HALF - 0.35, -24, 20, 2.8, Math.PI / 2, 2)
  addWallPanel(-HALF - 0.35, 24, 20, 2.8, Math.PI / 2, 2)
  addWallPanel(HALF + 0.35, -24, 20, 2.8, -Math.PI / 2, 3)
  addWallPanel(HALF + 0.35, 24, 20, 2.8, -Math.PI / 2, 3)
  addWallPanel(0, -HALF - 0.35, HALF * 2, 6.4, 0, 1)

  // gate detail on near wall
  const gate = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.05), new THREE.MeshStandardMaterial({ color: 0x2d3c42, roughness: 0.7, metalness: 0.4 }))
  gate.position.set(0, 1.03, HALF - 0.012)
  gate.rotation.y = Math.PI
  scene.add(gate)
  for (let i = -2; i <= 2; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.05, 0.08), darkMetal)
    bar.position.set(i * 1.2, 1.03, HALF - 0.03)
    scene.add(bar)
  }
  const gateSign = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.1), new THREE.MeshBasicMaterial({ map: bannerMap }))
  gateSign.position.set(0, 2.5, HALF - 0.02)
  gateSign.rotation.y = Math.PI
  scene.add(gateSign)

  // big banner on far wall
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(15, 3.75), new THREE.MeshBasicMaterial({ map: bannerMap }))
  banner.position.set(0, 4.25, -HALF + 0.02)
  banner.rotation.y = 0
  add(banner, false, false)

  // left/right tall walls behind quarter pipes are created in addQuarter

  /* ---------------- props ---------------- */
  const propRnd = mulberry32(31)
  // lamp posts
  const lampSpots = [[-29, 27], [29, 27], [-29, -20], [29, -20]]
  for (const [x, z] of lampSpots) {
    const group = new THREE.Group()
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 6.4, 8), darkMetal)
    pole.position.y = 3.2
    group.add(pole)
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.12), darkMetal)
    arm.position.set(0.55, 6.35, 0)
    group.add(arm)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.34), painted.yellow)
    head.position.set(1.2, 6.28, 0)
    group.add(head)
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.26), new THREE.MeshBasicMaterial({ color: 0xfff4c9, transparent: true, opacity: 0.8 }))
    glow.rotation.x = Math.PI / 2
    glow.position.set(1.2, 6.16, 0)
    group.add(glow)
    group.position.set(x, 0, z)
    group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
    scene.add(group)
  }

  // benches
  for (const [x, z, rot] of [[-10, 27, 0], [12, 28.5, 0.3], [26, -22, Math.PI / 2]]) {
    const g = new THREE.Group()
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 0.55), painted.orange)
    seat.position.y = 0.52
    g.add(seat)
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.12), painted.orange)
    back.position.set(0, 0.82, -0.24)
    back.rotation.x = -0.12
    g.add(back)
    for (const sx of [-0.95, 0.95]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.48), darkMetal)
      leg.position.set(sx, 0.26, 0)
      g.add(leg)
    }
    g.position.set(x, 0, z)
    g.rotation.y = rot
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
    scene.add(g)
    surfaces.push({ type: 'box', x0: x - 1.3, x1: x + 1.3, z0: z - 0.6, z1: z + 0.6, height: () => 0.55, h: 0.55 })
    rails.push({ ax: x - 1.2, az: z, bx: x + 1.2, bz: z, y: 0.61, kind: 'ledge', name: 'BENCH' })
  }

  // trash cans & cones
  const trashMat = new THREE.MeshStandardMaterial({ color: 0x2f6b63, roughness: 0.65, metalness: 0.35 })
  for (const [x, z] of [[-7, 27], [24, 13], [-25, -14]]) {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.9, 14), trashMat)
    can.position.set(x, 0.45, z)
    add(can)
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 14), darkMetal)
    lid.position.set(x, 0.93, z)
    add(lid)
  }
  for (const [x, z] of [[13, 22], [22, 9], [-24, 21], [-12, -16]]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 12), painted.orange)
    cone.position.set(x, 0.28, z)
    add(cone)
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.38), painted.orange)
    base.position.set(x, 0.03, z)
    add(base)
  }

  // picnic table outside, bleachers
  const bleacher = new THREE.Group()
  for (let row = 0; row < 3; row++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(16, 0.32 + row * 0.28, 1.2), concreteDark)
    step.position.set(0, 0.16 + (0.32 + row * 0.28) / 2, row * 1.1)
    bleacher.add(step)
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(16, 0.08, 0.3), row === 0 ? painted.orange : row === 1 ? painted.teal : painted.yellow)
    stripe.position.set(0, 0.34 + row * 0.28, row * 1.1 + 0.4)
    bleacher.add(stripe)
  }
  bleacher.position.set(10, 0, 39.5)
  bleacher.rotation.y = Math.PI
  bleacher.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
  scene.add(bleacher)

  // water tower in the distance
  {
    const g = new THREE.Group()
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 5, 20), new THREE.MeshStandardMaterial({ color: 0xd8cbb2, roughness: 0.8 }))
    tank.position.y = 20
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.8, 2.4, 20), new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.85 }))
    roof.position.y = 23.7
    g.add(tank, roof)
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 18, 6), darkMetal)
      leg.position.set(Math.cos(a) * 3.6, 9, Math.sin(a) * 3.6)
      leg.rotation.z = Math.cos(a) * 0.06
      leg.rotation.x = Math.sin(a) * 0.06
      g.add(leg)
    }
    // painted band + lettering
    const band = new THREE.Mesh(new THREE.CylinderGeometry(5.52, 5.52, 1.1, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide }))
    band.position.y = 19.8
    g.add(band)
    g.position.set(-58, 0, -46)
    g.rotation.y = 0.4
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
    scene.add(g)
  }

  // palm trees
  const palmMat = new THREE.MeshStandardMaterial({ color: 0x2f6b3d, roughness: 0.85, side: THREE.DoubleSide })
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6748, roughness: 0.95 })
  function makeFrond(length, droop) {
    const seg = 8
    const pos = []
    const idx = []
    for (let i = 0; i <= seg; i++) {
      const t = i / seg
      const z = t * length
      const y = Math.sin(t * Math.PI * 0.65) * 1.2 - t * t * droop
      const wid = (1 - t * 0.85) * 0.42
      pos.push(-wid, y, z, wid, y, z)
      if (i < seg) {
        const a = i * 2
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }
  const frondGeo = makeFrond(4.2, 2.4)
  const frondGeo2 = makeFrond(3.3, 1.9)
  function palm(x, z, scale, rot, seed) {
    const g = new THREE.Group()
    const rnd = mulberry32(seed)
    let py = 0
    let px = 0
    for (let i = 0; i < 7; i++) {
      const hseg = 1.25 * scale
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * scale * (1 - i * 0.045), 0.32 * scale * (1 - i * 0.04), hseg, 8), trunkMat)
      const bend = i * 0.13
      trunk.position.set(px, py + hseg / 2, 0)
      trunk.rotation.z = -bend
      g.add(trunk)
      py += hseg * 0.96
      px += Math.sin(bend) * hseg * 0.5
    }
    const crown = new THREE.Group()
    crown.position.set(px, py, 0)
    for (let i = 0; i < 9; i++) {
      const frond = new THREE.Mesh(i % 3 === 0 ? frondGeo2 : frondGeo, palmMat)
      frond.rotation.y = (i / 9) * Math.PI * 2 + rnd() * 0.3
      frond.rotation.x = -0.1 + rnd() * 0.14
      frond.position.y = 0.1
      frond.scale.setScalar(0.8 + rnd() * 0.35)
      crown.add(frond)
    }
    for (let i = 0; i < 4; i++) {
      const nut = new THREE.Mesh(new THREE.SphereGeometry(0.2 * scale, 6, 5), new THREE.MeshStandardMaterial({ color: 0x5a4326, roughness: 0.9 }))
      const a = (i / 4) * Math.PI * 2
      nut.position.set(Math.cos(a) * 0.35, -0.1, Math.sin(a) * 0.35)
      crown.add(nut)
    }
    g.add(crown)
    g.position.set(x, 0, z)
    g.rotation.y = rot
    g.scale.setScalar(1)
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
    scene.add(g)
    palms.push({ group: g, crown, phase: rnd() * 6.28, baseRot: rot })
  }
  palm(-44, 18, 1.35, 0.3, 1)
  palm(-41, 31, 1.1, 1.3, 2)
  palm(42, 22, 1.5, 2.1, 3)
  palm(46, -8, 1.2, 3.4, 4)
  palm(-47, -15, 1.25, 4.2, 5)
  palm(39, -28, 1.05, 5.1, 6)
  palm(-38, -35, 1.15, 1.8, 7)

  // distant city
  const cityRnd = mulberry32(88)
  const cityTints = [0xffffff, 0xf4e7d1, 0xd9e7e9, 0xeadfc9]
  for (let i = 0; i < 26; i++) {
    const a = cityRnd() * Math.PI * 2
    const r = 132 + cityRnd() * 95
    const w = 10 + cityRnd() * 20
    const h = 15 + cityRnd() * 47
    const d = w * (0.65 + cityRnd() * 0.8)
    const tex = windowMap.clone()
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(Math.max(1, Math.round(w / 24)), Math.max(1, Math.round(h / 34)))
    tex.needsUpdate = true
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: cityTints[i % cityTints.length], fog: true })
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    b.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r)
    b.rotation.y = cityRnd() * 1.5
    scene.add(b)
    // rooftop slab / mechanical box
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 1.1, d * 0.72), new THREE.MeshBasicMaterial({ color: 0x73858b, fog: true }))
    roof.position.set(b.position.x, h - 0.45, b.position.z)
    roof.rotation.y = b.rotation.y
    scene.add(roof)
    if (i % 3 === 0) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w * 0.26, 2 + cityRnd() * 3, d * 0.26), new THREE.MeshBasicMaterial({ color: 0x8e9ea2, fog: true }))
      box.position.set(b.position.x + w * 0.15, h + 1.2, b.position.z - d * 0.1)
      box.rotation.y = b.rotation.y
      scene.add(box)
    }
    if (i === 3 || i === 11 || i === 19) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 20, 5), new THREE.MeshBasicMaterial({ color: 0x7d8f95, fog: true }))
      mast.position.set(b.position.x, h + 9, b.position.z)
      scene.add(mast)
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff5a1f, fog: true }))
      beacon.position.set(b.position.x, h + 19, b.position.z)
      scene.add(beacon)
    }
    // occasional rooftop billboard
    if (i === 5 || i === 14) {
      const boardMat = new THREE.MeshBasicMaterial({ map: bannerMap, fog: true, side: THREE.DoubleSide })
      const board = new THREE.Mesh(new THREE.PlaneGeometry(19, 4.75), boardMat)
      board.position.set(b.position.x, h + 5, b.position.z + d * 0.52)
      board.rotation.y = b.rotation.y
      scene.add(board)
      for (const sx of [-6, 6]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), new THREE.MeshBasicMaterial({ color: 0x6d7e84, fog: true }))
        leg.position.set(b.position.x + sx, h + 2.5, b.position.z + d * 0.52)
        scene.add(leg)
      }
    }
  }
  // low hills
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4
    const hill = new THREE.Mesh(new THREE.SphereGeometry(45 + i * 6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xac9674, roughness: 1 }))
    hill.position.set(Math.cos(a) * 160, -8, Math.sin(a) * 160)
    hill.scale.y = 0.28
    hill.receiveShadow = false
    scene.add(hill)
  }

  /* ---------------- ground sampling ---------------- */
  const sampleEps = 0.22
  function rawHeight(x, z) {
    // world bounds: beyond plaza it is the outer sand
    if (Math.abs(x) > HALF || Math.abs(z) > HALF) return -0.18
    let h = 0
    for (let i = 0; i < surfaces.length; i++) {
      const s = surfaces[i]
      if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue
      const y = s.height(x, z)
      if (y > h) h = y
    }
    const rr = Math.hypot(x - bowl.cx, z - bowl.cz)
    if (rr <= bowl.r) {
      const bh = bowl.heightAt(x, z)
      if (bh < h) h = bh
    }
    return h
  }

  const up = new THREE.Vector3(0, 1, 0)
  function groundInfo(x, z) {
    const y = rawHeight(x, z)
    const hx = (rawHeight(x + sampleEps, z) - rawHeight(x - sampleEps, z)) / (2 * sampleEps)
    const hz = (rawHeight(x, z + sampleEps) - rawHeight(x, z - sampleEps)) / (2 * sampleEps)
    const normal = new THREE.Vector3(-hx, 1, -hz).normalize()
    let type = 'flat'
    let surface = null
    let best = 0
    for (const s of surfaces) {
      if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue
      const h = s.height(x, z)
      if (h >= best) { best = h; type = s.type; surface = s }
    }
    const rr = Math.hypot(x - bowl.cx, z - bowl.cz)
    if (rr <= bowl.r && bowl.heightAt(x, z) <= best + 0.001) type = 'bowl'
    return { y, normal, type, surface, gradient: Math.hypot(hx, hz) }
  }

  /* ---------------- animation ---------------- */
  let t = 0
  function update(dt) {
    t += dt
    for (const p of palms) {
      p.crown.rotation.z = Math.sin(t * 0.8 + p.phase) * 0.04
      p.crown.rotation.x = Math.cos(t * 0.65 + p.phase) * 0.03
    }
    for (const c of clouds) {
      c.a += c.speed * dt
      c.sprite.position.x = Math.cos(c.a) * c.r
      c.sprite.position.z = Math.sin(c.a) * c.r - 10
      c.sprite.position.y = c.y + Math.sin(t * 0.12 + c.a) * 2
    }
  }

  return {
    groundInfo,
    rails,
    spawn: { x: 0, z: 20, heading: Math.PI },
    bounds: { x0: -CLAMP, x1: CLAMP, z0: -CLAMP, z1: CLAMP },
    update,
    sky,
    sun,
    bowl,
    skaterTextures: { deck: deckMap, grip: gripMap },
  }
}
