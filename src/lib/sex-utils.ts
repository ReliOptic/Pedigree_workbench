export type SexCategory = 'male' | 'female' | 'unknown';

export function classifySex(sex: string | undefined): SexCategory {
  const s = (sex ?? '').trim().toLowerCase();
  if (s === 'm' || s === 'male' || s === '수컷') return 'male';
  if (s === 'f' || s === 'female' || s === '암컷') return 'female';
  return 'unknown';
}

export function isMale(ind: { sex?: string }): boolean {
  return classifySex(ind.sex) === 'male';
}

export function isFemale(ind: { sex?: string }): boolean {
  return classifySex(ind.sex) === 'female';
}

export function sexLabel(sex: string | undefined, language: 'en' | 'ko' = 'en'): string {
  const cat = classifySex(sex);
  if (language === 'ko') {
    return cat === 'male' ? '수컷' : cat === 'female' ? '암컷' : '미상';
  }
  return cat === 'male' ? 'Male' : cat === 'female' ? 'Female' : 'Unknown';
}
