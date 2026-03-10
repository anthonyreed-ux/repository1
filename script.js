/* ============================================
   Fodder King — Animated Shader Backgrounds
   ============================================ */
function initShader(canvas, seed) {
  if (!canvas) return;

  const gl = canvas.getContext('webgl', { alpha: true }) ||
             canvas.getContext('experimental-webgl', { alpha: true });
  if (!gl) return;

  const vsSource = `
    attribute vec2 a_position;
    void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
  `;

  const fsSource = `
    precision mediump float;
    uniform float u_time;
    uniform vec2  u_resolution;
    uniform float u_seed;

    vec2 hash(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)),
               dot(p, vec2(269.5, 183.3)));
      return -1.0 + 2.0 * fract(sin(p + u_seed) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(dot(hash(i + vec2(0.0,0.0)), f - vec2(0.0,0.0)),
            dot(hash(i + vec2(1.0,0.0)), f - vec2(1.0,0.0)), u.x),
        mix(dot(hash(i + vec2(0.0,1.0)), f - vec2(0.0,1.0)),
            dot(hash(i + vec2(1.0,1.0)), f - vec2(1.0,1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      vec2 shift = vec2(100.0);
      mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = rot * p * 2.0 + shift;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      float t = u_time * 0.15;

      float n1 = fbm(uv * 3.0 + t);
      float n2 = fbm(uv * 3.0 + n1 + vec2(1.7, 9.2) + t * 0.5);
      float n3 = fbm(uv * 3.0 + n2 + vec2(8.3, 2.8) + t * 0.3);

      vec3 col1 = vec3(0.06, 0.18, 0.12);
      vec3 col2 = vec3(0.12, 0.35, 0.24);
      vec3 col3 = vec3(0.22, 0.52, 0.38);
      vec3 col4 = vec3(0.85, 0.60, 0.25);

      vec3 color = mix(col1, col2, smoothstep(-0.5, 0.5, n1));
      color = mix(color, col3, smoothstep(-0.3, 0.6, n2) * 0.7);
      color = mix(color, col4, smoothstep(0.3, 0.8, n3) * 0.12);

      float vig = 1.0 - 0.25 * length(uv - 0.5);
      color *= vig;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vs = createShader(gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

  const uTime = gl.getUniformLocation(program, 'u_time');
  const uRes  = gl.getUniformLocation(program, 'u_resolution');
  const uSeed = gl.getUniformLocation(program, 'u_seed');
  const aPos  = gl.getAttribLocation(program, 'a_position');

  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1,  -1, 1,
    -1,  1,  1, -1,   1, 1
  ]), gl.STATIC_DRAW);

  let lastW = 0, lastH = 0;
  const startTime = performance.now();

  function render() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);

    if (w !== lastW || h !== lastH) {
      canvas.width = w;
      canvas.height = h;
      lastW = w;
      lastH = h;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const elapsed = (performance.now() - startTime) / 1000;
    gl.uniform1f(uTime, elapsed);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uSeed, seed);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

function initAllShaders() {
  // Section shaders — each gets a unique seed for a different pattern
  var sectionCanvases = document.querySelectorAll('.section-shader');
  for (var i = 0; i < sectionCanvases.length; i++) {
    initShader(sectionCanvases[i], (i + 1) * 3.7);
  }
}

// Ensure layout is computed before starting shaders
var _shadersStarted = false;
function startShaders() {
  if (_shadersStarted) return;
  _shadersStarted = true;
  requestAnimationFrame(function() { initAllShaders(); });
}
if (document.readyState === 'complete') {
  startShaders();
} else {
  window.addEventListener('load', startShaders);
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(startShaders, 100);
  });
}

/* ============================================
   Fodder King — Interactive Features
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // ---- Navbar scroll effect ----
  const navbar = document.getElementById('navbar');

  const handleScroll = () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // ---- Mobile navigation toggle ----
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    navToggle.classList.toggle('active');
  });

  // Close mobile nav when a link is clicked
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.classList.remove('active');
    });
  });

  // ---- Scroll-triggered fade-in animations ----
  const animatedElements = document.querySelectorAll(
    '.section-label, .section-header, .about-content, .about-image, ' +
    '.product-card, .livestock-card, .process-step, .tech-card, ' +
    '.market-card, .markets-callout, .contact-card, .contact-form-wrapper, ' +
    '.cta-content, .hero-stats .stat, ' +
    '.cells-figure, .cells-stat, ' +
    '.dairy-yield-card'
  );

  animatedElements.forEach(el => el.classList.add('fade-in'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Add staggered delay for grid children
          const parent = entry.target.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children).filter(c => c.classList.contains('fade-in'));
            const index = siblings.indexOf(entry.target);
            entry.target.style.transitionDelay = `${index * 0.08}s`;
          }
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  animatedElements.forEach(el => observer.observe(el));

  // ---- Smooth scroll for anchor links ----
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ---- Contact form handling ----
  const contactForm = document.getElementById('contactForm');

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData.entries());

    // Simple validation
    if (!data.name || !data.email || !data.subject || !data.message) {
      return;
    }

    // Show success state
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Enquiry Sent!';
    submitBtn.style.background = '#52B788';
    submitBtn.style.borderColor = '#52B788';
    submitBtn.disabled = true;

    // Reset after 3 seconds
    setTimeout(() => {
      contactForm.reset();
      submitBtn.textContent = originalText;
      submitBtn.style.background = '';
      submitBtn.style.borderColor = '';
      submitBtn.disabled = false;
    }, 3000);
  });

  // ---- Active nav link highlighting ----
  const sections = document.querySelectorAll('section[id]');

  const highlightNav = () => {
    const scrollPos = window.scrollY + 100;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.querySelectorAll('a:not(.btn)').forEach(link => {
          link.style.color = '';
          if (link.getAttribute('href') === `#${id}`) {
            link.style.color = '#2D6A4F';
          }
        });
      }
    });
  };

  window.addEventListener('scroll', highlightNav, { passive: true });
});
