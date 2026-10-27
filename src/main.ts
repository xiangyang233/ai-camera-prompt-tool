import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { clamp, normalizeAngle, directionIndex, directionText, elevationText, classifyShot, makePrompt, shotText } from './camera.ts';
import type { Language } from './camera.ts';
import './style.css';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const viewport = $('viewport');
const loading = $('loading');
const prompt = $<HTMLTextAreaElement>('prompt');
const subject = $<HTMLInputElement>('subject');
const copy = $<HTMLButtonElement>('copy');
const sliders = { azimuth: $<HTMLInputElement>('azimuth'), elevation: $<HTMLInputElement>('elevation'), distance: $<HTMLInputElement>('distance') };
const angleInputs = { azimuth: $<HTMLInputElement>('azimuth-number'), elevation: $<HTMLInputElement>('elevation-number') };
const state = { azimuth: 30, elevation: 8, distance: 4.8, language: 'en' as Language };
let minDistance = 1.5;
let maxDistance = 9;
let modelHeight = 2.2;
let ready = false;
let scheduled = false;
let contextLost = false;
let renderer: THREE.WebGLRenderer;
let lastDirection = -1;
let statusTimer: ReturnType<typeof setTimeout>;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e9ede3');
const camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(2 * Math.atan(24 / 100)), 1, .01, 100);
const modelPoints: THREE.Vector3[] = [];
const projected = new THREE.Vector3();
const group = new THREE.Group();
scene.add(group);
scene.add(new THREE.HemisphereLight('#fff9e9', '#9aa58c', 2.6));
const key = new THREE.DirectionalLight('#fff4de', 2.6);
key.position.set(-3, 6, 5);
scene.add(key);
const fill = new THREE.DirectionalLight('#dce8fb', 1.2);
fill.position.set(4, 2, -4);
scene.add(fill);
const grid = new THREE.GridHelper(20, 40, '#b9c5ab', '#cbd4c1');
(grid.material as THREE.Material).transparent = true;
(grid.material as THREE.Material).opacity = .32;
scene.add(grid);

function scheduleRender() {
  if (scheduled || contextLost) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; update(); });
}

