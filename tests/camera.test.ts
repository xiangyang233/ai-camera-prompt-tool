import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directionText, elevationText, makePrompt, classifyShot } from '../src/camera.ts';

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
  assert.ok(oblique.includes("subject's left"));
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
