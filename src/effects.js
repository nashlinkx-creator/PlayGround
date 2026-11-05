import * as THREE from 'three'

export class ParticleSystem {
  constructor(scene, { color = 0xffffff, additive = false, count = 120, gravity = 8, drag = 1.2, sizeScale = 700 } = {}) {
    this.count = count
    this.gravity = gravity
    this.drag = drag
    this.positions = new Float32Array(count * 3)
    this.vel = new Float32Array(count * 3)
    this.alpha = new Float32Array(count)
    this.size = new Float32Array(count)
    this.life = new Float32Array(count)
    this.maxLife = new Float32Array(count)
    this.cursor = 0

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1))
    this.geo = geo

    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uScale: { value: sizeScale },
      },
      vertexShader: `
        attribute float aAlpha;
        attribute float aSize;
        varying float vAlpha;
        uniform float uScale;
        void main() {
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale / max(0.5, -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        uniform vec3 uColor;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.08, d) * vAlpha;
          if (a < 0.01) discard;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    })

    this.points = new THREE.Points(geo, this.mat)
    this.points.frustumCulled = false
    scene.add(this.points)
  }

  spawn(x, y, z, opt = {}) {
    const i = this.cursor
    this.cursor = (this.cursor + 1) % this.count
    const p = i * 3
    this.positions[p] = x
    this.positions[p + 1] = y
    this.positions[p + 2] = z
    this.vel[p] = opt.vx ?? (Math.random() - 0.5) * 1.6
    this.vel[p + 1] = opt.vy ?? Math.random() * 1.4
    this.vel[p + 2] = opt.vz ?? (Math.random() - 0.5) * 1.6
    const life = opt.life ?? 0.5 + Math.random() * 0.5
    this.life[i] = life
    this.maxLife[i] = life
    this.alpha[i] = opt.alpha ?? 0.7
    this.size[i] = opt.size ?? 0.25 + Math.random() * 0.35
  }

  burst(x, y, z, n = 14, spread = 1, opt = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = (0.4 + Math.random()) * spread
      this.spawn(x, y, z, {
        vx: Math.cos(a) * sp,
        vy: (opt.up ?? 0.8) + Math.random() * 1.6,
        vz: Math.sin(a) * sp,
        size: opt.size ?? (0.18 + Math.random() * 0.4),
        life: opt.life ?? (0.4 + Math.random() * 0.6),
        alpha: opt.alpha ?? 0.55,
      })
    }
  }

  update(dt) {
    const drag = Math.exp(-this.drag * dt)
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) {
        if (this.alpha[i] !== 0) this.alpha[i] = 0
        continue
      }
      this.life[i] -= dt
      const p = i * 3
      this.vel[p + 1] -= this.gravity * dt
      this.vel[p] *= drag
      this.vel[p + 2] *= drag
      this.positions[p] += this.vel[p] * dt
      this.positions[p + 1] += this.vel[p + 1] * dt
      this.positions[p + 2] += this.vel[p + 2] * dt
      const t = Math.max(0, this.life[i] / this.maxLife[i])
      this.alpha[i] = Math.min(0.85, t) * (t > 0.35 ? 1 : t / 0.35)
      this.size[i] *= 1 + dt * 0.6
    }
    this.geo.attributes.position.needsUpdate = true
    this.geo.attributes.aAlpha.needsUpdate = true
    this.geo.attributes.aSize.needsUpdate = true
  }

  setScale(scale) {
    this.mat.uniforms.uScale.value = scale
  }
}
