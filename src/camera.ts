export type Language = 'zh' | 'en';
export type Shot = 'wide' | 'full' | 'medium' | 'close';
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;
const directions = {
  zh: ['正面视角', '左前方四分之三视角', '主体左侧视角', '左后方四分之三视角', '背面视角', '右后方四分之三视角', '主体右侧视角', '右前方四分之三视角'],
  en: ['front view', "three-quarter view from the subject’s left front", "left-side view of the subject", "three-quarter view from the subject’s left rear", 'back view', "three-quarter view from the subject’s right rear", "right-side view of the subject", "three-quarter view from the subject’s right front"],
};
export function directionIndex(angle: number) { return Math.floor((normalizeAngle(angle) + 22.5) / 45) % 8; }
export function directionText(angle: number, language: Language) { return directions[language][directionIndex(angle)]; }
export function elevationText(angle: number, language: Language) {
  const index = angle >= 70 ? 0 : angle > 12 ? 1 : angle <= -70 ? 4 : angle < -12 ? 3 : 2;
  return (language === 'zh' ? ['接近正俯视', '俯拍', '平视', '仰拍', '接近正仰视'] : ['near top-down view', 'high-angle shot', 'eye-level shot', 'low-angle shot', 'near bottom-up view'])[index];
}
// Use projected model dimensions; the caller also checks off-center clipping.
export function classifyShot(width: number, height: number): Shot {
  const fill = Math.max(width, height);
  if (fill < 0.46) return 'wide';
  if (fill <= 0.98) return 'full';
  if (fill < 1.65) return 'medium';
  return 'close';
}
export function shotText(shot: Shot, language: Language) {
  return ({ zh: {wide:'远景', full:'全景', medium:'中景，局部裁切', close:'近景，局部裁切'}, en: {wide:'wide shot', full:'full shot', medium:'medium shot, cropped framing', close:'close shot, cropped framing'} })[language][shot];
}
export function makePrompt(subject: string, angle: number, elevation: number, shot: Shot, language: Language) {
  return [subject.trim(), shotText(shot, language), directionText(angle, language), elevationText(elevation, language), language === 'zh' ? '50mm 镜头' : '50mm lens'].filter(Boolean).join(language === 'zh' ? '，' : ', ');
}
