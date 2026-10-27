import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { directionText, elevationText, makePrompt, classifyShot, normalizeFocalLength, focalLengthToFov } from '../src/camera.ts';

test('cardinal views agree with the documented subject-relative coordinate system', () => {
  assert.equal(directionText(0, 'zh'), '正面视角');
  assert.equal(directionText(90, 'zh'), '主体左侧视角');
  assert.equal(directionText(180, 'zh'), '背面视角');
  assert.equal(directionText(270, 'zh'), '主体右侧视角');
  for (const angle of [-360, 360, 720, -1, 359]) assert.equal(directionText(angle, 'en'), 'front view');
});
test('positive camera elevation means looking down, negative means looking up', () => {
  assert.equal(elevationText(35, 'en'), 'high-angle shot');
  assert.equal(elevationText(-35, 'en'), 'low-angle shot');
  assert.equal(elevationText(0, 'zh'), '平视');
  assert.equal(elevationText(85, 'zh'), '接近正俯视');
});
test('cropping on either dimension prevents a full-shot description', () => {
  assert.equal(classifyShot(.3, .4), 'wide');
  assert.equal(classifyShot(.5, .8), 'full');
  assert.equal(classifyShot(1.3, .8), 'medium');
  assert.equal(classifyShot(.8, 1.9), 'close');
});
test('empty subject yields only camera terms; user text is preserved without model contamination', () => {
  const empty = makePrompt('  ', 0, 0, 'full', 'en');
  assert.ok(empty.startsWith('Full shot'));
  assert.ok(empty.includes('camera directly in front'));
  assert.ok(empty.includes('camera at the height of the subject center'));
  assert.ok(!empty.includes('eye-level'));
  const text = makePrompt('森林中的旅人 <script>\n静立', 180, 30, 'medium', 'zh');
  assert.ok(text.startsWith('森林中的旅人 <script>\n静立\n'));
  assert.ok(text.includes('相机位于主体正后方'));
  assert.ok(text.includes('相机高于主体中心，向下拍摄'));
  assert.ok(!text.includes('Kenney'));
  assert.ok(!text.includes('面部特写'));
});

test('cropping names only the screen edges actually crossed, without a full-body contradiction', () => {
  const text = makePrompt('', 90, 0, 'full', 'en', {left:-.6, right:.6, top:1.2, bottom:-1.4});
  assert.ok(text.includes('top and bottom edges'));
  assert.ok(!text.includes('entire subject fits'));
  assert.ok(!text.includes('left and right edges'));
  const horizontal = makePrompt('', 180, 0, 'medium', 'zh', {left:-1.1, right:1.4, top:.6, bottom:-.6});
  assert.ok(horizontal.includes('左、右边缘'));
  assert.ok(!horizontal.includes('上、下边缘'));
});

test('oblique views describe visible sides; steep views prioritize top or underside', () => {
  const oblique = makePrompt('', 45, 8, 'full', 'en');
  assert.ok(oblique.includes("subject's own left"));
  assert.ok(oblique.includes('front and left side'));
  assert.ok(oblique.includes('gently downward'));
  const overhead = makePrompt('', 45, 85, 'full', 'en');
  assert.ok(overhead.includes('top as the dominant visible surface'));
  assert.ok(!overhead.includes('showing the front and left side'));
  assert.ok(makePrompt('', 0, -85, 'close', 'zh').includes('底部为主要可见面'));
});

test('camera clauses stay compact and do not invent appearance, lighting or platform parameters', () => {
  for (const angle of [0,45,90,135,180,225,270,315]) {
    for (const elevation of [-85,-50,-20,-8,0,8,20,50,85]) {
      const text = makePrompt('', angle, elevation, 'full', 'en');
      assert.ok(text.split(/\s+/).length <= 100);
      assert.ok(!/photorealistic|cinematic|bokeh|backpack|robot|--ar|azimuth|coordinates/i.test(text));
      assert.ok(text.includes('50mm'));
    }
  }
});