function update() {
  if (!ready || contextLost) return;
  state.azimuth = normalizeAngle(state.azimuth);
  state.elevation = clamp(state.elevation, -85, 85);
  state.distance = clamp(state.distance, minDistance, maxDistance);
  const az = THREE.MathUtils.degToRad(state.azimuth);
  const el = THREE.MathUtils.degToRad(state.elevation);
  camera.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(state.distance);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  grid.visible = state.elevation >= -5;
  renderer.render(scene, camera);
  let left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
  for (const corner of modelPoints) {
    projected.copy(corner).project(camera);
    left = Math.min(left, projected.x); right = Math.max(right, projected.x);
    bottom = Math.min(bottom, projected.y); top = Math.max(top, projected.y);
  }
  const cropped = Math.max(right, -left, top, -bottom) > 1;
  const shot = classifyShot(Math.max((right - left) / 2, cropped ? 1.01 : 0), (top - bottom) / 2);
  // Keep a 3° dead band around direction boundaries during interaction.
  const nextIndex = directionIndex(state.azimuth);
  const delta = lastDirection < 0 ? 180 : Math.abs(((state.azimuth - lastDirection * 45 + 540) % 360) - 180);
  if (lastDirection < 0 || delta > 25.5) lastDirection = nextIndex;
  const descriptionAngle = lastDirection * 45;
  prompt.value = makePrompt(subject.value, descriptionAngle, state.elevation, shot, state.language, { left, right, top, bottom });
  $('view-name').textContent = `${directionText(descriptionAngle, 'zh')} · ${elevationText(state.elevation, 'zh')}`;
  const tags = [shotText(shot, 'zh').split('，')[0], elevationText(state.elevation, 'zh'), '50 mm'];
  $('prompt-tags').replaceChildren(...tags.map(text => { const tag = document.createElement('span'); tag.textContent = text; return tag; }));
  sliders.azimuth.value = String(state.azimuth);
  sliders.elevation.value = String(state.elevation);
  sliders.distance.value = String(state.distance / modelHeight);
  for (const key of ['azimuth', 'elevation'] as const) {
    // Preserve unfinished input (e.g. a minus sign or decimal) while the user types.
    if (document.activeElement !== angleInputs[key]) angleInputs[key].value = displayedAngle(key);
  }
  $('distance-value').textContent = `${(state.distance / modelHeight).toFixed(2)}×`;
  document.querySelectorAll<HTMLButtonElement>('[data-angle]').forEach(button => {
    const active = Math.abs(normalizeAngle(state.azimuth - Number(button.dataset.angle) + 180) - 180) < 2;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function resize() {
  if (!renderer) return;
  const width = viewport.clientWidth, height = viewport.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  scheduleRender();
}

function reset() {
  state.azimuth = 30; state.elevation = 8;
  // On narrow viewports fit horizontally as well as vertically.
  state.distance = clamp(modelHeight * Math.max(2.85, 1.7 / camera.aspect), minDistance, maxDistance);
  lastDirection = -1;
  scheduleRender();
}

async function init() {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.setAttribute('aria-label', '3D 模型实时取景');
    viewport.prepend(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault(); contextLost = true; copy.disabled = true;
      loading.hidden = false; loading.textContent = '3D 显示已暂停，请刷新页面恢复。';
    });
    const [model, texture] = await Promise.all([
      new OBJLoader().loadAsync('/models/character-a.obj'),
      new THREE.TextureLoader().loadAsync('/models/texture-a.png'),
    ]);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: .95, flatShading: true });
    model.traverse(object => { if (object instanceof THREE.Mesh) { object.material = material; } });
    const initialBounds = new THREE.Box3().setFromObject(model);
    const scale = 2.2 / initialBounds.getSize(new THREE.Vector3()).y;
    model.scale.setScalar(scale);
    model.position.copy(initialBounds.getCenter(new THREE.Vector3())).multiplyScalar(-scale);
    group.add(model);
    // A small geometric satchel makes the subject's left distinguishable from its right.
    const satchel = new THREE.Mesh(new THREE.BoxGeometry(.20, .34, .26), new THREE.MeshStandardMaterial({ color: '#355950', roughness: 1 }));
    satchel.position.set(.57, -.19, .035);
    group.add(satchel);
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(.07, .08, .015), new THREE.MeshStandardMaterial({ color: '#e4bb69', roughness: .7 }));
    clasp.position.set(.57, -.16, .174);
    group.add(clasp);
    const bounds = new THREE.Box3().setFromObject(group);
    // Recenter once after adding the satchel; camera always orbits the complete model center.
    const center = bounds.getCenter(new THREE.Vector3());
    group.position.sub(center);
    bounds.translate(center.negate());
    modelHeight = bounds.getSize(new THREE.Vector3()).y;
    const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius;
    minDistance = Math.ceil(Math.max(radius * 1.12 / modelHeight, 1.25) * 100) / 100 * modelHeight;
    maxDistance = modelHeight * 4.5;
    group.updateMatrixWorld(true);
    group.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const positions = object.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) modelPoints.push(new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld));
    });
    grid.position.y = bounds.min.y - .015;
    sliders.distance.min = String(minDistance / modelHeight);
    sliders.distance.max = String(maxDistance / modelHeight);
    sliders.distance.step = '.01';
    ready = true; copy.disabled = false; loading.hidden = true;
    new ResizeObserver(resize).observe(viewport);
    resize(); reset();
  } catch (error) {
    console.error('Unable to initialize 3D viewport', error);
    loading.hidden = false;
    loading.textContent = '模型未能加载。请检查本地服务是否运行，并确认浏览器已启用硬件加速，然后刷新页面。';
    $('view-name').textContent = '3D 预览不可用';
    copy.disabled = true;
  }
}

