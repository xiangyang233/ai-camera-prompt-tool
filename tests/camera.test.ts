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
  assert.equal(makePrompt('  ', 0, 0, 'full', 'en'), 'full shot, front view, eye-level shot, 50mm lens');
  const text = makePrompt('森林中的旅人 <script>\n静立', 180, 30, 'medium', 'zh');
  assert.ok(text.startsWith('森林中的旅人 <script>\n静立，'));
  assert.ok(text.includes('背面视角，俯拍'));
  assert.ok(!text.includes('Kenney'));
  assert.ok(!text.includes('面部特写'));
});
