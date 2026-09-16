/* Silk — raw WebGL fragment shader: domain-warped fbm rendered as flowing fabric.
   Factory so the hero and every lookbook frame share one house texture with different seeds/palettes.
   No dependencies. Pauses offscreen. Recovers from context loss. */
(function () {
  const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  const FRAG = `
    precision highp float;
    uniform vec2 u_res; uniform float u_time; uniform vec2 u_mouse; uniform float u_intro;
    uniform float u_seed; uniform float u_zoom;
    uniform vec3 u_c0; uniform vec3 u_c1; uniform vec3 u_c2; uniform vec3 u_c3;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1.,0.)), u.x), mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), u.x), u.y);
    }
    float fbm(vec2 p){
      float v = 0.0; float a = 0.5; mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
      for(int i=0;i<5;i++){ v += a*noise(p); p = r*p*2.03 + 0.7; a *= 0.5; }
      return v;
    }
    void main(){
      vec2 uv = gl_FragCoord.xy / u_res.xy;
      vec2 p = uv; p.x *= u_res.x / u_res.y; p *= u_zoom; p += u_seed * 7.31;
      float t = u_time * 0.08;
      vec2 m = (u_mouse - 0.5) * vec2(u_res.x/u_res.y, 1.0);
      float md = length(uv * vec2(u_res.x/u_res.y, 1.0) - vec2(0.5*u_res.x/u_res.y, 0.5) - m*0.6);
      float mouseInf = smoothstep(0.9, 0.0, md) * 0.35;
      vec2 q = vec2(fbm(p*1.6 + t), fbm(p*1.6 + vec2(5.2, 1.3) - t*0.7));
      vec2 r = vec2(fbm(p*1.6 + 2.0*q + vec2(1.7, 9.2) + t*0.6 + mouseInf), fbm(p*1.6 + 2.0*q + vec2(8.3, 2.8) - t*0.4));
      float f = fbm(p*1.6 + 2.6*r);
      float ridge = pow(1.0 - abs(sin(f*10.0 + r.x*4.0)), 6.0);
      vec3 col = mix(u_c0, u_c1, smoothstep(0.25, 0.75, f));
      col = mix(col, u_c3*0.75, smoothstep(0.55, 0.95, r.y) * 0.55);
      col += u_c2 * ridge * 0.55;
      col += u_c2 * pow(f, 3.0) * 0.25;
      float vig = smoothstep(1.35, 0.35, length((uv - 0.5) * vec2(1.4, 1.1)));
      col *= mix(0.35, 1.0, vig);
      col *= u_intro;
      col += (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.012;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const PALETTES = {
    hero:      [[0.047,0.039,0.035],[0.30,0.09,0.13],[0.847,0.702,0.416],[1.0,0.184,0.306]],
    cherry:    [[0.10,0.03,0.05],[0.55,0.08,0.16],[1.0,0.42,0.51],[1.0,0.184,0.306]],
    champagne: [[0.16,0.11,0.05],[0.62,0.45,0.20],[0.98,0.90,0.70],[0.847,0.702,0.416]],
    noir:      [[0.03,0.025,0.02],[0.13,0.10,0.09],[0.60,0.52,0.40],[0.30,0.09,0.13]],
    silk:      [[0.35,0.28,0.22],[0.85,0.72,0.55],[1.0,0.97,0.90],[0.90,0.55,0.55]],
    encore:    [[0.06,0.03,0.04],[0.42,0.10,0.18],[0.847,0.702,0.416],[1.0,0.184,0.306]]
  };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = window.matchMedia('(max-width: 720px)').matches;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }

  function create(canvas, opts) {
    opts = Object.assign({ seed: 0, palette: 'hero', zoom: 1, intro: 1, resScale: 0.75, mouse: true }, opts || {});
    const state = { w: 0, h: 0, mx: 0.5, my: 0.5, tx: 0.5, ty: 0.5, intro: opts.intro, visible: true, start: performance.now(), gl: null, u: null, dead: false };
    const pal = PALETTES[opts.palette] || PALETTES.hero;

    function init() {
      const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
      if (!gl) { canvas.style.display = 'none'; state.dead = true; return; }
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog); gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const U = (n) => gl.getUniformLocation(prog, n);
      state.u = { res: U('u_res'), time: U('u_time'), mouse: U('u_mouse'), intro: U('u_intro'), seed: U('u_seed'), zoom: U('u_zoom'), c0: U('u_c0'), c1: U('u_c1'), c2: U('u_c2'), c3: U('u_c3') };
      gl.uniform1f(state.u.seed, opts.seed);
      gl.uniform1f(state.u.zoom, opts.zoom);
      gl.uniform3fv(state.u.c0, pal[0]); gl.uniform3fv(state.u.c1, pal[1]); gl.uniform3fv(state.u.c2, pal[2]); gl.uniform3fv(state.u.c3, pal[3]);
      state.gl = gl; state.w = 0; state.h = 0;
      resize();
    }

    function resize() {
      if (!state.gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const scale = opts.resScale * (isSmall ? 0.7 : 1);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr * scale));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr * scale));
      if (w === state.w && h === state.h) return;
      state.w = w; state.h = h; canvas.width = w; canvas.height = h;
      state.gl.viewport(0, 0, w, h);
    }

    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); state.gl = null; }, false);
    canvas.addEventListener('webglcontextrestored', () => init(), false);
    window.addEventListener('resize', resize, { passive: true });
    if (opts.mouse) {
      window.addEventListener('pointermove', (e) => { state.tx = e.clientX / window.innerWidth; state.ty = 1 - e.clientY / window.innerHeight; }, { passive: true });
    }
    const io = new IntersectionObserver((entries) => { state.visible = entries[0].isIntersecting; }, { threshold: 0.01 });
    io.observe(canvas);

    init();

    function frame(now) {
      if (state.dead) return;
      requestAnimationFrame(frame);
      const gl = state.gl;
      if (!gl || !state.visible || document.hidden) return;
      state.mx += (state.tx - state.mx) * 0.04;
      state.my += (state.ty - state.my) * 0.04;
      const t = reduced ? 0 : (now - state.start) / 1000;
      gl.uniform2f(state.u.res, state.w, state.h);
      gl.uniform1f(state.u.time, t);
      gl.uniform2f(state.u.mouse, state.mx, state.my);
      gl.uniform1f(state.u.intro, state.intro);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    requestAnimationFrame(frame);

    return {
      reveal(duration) {
        const t0 = performance.now(); const d = duration || 1200;
        (function step() {
          const k = Math.min(1, (performance.now() - t0) / d);
          state.intro = 1 - Math.pow(1 - k, 3);
          if (k < 1) requestAnimationFrame(step);
        })();
      },
      resize
    };
  }

  window.Silk = { create, PALETTES };

  // Hero
  const hero = document.getElementById('silk');
  if (hero) window.SILK = create(hero, { seed: 0, palette: 'hero', intro: 0, resScale: 0.75, mouse: true });

  // Frames: <canvas class="art-silk" data-seed="3" data-palette="cherry">
  document.querySelectorAll('canvas.art-silk').forEach((c, i) => {
    create(c, { seed: Number(c.dataset.seed || i + 1), palette: c.dataset.palette || 'cherry', zoom: Number(c.dataset.zoom || 1.4), intro: 1, resScale: 0.5, mouse: false });
  });
})();
