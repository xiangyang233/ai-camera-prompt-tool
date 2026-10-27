export type Language = 'zh' | 'en';
export type Shot = 'wide' | 'full' | 'medium' | 'close';
export type FrameBounds = { left: number; right: number; top: number; bottom: number };
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;
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
function directionDescription(angle: number, elevation: number, language: Language) {
  const index = directionIndex(angle);
  const position = language === 'zh'
    ? ['相机位于主体正前方', '相机位于主体左前方，以四分之三角度观察', '相机位于主体自身左侧，从侧面观察', '相机位于主体左后方，以后侧四分之三角度观察', '相机位于主体正后方，从背面观察', '相机位于主体右后方，以后侧四分之三角度观察', '相机位于主体自身右侧，从侧面观察', '相机位于主体右前方，以四分之三角度观察']
    : ['Front view, camera directly in front of the subject', "Three-quarter front view, camera in front and to the subject's left", "Left-side view, camera on the subject's own left", "Three-quarter rear view, camera behind and to the subject's left", 'Rear view, camera directly behind the subject', "Three-quarter rear view, camera behind and to the subject's right", "Right-side view, camera on the subject's own right", "Three-quarter front view, camera in front and to the subject's right"];
  // At steep elevations the top/underside dominates; do not assert lateral surfaces are prominent.
  if (Math.abs(elevation) >= 60 || index % 2 === 0) return position[index];
  const surfaces = language === 'zh'
    ? { 1: '同时呈现正面和左侧', 3: '同时呈现背面和左侧', 5: '同时呈现背面和右侧', 7: '同时呈现正面和右侧' }
    : { 1: 'showing the front and left side', 3: 'showing the back and left side', 5: 'showing the back and right side', 7: 'showing the front and right side' };
  return position[index] + (language === 'zh' ? '，' : ', ') + surfaces[index as 1 | 3 | 5 | 7];
}

function elevationDescription(angle: number, language: Language) {
  const descriptions = language === 'zh'
    ? ['相机几乎位于主体正上方，向下拍摄，顶部为主要可见面', '相机明显高于主体中心，以较陡角度向下拍摄', '相机高于主体中心，向下拍摄', '相机略高于主体中心，轻微向下拍摄', '相机与主体中心等高，水平朝向主体中心', '相机略低于主体中心，轻微向上拍摄', '相机低于主体中心，向上拍摄', '相机明显低于主体中心，以较陡角度向上拍摄', '相机几乎位于主体正下方，向上拍摄，底部为主要可见面']
    : ['camera almost directly above, looking down with the top as the dominant visible surface', 'camera well above the subject center, looking steeply downward', 'camera above the subject center, looking downward', 'camera slightly above the subject center, looking gently downward', 'camera at the height of the subject center, aimed horizontally', 'camera slightly below the subject center, looking gently upward', 'camera below the subject center, looking upward', 'camera well below the subject center, looking steeply upward', 'camera almost directly below, looking up with the underside as the dominant visible surface'];
  return elevationText(angle, language) + (language === 'zh' ? '，' : ', ') + descriptions[elevationIndex(angle)];
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
  if (edges.length) return description[effectiveShot] + (language === 'zh'
    ? `，主体超出画面的${edges.map(edge => edge.zh).join('、')}边缘，这些部位被画面裁切`
    : `, the subject extends beyond the ${edges.map(edge => edge.en).join(' and ')} edges and is cropped there`);
  if (!frame && (shot === 'medium' || shot === 'close')) return description[shot] + (language === 'zh' ? '，主体部分超出画面' : ', part of the subject extends outside the frame');
  return description[shot];
}

export function makePrompt(subject: string, angle: number, elevation: number, shot: Shot, language: Language, frame?: FrameBounds) {
  const sentences = [framingDescription(shot, language, frame), directionDescription(angle, elevation, language), elevationDescription(elevation, language), language === 'zh' ? '主体居中，镜头指向主体中心，50mm 标准镜头透视' : 'Centered composition, camera aimed at the subject center, natural perspective of a 50mm lens'];
  const prefix = subject.trim() ? subject.trim() + '\n' : '';
  return prefix + sentences.map(sentence => language === 'en' ? sentence[0].toUpperCase() + sentence.slice(1) : sentence).join(language === 'zh' ? '。' : '. ') + (language === 'zh' ? '。' : '.');
}