let dragging: { id: number; x: number; y: number } | null = null;
viewport.addEventListener('pointerdown', event => {
  if (event.button !== 0 || !ready || dragging) return;
  viewport.focus({ preventScroll: true });
  viewport.setPointerCapture(event.pointerId);
  dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
});
viewport.addEventListener('pointermove', event => {
  if (!dragging || dragging.id !== event.pointerId) return;
  state.azimuth -= (event.clientX - dragging.x) * .35;
  state.elevation = clamp(state.elevation + (event.clientY - dragging.y) * .3, -85, 85);
  dragging.x = event.clientX; dragging.y = event.clientY;
  scheduleRender();
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) viewport.addEventListener(name, () => { dragging = null; });
viewport.addEventListener('wheel', event => {
  if (!ready) return;
  event.preventDefault();
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1);
  state.distance = clamp(state.distance * Math.exp(clamp(delta, -160, 160) * .0014), minDistance, maxDistance);
  scheduleRender();
}, { passive: false });
viewport.addEventListener('keydown', event => {
  const step = event.shiftKey ? 10 : 3;
  if (event.key === 'ArrowLeft') state.azimuth -= step;
  else if (event.key === 'ArrowRight') state.azimuth += step;
  else if (event.key === 'ArrowUp') state.elevation += step;
  else if (event.key === 'ArrowDown') state.elevation -= step;
  else if (event.key === '+' || event.key === '=') state.distance *= .9;
  else if (event.key === '-') state.distance *= 1.1;
  else if (event.key === 'Home') reset();
  else return;
  event.preventDefault(); scheduleRender();
});
sliders.azimuth.addEventListener('input', () => { state.azimuth = Number(sliders.azimuth.value); scheduleRender(); });
sliders.elevation.addEventListener('input', () => { state.elevation = Number(sliders.elevation.value); scheduleRender(); });
sliders.distance.addEventListener('input', () => { state.distance = Number(sliders.distance.value) * modelHeight; scheduleRender(); });
function displayedAngle(key: 'azimuth' | 'elevation') {
  const rounded = Number(state[key].toFixed(1));
  return String(Number((key === 'azimuth' ? normalizeAngle(rounded) : rounded).toFixed(1)));
}
for (const key of ['azimuth', 'elevation'] as const) {
  const input = angleInputs[key];
  const apply = (commit: boolean) => {
    const value = input.valueAsNumber;
    if (Number.isFinite(value)) {
      const angle = key === 'azimuth' ? normalizeAngle(value) : clamp(value, -85, 85);
      state[key] = Number(angle.toFixed(1));
      lastDirection = -1;
      scheduleRender();
    }
    // Empty/invalid input keeps the last usable camera angle; restore it on commit.
    if (commit) input.value = displayedAngle(key);
  };
  input.addEventListener('input', () => apply(false));
  input.addEventListener('blur', () => apply(true));
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); apply(true); input.blur(); }
    if (event.key === 'Escape') { input.value = displayedAngle(key); input.blur(); }
  });
}
document.querySelectorAll<HTMLButtonElement>('[data-angle]').forEach(button => button.addEventListener('click', () => {
  state.azimuth = Number(button.dataset.angle); state.elevation = 0; lastDirection = -1; scheduleRender();
}));
$('reset').addEventListener('click', reset);
subject.addEventListener('input', scheduleRender);
for (const language of ['en', 'zh'] as const) $('lang-' + language).addEventListener('click', () => {
  state.language = language;
  for (const option of ['en', 'zh']) $('lang-' + option).setAttribute('aria-pressed', String(option === language));
  scheduleRender();
});
copy.addEventListener('click', async () => {
  clearTimeout(statusTimer);
  update();
  try {
    await navigator.clipboard.writeText(prompt.value);
    $('copy-status').textContent = '已复制，可以粘贴到绘画工具了。';
    copy.firstElementChild!.textContent = '已复制 ✓';
  } catch {
    prompt.focus(); prompt.select();
    $('copy-status').textContent = '已选中文本，请按 Ctrl+C 复制。';
  }
  statusTimer = setTimeout(() => { copy.firstElementChild!.textContent = '复制提示词'; $('copy-status').textContent = '选好视角，就可以带走这个镜头。'; }, 2500);
});
void init();
