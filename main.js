// Hero particles: a WebGL port of my OpenGL compute shader particle system (github.com/maelchvlr/shaderLoader).
// Same rules as the original: square points, random colours and directions,
// fade with age, respawn at the cursor. Click anywhere to send them all out at once.

const COUNT = 1000;
const SPEED = 0.3;      // in half-heights per second
const POINT_SIZE = 7;   // CSS pixels
const STRIDE = 6;       // x, y, r, g, b, a

const VERT = `
attribute vec2 position;
attribute vec4 color;
uniform float pointSize;
varying vec4 fragColor;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  gl_PointSize = pointSize;
  fragColor = color;
}
`;

const FRAG = `
precision mediump float;
varying vec4 fragColor;
void main() {
  gl_FragColor = vec4(fragColor.rgb * fragColor.a, fragColor.a);
}
`;

function startParticles() {
  const canvas = document.getElementById('particles');
  const hero = document.getElementById('hero');

  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) { canvas.hidden = true; return; }

  const compile = (type, src) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const program = gl.createProgram();
  try {
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (err) {
    console.error(err);
    canvas.hidden = true;
    return;
  }
  gl.useProgram(program);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const vertices = new Float32Array(COUNT * STRIDE);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength, gl.DYNAMIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  const color = gl.getAttribLocation(program, 'color');
  gl.enableVertexAttribArray(position);
  gl.enableVertexAttribArray(color);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, STRIDE * 4, 0);
  gl.vertexAttribPointer(color, 4, gl.FLOAT, false, STRIDE * 4, 8);
  const pointSize = gl.getUniformLocation(program, 'pointSize');

  let aspect = 1;
  function resize() {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(2, Math.round(box.width * dpr));
    canvas.height = Math.max(2, Math.round(box.height * dpr));
    aspect = box.width / box.height;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(pointSize, POINT_SIZE * dpr);
  }

  // Emitter in clip space. It drifts on its own until the pointer takes over.
  const emitter = { x: 0.45, y: 0.1 };
  let pointerInside = false;

  const particles = Array.from({ length: COUNT }, () => {
    const angle = Math.random() * Math.PI * 2;
    return {
      x: emitter.x, y: emitter.y,
      dx: Math.cos(angle), dy: Math.sin(angle),
      age: 0, life: 1.5 + Math.random() * 1.5,
      r: Math.random(), g: Math.random(), b: Math.random(),
    };
  });

  function respawn(p) {
    p.x = emitter.x;
    p.y = emitter.y;
    p.age = 0;
    p.life = 1 + Math.random() * 4;
  }

  function step(dt) {
    for (const p of particles) {
      p.age += dt;
      if (p.age >= p.life) {
        respawn(p);
      } else {
        p.x += (p.dx * SPEED * dt) / aspect;
        p.y += p.dy * SPEED * dt;
      }
    }
  }

  function draw() {
    particles.forEach((p, i) => {
      const k = i * STRIDE;
      vertices[k] = p.x;
      vertices[k + 1] = p.y;
      vertices[k + 2] = p.r;
      vertices[k + 3] = p.g;
      vertices[k + 4] = p.b;
      vertices[k + 5] = 1 - p.age / p.life;
    });
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, COUNT);
  }

  let visible = true;
  let looping = false;
  let last = 0;

  function moveEmitter(e) {
    const box = canvas.getBoundingClientRect();
    emitter.x = ((e.clientX - box.left) / box.width) * 2 - 1;
    emitter.y = 1 - ((e.clientY - box.top) / box.height) * 2;
  }
  hero.addEventListener('pointermove', (e) => { pointerInside = true; moveEmitter(e); });
  hero.addEventListener('pointerleave', () => { pointerInside = false; });
  hero.addEventListener('pointerdown', (e) => {
    moveEmitter(e);
    particles.forEach(respawn);
  });

  function frame(now) {
    if (!visible || document.hidden) { looping = false; return; }
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    if (!pointerInside) {
      const wide = aspect > 1.25;
      emitter.x = (wide ? 0.45 : 0) + Math.sin(now * 0.00031) * (wide ? 0.4 : 0.6);
      emitter.y = 0.1 + Math.sin(now * 0.00047) * 0.45;
    }
    step(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function loop() {
    if (looping || !visible || document.hidden) return;
    looping = true;
    last = 0;
    requestAnimationFrame(frame);
  }

  resize();
  new ResizeObserver(() => { resize(); draw(); }).observe(canvas);
  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    loop();
  }).observe(hero);
  document.addEventListener('visibilitychange', loop);
  loop();
}

// Clips load and play only while on screen.
function startClips() {
  const clips = document.querySelectorAll('video[data-src]');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still) {
    // Posters stay in place until someone asks for the clip.
    clips.forEach((v) => {
      v.style.cursor = 'pointer';
      v.addEventListener('click', () => {
        if (!v.src) v.src = v.dataset.src;
        if (v.paused) v.play().catch(() => {}); else v.pause();
      });
    });
    return;
  }
  const seen = new IntersectionObserver((entries) => {
    for (const { target: v, isIntersecting } of entries) {
      if (isIntersecting) {
        if (!v.src) v.src = v.dataset.src;
        v.play().catch(() => {});
      } else if (v.src) {
        v.pause();
      }
    }
  }, { rootMargin: '120px 0px' });
  clips.forEach((v) => seen.observe(v));
}

function startReel() {
  const button = document.getElementById('reel-play');
  button.addEventListener('click', () => {
    const frame = document.createElement('div');
    frame.className = 'reel-frame';
    const player = document.createElement('iframe');
    player.src = 'https://www.youtube-nocookie.com/embed/LGbFkxyj4oM?autoplay=1&rel=0';
    player.title = 'Maël Chevalier, demoreel 2025';
    player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    player.allowFullscreen = true;
    frame.append(player);
    button.replaceWith(frame);
  });
}

function startCopy() {
  const button = document.getElementById('copy');
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = 'Copied';
    } catch {
      button.textContent = button.dataset.copy;
    }
    setTimeout(() => { button.textContent = 'Copy address'; }, 1800);
  });
}

startParticles();
startClips();
startReel();
startCopy();
