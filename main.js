import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = innerWidth < 760;

// ---------- 3D scene: the parcel ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
// soft studio reflections so the parcel reads as a real, glossy object
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 9);

scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 4, 5); scene.add(key);
const pink = new THREE.PointLight(0xf472b6, 30, 20); pink.position.set(-4, 2, 3); scene.add(pink);
const blue = new THREE.PointLight(0x60a5fa, 30, 20); blue.position.set(4, -2, 3); scene.add(blue);

const parcel = new THREE.Group();
const box = new THREE.Mesh(
  new RoundedBoxGeometry(2, 1.4, 1.4, 6, 0.09),
  new THREE.MeshPhysicalMaterial({ color: 0x1c1b29, roughness: 0.3, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.2, envMapIntensity: 0.55 })
);
parcel.add(box);
// glowing tape across the top + front
const tapeMat = new THREE.MeshStandardMaterial({ color: 0xa78bfa, emissive: 0xa78bfa, emissiveIntensity: 0.9 });
const tapeTop = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 1.42), tapeMat); tapeTop.position.y = 0.71; parcel.add(tapeTop);
const tapeFront = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.5, 0.02), tapeMat); tapeFront.position.set(0, 0.46, 0.71); parcel.add(tapeFront);
// faint edge lines
const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.02, 1.42, 1.42)),
  new THREE.LineBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.18 }));
parcel.add(edges);
scene.add(parcel);

// particle field = "the network"
const N = mobile ? 500 : 1400;
const pos = new Float32Array(N * 3);
for (let i = 0; i < N; i++) { pos[i*3] = (Math.random()-.5)*30; pos[i*3+1] = (Math.random()-.5)*20; pos[i*3+2] = (Math.random()-.5)*14 - 4; }
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x8b7fd4, size: 0.035, transparent: true, opacity: 0.7 }));
scene.add(points);

// scroll keyframes: where the parcel sits in each section
// [scrollFraction, x, y, rotY, rotX, scale]
const keys = mobile
  // phones: hero parcel sits below the text, then shrinks to a little "tracker" in the bottom-right corner
  ? [[0, 0.1, 1.55, .5, .35, .44], [0.1, 0.82, -2.4, 2.0, .3, .26], [0.92, 0.82, -2.4, 6.2, .35, .26], [1, 0.72, 0.4, 6.9, .4, .38]]
  : [
      // text sits left in every section, so the parcel stays on the right
      [0.00,  2.6,  0.0, 0.6, 0.35, 1.0],  // hero
      [0.18,  3.2,  0.3, 2.2, 0.15, 0.85], // about
      [0.42,  2.8, -1.7, 3.8, 0.05, 0.55], // journey: empty space below the route
      [0.62,  2.9, -2.0, 5.0, 0.30, 0.45], // work: empty space under the cards
      [0.82,  3.4, -2.1, 6.0, 0.25, 0.4],  // projects: below the flow diagram
      [1.00,  2.4, -0.2, 6.9, 0.40, 0.9],  // contact: "delivered", settled (tilted so the tape shows)
    ];
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
function sample(p) {
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, b] = [keys[i], keys[i+1]];
    if (p <= b[0]) { const t = ease((p - a[0]) / (b[0] - a[0])); return a.map((v, j) => lerp(v, b[j], t)); }
  }
  return keys[keys.length - 1];
}

let progress = 0, mx = 0, my = 0;
addEventListener('mousemove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
});

const cur = { x: 0, y: 0, ry: 0, rx: 0, s: 1 };
const clock = new THREE.Clock();
(function tick() {
  const t = clock.getElapsedTime();
  const [, x, y, ry, rx, s] = sample(progress);
  cur.x = lerp(cur.x, x, .06); cur.y = lerp(cur.y, y, .06); cur.ry = lerp(cur.ry, ry, .06); cur.rx = lerp(cur.rx, rx, .06); cur.s = lerp(cur.s, s, .06);
  parcel.position.set(cur.x + mx * .4, cur.y + Math.sin(t * 1.2) * .08 - my * .3, 0);
  parcel.rotation.set(cur.rx + my * .3, cur.ry + mx * .5 + (reduced ? 0 : t * .05), 0);
  parcel.scale.setScalar(cur.s);
  points.rotation.y = t * .015 + progress * .6;
  points.position.y = progress * 3;
  tapeMat.emissiveIntensity = .7 + Math.sin(t * 2) * .25;
  // phones: no room beside the text, so the parcel only shows in the hero and at the contact "delivery"
  if (mobile) canvas.style.opacity = progress < .07 || progress > .93 ? 1 : 0;
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
})();

