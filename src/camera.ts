export type Language = 'zh' | 'en';
export type Shot = 'wide' | 'full' | 'medium' | 'close';
export type FrameBounds = { left: number; right: number; top: number; bottom: number };
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;
export const MIN_FOCAL_LENGTH = 18;
export const MAX_FOCAL_LENGTH = 200;
export const DEFAULT_FOCAL_LENGTH = 50;
export function normalizeFocalLength(value: number) {
  return Number(clamp(Number.isFinite(value) ? value : DEFAULT_FOCAL_LENGTH, MIN_FOCAL_LENGTH, MAX_FOCAL_LENGTH).toFixed(1));
}
// Preserve the original 24 mm sensor-height convention, independent of viewport aspect.
export function focalLengthToFov(focalLength: number) {
  return 2 * Math.atan(24 / (2 * normalizeFocalLength(focalLength))) * 180 / Math.PI;
}
function lensDescription(focalLength: number, language: Language) {
  const mm = normalizeFocalLength(focalLength);
  const kind = language === 'zh'
    ? mm <= 35 ? '广角镜头' : mm < 70 ? '标准镜头' : '长焦镜头'
    : mm <= 35 ? 'wide-angle lens' : mm < 70 ? 'standard lens' : 'telephoto lens';
  return `${mm}mm ${kind}`;
}
const directions = {
  zh: ['正面视角', '左前方四分之三视角', '主体左侧视角', '左后方四分之三视角', '背面视角', '右后方四分之三视角', '主体右侧视角', '右前方四分之三视角'],
  en: ['front view', "three-quarter view from the subject’s left front", "left-side view of the subject", "three-quarter view from the subject’s left rear", 'back view', "three-quarter view from the subject’s right rear", "right-side view of the subject", "three-quarter view from the subject’s right front"],
};
export function directionIndex(angle: number) { return Math.floor((normalizeAngle(angle) + 22.5) / 45) % 8; }
export function directionText(angle: number, language: Language) { return directions[language][directionIndex(angle)]; }
export function elevationText(angle: number, language: Language) {
  const index = elevationIndex(angle);
  return (language === 'zh'
    ? ['接近正俯视', '大角度俯拍', '俯拍', '轻微俯拍', '平视', '轻微仰拍', '仰拍', '大角度仰拍', '接近正仰视']
    : ['near top-down view', 'steep high-angle shot', 'high-angle shot', 'slightly high-angle shot', 'level shot', 'slightly low-angle shot', 'low-angle shot', 'steep low-angle shot', 'near bottom-up view'])[index];
}
function elevationIndex(angle: number) {
  return angle >= 70 ? 0 : angle >= 45 ? 1 : angle > 12 ? 2 : angle > 3 ? 3 : angle >= -3 ? 4 : angle >= -12 ? 5 : angle > -45 ? 6 : angle > -70 ? 7 : 8;
}
// Use projected model dimensions; the caller also checks off-center clipping.
export function classifyShot(width: number, height: number): Shot {
  const fill = Math.max(width, height);
  if (fill < 0.46) return 'wide';
  if (fill <= 1) return 'full';
  if (fill < 1.65) return 'medium';
  return 'close';
}
export function shotText(shot: Shot, language: Language) {
  return ({ zh: {wide:'远景', full:'全景', medium:'中景，局部裁切', close:'近景，局部裁切'}, en: {wide:'wide shot', full:'full shot', medium:'medium shot, cropped framing', close:'close shot, cropped framing'} })[language][shot];
}
// Approximate photographic instructions are more useful than scene coordinates.
function directionDescription(angle: number, elevation: number, language: Language) {
  const rounded = normalizeAngle(Math.round(normalizeAngle(angle) / 5) * 5);
  const index = directionIndex(rounded);
  const side = rounded <= 180 ? 'left' : 'right';
  const degrees = Math.min(rounded, 360 - rounded);
  const position = language === 'zh'
    ? rounded === 0 ? '相机位于主体正前方，水平偏角约 0°'
      : rounded === 180 ? '相机位于主体正后方，相对正面环绕约 180°'
      : `从主体正前方朝主体自身${side === 'left' ? '左' : '右'}侧环绕约 ${degrees}°`
    : rounded === 0 ? 'camera directly in front of the subject, approximately 0° from the front'
      : rounded === 180 ? 'camera directly behind the subject, approximately 180° from the front'
      : `camera approximately ${degrees}° around from the front toward the subject's own ${side}`;
  const label = language === 'zh'
    ? ['正面视角', '前侧四分之三视角', '左侧视角', '后侧四分之三视角', '背面视角', '后侧四分之三视角', '右侧视角', '前侧四分之三视角'][index]
    : ['Front view', 'Three-quarter front view', 'Left-side view', 'Three-quarter rear view', 'Rear view', 'Three-quarter rear view', 'Right-side view', 'Three-quarter front view'][index];
  const base = label + (language === 'zh' ? '，' : ', ') + position;
  // At steep elevations the top/underside dominates.
  if (Math.abs(elevation) >= 60 || index % 2 === 0) return base;
  const surfaces = language === 'zh'
    ? { 1: '同时呈现正面和左侧', 3: '同时呈现背面和左侧', 5: '同时呈现背面和右侧', 7: '同时呈现正面和右侧' }
    : { 1: 'showing the front and left side', 3: 'showing the back and left side', 5: 'showing the back and right side', 7: 'showing the front and right side' };
  return base + (language === 'zh' ? '，' : ', ') + surfaces[index as 1 | 3 | 5 | 7];
}

