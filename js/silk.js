/* Silk — raw WebGL fragment shader background for the hero.
   Domain-warped fbm noise rendered as flowing fabric; palette espresso → gold → cherry.
   No dependencies. Pauses when offscreen. */
(function () {
  const canvas = document.getElementById('silk');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) { canvas.style.display = 'none'; return; }

  const VERT = `
    attribute vec2 p;
    void main(){ gl_Position = vec4(p, 0.0, 1.0); }
  `;
  const FRAG = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_mouse;
    uniform float u_intro;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i = floor(p); vec2 f = fract(p);
      vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1.,0.)), u.x),
                 mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), u.x), u.y);
    }
    float fbm(vec2 p){
      float v = 0.0; float a = 0.5;
      mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
      for(int i=0;i<5;i++){ v += a*noise(p); p = r*p*2.03 + 0.7; a *= 0.5; }
      return v;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / u_res.xy;
      vec2 p = uv; p.x *= u_res.x / u_res.y;
      float t = u_time * 0.08;

      vec2 m = (u_mouse - 0.5) * vec2(u_res.x/u_res.y, 1.0);
      float md = length(p - vec2(0.5*u_res.x/u_res.y, 0.5) - m*0.6);
      float mouseInf = smoothstep(0.9, 0.0, md) * 0.35;

      vec2 q = vec2(fbm(p*1.6 + t), fbm(p*1.6 + vec2(5.2, 1.3) - t*0.7));
      vec2 r = vec2(fbm(p*1.6 + 2.0*q + vec2(1.7, 9.2) + t*0.6 + mouseInf),
                    fbm(p*1.6 + 2.0*q + vec2(8.3, 2.8) - t*0.4));
      float f = fbm(p*1.6 + 2.6*r);

      // silk sheen: thin bright ridges along the warped field
      float ridge = pow(1.0 - abs(sin(f*10.0 + r.x*4.0)), 6.0);

      vec3 espresso = vec3(0.047, 0.039, 0.035);
      vec3 wine     = vec3(0.30, 0.09, 0.13);
      vec3 gold     = vec3(0.847, 0.702, 0.416);
      vec3 cherry   = vec3(1.0, 0.184, 0.306);

      vec3 col = mix(espresso, wine, smoothstep(0.25, 0.75, f));
      col = mix(col, cherry*0.75, smoothstep(0.55, 0.95, r.y) * 0.55);
      col += gold * ridge * 0.55;
      col += gold * pow(f, 3.0) * 0.25;

      // vignette + intro fade
      float vig = smoothstep(1.35, 0.35, length((uv - 0.5) * vec2(1.4, 1.1)));
      col *= mix(0.35, 1.0, vig);
      col *= u_intro;

      // dither to kill banding
      col += (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.012;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');
  const uIntro = gl.getUniformLocation(prog, 'u_intro');

  const state = { w: 0, h: 0, mx: 0.5, my: 0.5, tx: 0.5, ty: 0.5, intro: 0, visible: true, start: performance.now() };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.floor(canvas.clientWidth * dpr * 0.75);
    const h = Math.floor(canvas.clientHeight * dpr * 0.75);
    if (w === state.w && h === state.h) return;
    state.w = w; state.h = h;
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  window.addEventListener('pointermove', (e) => {
    state.tx = e.clientX / window.innerWidth;
    state.ty = 1 - e.clientY / window.innerHeight;
  }, { passive: true });

  const io = new IntersectionObserver((entries) => { state.visible = entries[0].isIntersecting; }, { threshold: 0.01 });
  io.observe(canvas);

  window.SILK = {
    reveal(duration) {
      const t0 = performance.now(); const d = duration || 1800;
      (function step() {
        const k = Math.min(1, (performance.now() - t0) / d);
        state.intro = 1 - Math.pow(1 - k, 3);
        if (k < 1) requestAnimationFrame(step);
      })();
    }
  };

  function frame(now) {
    requestAnimationFrame(frame);
    if (!state.visible || document.hidden) return;
    resize();
    state.mx += (state.tx - state.mx) * 0.04;
    state.my += (state.ty - state.my) * 0.04;
    const t = reduced ? 0 : (now - state.start) / 1000;
    gl.uniform2f(uRes, state.w, state.h);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, state.mx, state.my);
    gl.uniform1f(uIntro, state.intro);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  requestAnimationFrame(frame);
})();