test('position uses the actual bearing, approximated to 5 degrees with a subject-relative reference', () => {
  assert.match(makePrompt('', 30, 20, 'full', 'en'), /30° around from the front toward the subject's own left/);
  assert.match(makePrompt('', 33.4, 20, 'full', 'zh'), /主体自身左侧环绕约 35°/);
  for (const angle of [270, -90, 630]) assert.match(makePrompt('', angle, 0, 'full', 'en'), /90° around from the front toward the subject's own right/);
  for (const angle of [359, 0, 360]) assert.match(makePrompt('', angle, 0, 'full', 'zh'), /水平偏角约 0°/);
  assert.match(makePrompt('', 180, 0, 'full', 'en'), /180° from the front/);
});

test('pitch quantifies the viewing direction relative to horizontal', () => {
  assert.match(makePrompt('', 0, 22, 'full', 'en'), /20° below horizontal/);
  assert.match(makePrompt('', 0, -22, 'full', 'en'), /20° above horizontal/);
  assert.match(makePrompt('', 0, 2, 'full', 'en'), /0° to horizontal/);
  assert.match(makePrompt('', 0, 85, 'full', 'zh'), /相对水平向下约 85°/);
});

test('screen occupancy uses projected visible height and does not exceed 100 percent when cropped', () => {
  const normal = makePrompt('', 30, 20, 'full', 'en', {left:-.3, right:.3, top:.72, bottom:-.7});
  assert.match(normal, /subject filling approximately 70% of image height/);
  const cropped = makePrompt('', 30, 20, 'close', 'zh', {left:-.5, right:.5, top:1.5, bottom:-1.4});
  assert.match(cropped, /主体可见部分约占画面高度的 100%/);
  assert.match(cropped, /上、下边缘/);
  assert.doesNotMatch(cropped, /完整主体/);
  const sideCrop = makePrompt('', 90, 0, 'medium', 'en', {left:-1.3, right:1.3, top:.6, bottom:-.6});
  assert.match(sideCrop, /visible portion filling approximately 60%/);
  assert.match(sideCrop, /left and right edges/);
});


test('focal length preserves decimals and safely limits invalid or extreme values', () => {
  assert.equal(normalizeFocalLength(85.4), 85.4);
  assert.equal(normalizeFocalLength(-10), 18);
  assert.equal(normalizeFocalLength(999), 200);
  assert.equal(normalizeFocalLength(NaN), 50);
  assert.equal(normalizeFocalLength(Infinity), 50);
});

test('changing focal length changes projected framing without moving the camera', () => {
  const camera = new PerspectiveCamera(focalLengthToFov(50), 1, .01, 100);
  camera.position.set(0, 0, 6);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const top = new Vector3(0, 1, 0);
  const normal = top.clone().project(camera).y;
  assert.ok(Math.abs(camera.fov - 26.9915) < .001);
  camera.fov = focalLengthToFov(200);
  camera.updateProjectionMatrix();
  const telephoto = top.clone().project(camera).y;
  assert.ok(Math.abs(telephoto / normal - 4) < .0001);
  assert.equal(classifyShot(normal, normal), 'full');
  assert.equal(classifyShot(telephoto, telephoto), 'close');
  camera.fov = focalLengthToFov(18);
  camera.updateProjectionMatrix();
  assert.ok(top.clone().project(camera).y < normal);
  assert.deepEqual(camera.position.toArray(), [0, 0, 6]);
});

test('both prompt languages use the selected focal length and matching lens class', () => {
  for (const [mm, zh, en] of [[18, '广角镜头', 'wide-angle lens'], [35, '广角镜头', 'wide-angle lens'], [50, '标准镜头', 'standard lens'], [85.4, '长焦镜头', 'telephoto lens']] as const) {
    assert.ok(makePrompt('', 30, 20, 'full', 'zh', undefined, mm).includes(`${mm}mm ${zh}`));
    const english = makePrompt('', 30, 20, 'full', 'en', undefined, mm);
    assert.ok(english.includes(`${mm}mm ${en}`));
    if (mm !== 50) assert.ok(!english.includes('50mm'));
  }
});