function elevationDescription(angle: number, language: Language) {
  const descriptions = language === 'zh'
    ? ['相机几乎位于主体正上方，向下拍摄，顶部为主要可见面', '相机明显高于主体中心，以较陡角度向下拍摄', '相机高于主体中心，向下拍摄', '相机略高于主体中心，轻微向下拍摄', '相机与主体中心等高，水平朝向主体中心', '相机略低于主体中心，轻微向上拍摄', '相机低于主体中心，向上拍摄', '相机明显低于主体中心，以较陡角度向上拍摄', '相机几乎位于主体正下方，向上拍摄，底部为主要可见面']
    : ['camera almost directly above, looking down with the top as the dominant visible surface', 'camera well above the subject center, looking steeply downward', 'camera above the subject center, looking downward', 'camera slightly above the subject center, looking gently downward', 'camera at the height of the subject center, aimed horizontally', 'camera slightly below the subject center, looking gently upward', 'camera below the subject center, looking upward', 'camera well below the subject center, looking steeply upward', 'camera almost directly below, looking up with the underside as the dominant visible surface'];
  const degrees = Math.abs(angle) <= 3 ? 0 : Math.round(Math.abs(angle) / 5) * 5;
  const pitch = language === 'zh'
    ? `，视线相对水平${degrees === 0 ? '约 0°' : `向${angle > 0 ? '下' : '上'}约 ${degrees}°`}`
    : `, approximately ${degrees}° ${degrees === 0 ? 'to horizontal' : `${angle > 0 ? 'below' : 'above'} horizontal`}`;
  return elevationText(angle, language) + (language === 'zh' ? '，' : ', ') + descriptions[elevationIndex(angle)] + pitch;
}

function framingDescription(shot: Shot, language: Language, frame?: FrameBounds) {
  const description = language === 'zh'
    ? { wide: '远景，完整主体在画面中占比较小，四周留有充足空间', full: '全景，完整主体位于画面边界之内，轮廓周围留有空间', medium: '中景，重点呈现主体中央区域', close: '近景，紧凑取景，放大主体中央局部' }
    : { wide: 'Wide shot, the entire subject appears small in the frame with generous surrounding space', full: 'Full shot, the entire subject fits inside the frame with space around its outline', medium: 'Medium shot focused on the central region of the subject', close: 'Tight close shot of the central portion of the subject' };
  const edges = frame ? [
    { clipped: frame.top > 1, zh: '上', en: 'top' },
    { clipped: frame.bottom < -1, zh: '下', en: 'bottom' },
    { clipped: frame.left < -1, zh: '左', en: 'left' },
    { clipped: frame.right > 1, zh: '右', en: 'right' },
  ].filter(edge => edge.clipped) : [];
  // Measured clipping takes precedence over a potentially stale coarse shot classification.
  const effectiveShot = edges.length && (shot === 'full' || shot === 'wide') ? 'medium' : shot;
  // Measure visible screen height, not a world-unit distance or >100% occupancy.
  const percent = frame ? clamp(Math.round(Math.max(0, Math.min(1, frame.top) - Math.max(-1, frame.bottom)) * 50 / 5) * 5, 5, 100) : null;
  const size = percent === null ? '' : language === 'zh'
    ? `，${edges.length ? '主体可见部分' : '主体'}约占画面高度的 ${percent}%`
    : `, ${edges.length ? 'visible portion' : 'subject'} filling approximately ${percent}% of image height`;
  if (edges.length) return description[effectiveShot] + size + (language === 'zh'
    ? `，主体超出画面的${edges.map(edge => edge.zh).join('、')}边缘，这些部位被画面裁切`
    : `, the subject extends beyond the ${edges.map(edge => edge.en).join(' and ')} edges and is cropped there`);
  if (!frame && (shot === 'medium' || shot === 'close')) return description[shot] + (language === 'zh' ? '，主体部分超出画面' : ', part of the subject extends outside the frame');
  return description[shot] + size;
}

export function makePrompt(subject: string, angle: number, elevation: number, shot: Shot, language: Language, frame?: FrameBounds, focalLength = DEFAULT_FOCAL_LENGTH) {
  const sentences = [framingDescription(shot, language, frame), directionDescription(angle, elevation, language), elevationDescription(elevation, language), language === 'zh' ? `主体居中，镜头指向主体中心，${lensDescription(focalLength, language)}` : `Centered composition, aimed at the subject center, ${lensDescription(focalLength, language)}`];
  const prefix = subject.trim() ? subject.trim() + '\n' : '';
  return prefix + sentences.map(sentence => language === 'en' ? sentence[0].toUpperCase() + sentence.slice(1) : sentence).join(language === 'zh' ? '。' : '. ') + (language === 'zh' ? '。' : '.');
}