// ---------- scroll + DOM animation (GSAP / Lenis load deferred) ----------
addEventListener('load', () => {
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  if (!reduced && window.Lenis) {
    const lenis = window.lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); if (nav.classList.contains('open')) setMenu(false); lenis.scrollTo(a.getAttribute('href'), { force: true }); }));
  }

  // header: glass pill after scrolling, hide on scroll-down / show on scroll-up, active section, mobile menu
  const nav = document.querySelector('.nav');
  const menuBtn = document.querySelector('.menu-btn');
  let lastY = 0;
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => {
    const y = s.scroll();
    nav.classList.toggle('scrolled', y > 40);
    if (!nav.classList.contains('open')) nav.classList.toggle('hide', y > lastY && y > 300);
    lastY = y;
  } });
  document.querySelectorAll('.links a[data-sec]').forEach(a => ScrollTrigger.create({
    trigger: '#' + a.dataset.sec, start: 'top 55%', end: 'bottom 55%',
    onToggle: s => a.classList.toggle('active', s.isActive),
  }));
  const setMenu = open => { nav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); window.lenis?.[open ? 'stop' : 'start'](); };
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  document.querySelectorAll('.nav .links a:not([href^="#"])').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  const bar = document.querySelector('.progress');
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => { progress = s.progress; bar.style.transform = `scaleX(${s.progress})`; } });

  if (reduced) return;

  // hero name rises in
  gsap.from('.hero-title .line > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: .12, delay: .2 });
  gsap.from('.hero-sub, .hero-meta, .eyebrow', { opacity: 0, y: 20, duration: 1, stagger: .1, delay: .7 });

  // reveals
  gsap.utils.toArray('.reveal').forEach(el => gsap.to(el, {
    opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' }
  }));

  // counters
  document.querySelectorAll('[data-count]').forEach(el => {
    const o = { v: 0 };
    gsap.to(o, { v: +el.dataset.count, duration: 1.8, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 85%' },
      onUpdate: () => { el.textContent = Math.round(o.v); } });
  });

  // journey: pin + horizontal route
  const track = document.querySelector('.track');
  const fill = document.querySelector('.route-fill');
  if (!mobile) {
    const dist = () => track.scrollWidth - innerWidth + innerWidth * .16;
    gsap.to(track, { x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '.journey', pin: '.journey-pin', start: 'top top', end: () => '+=' + dist(), scrub: 1, invalidateOnRefresh: true,
        onUpdate: s => { fill.style.width = s.progress * 100 + '%'; } } });
  } else {
    fill.style.width = '100%';
  }

  // work cards: stack in with 3D
  gsap.from('.card', { opacity: 0, y: 80, rotateX: -25, transformOrigin: 'top center', duration: 1.1, ease: 'power3.out', stagger: .12,
    scrollTrigger: { trigger: '.cards', start: 'top 80%' } });

  // 3D tilt + spotlight
  document.querySelectorAll('.tilt').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', x * 100 + '%'); card.style.setProperty('--my', y * 100 + '%');
      gsap.to(card, { rotateY: (x - .5) * 10, rotateX: (.5 - y) * 10, duration: .4, ease: 'power2.out' });
    });
    card.addEventListener('mouseleave', () => gsap.to(card, { rotateY: 0, rotateX: 0, duration: .6, ease: 'power3.out' }));
  });

  // magnetic button
  const mag = document.querySelector('.magnet');
  mag.addEventListener('mousemove', e => {
    const r = mag.getBoundingClientRect();
    gsap.to(mag, { x: (e.clientX - r.left - r.width / 2) * .35, y: (e.clientY - r.top - r.height / 2) * .35, duration: .4 });
  });
  mag.addEventListener('mouseleave', () => gsap.to(mag, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,.4)' }));
});
