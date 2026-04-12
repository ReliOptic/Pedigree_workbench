import type { Language } from '../types/translation.types';

export interface FieldDef {
  key: string;
  label: Record<Language, string>;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  required?: boolean;
}

export interface SpeciesProfile {
  id: string;
  name: Record<Language, string>;
  icon: string;  // emoji
  gestationDays: number;
  sexTerms: {
    male: Record<Language, string>;
    female: Record<Language, string>;
  };
  defaultFields: FieldDef[];
}

export const SPECIES_PROFILES: readonly SpeciesProfile[] = [
  {
    id: 'swine',
    name: { en: 'Swine', ko: '돼지' },
    icon: '🐷',
    gestationDays: 114,
    sexTerms: {
      male: { en: 'Boar', ko: '수퇘지' },
      female: { en: 'Sow', ko: '암퇘지' },
    },
    defaultFields: [
      { key: 'weight', label: { en: 'Weight (kg)', ko: '체중 (kg)' }, type: 'number' },
      { key: 'litter_size', label: { en: 'Litter Size', ko: '산자수' }, type: 'number' },
      { key: 'registry_no', label: { en: 'Registry No.', ko: '등록번호' }, type: 'text' },
    ],
  },
  {
    id: 'canine',
    name: { en: 'Dog', ko: '개' },
    icon: '🐕',
    gestationDays: 63,
    sexTerms: {
      male: { en: 'Stud', ko: '수컷' },
      female: { en: 'Bitch', ko: '암컷' },
    },
    defaultFields: [
      { key: 'breed', label: { en: 'Breed', ko: '품종' }, type: 'text' },
      { key: 'color', label: { en: 'Color/Markings', ko: '모색' }, type: 'text' },
      { key: 'registry_no', label: { en: 'Registry No.', ko: '등록번호' }, type: 'text' },
      { key: 'hip_score', label: { en: 'Hip Score', ko: '고관절 점수' }, type: 'text' },
    ],
  },
  {
    id: 'equine',
    name: { en: 'Horse', ko: '말' },
    icon: '🐴',
    gestationDays: 340,
    sexTerms: {
      male: { en: 'Stallion', ko: '종마' },
      female: { en: 'Mare', ko: '암말' },
    },
    defaultFields: [
      { key: 'breed', label: { en: 'Breed', ko: '품종' }, type: 'text' },
      { key: 'color', label: { en: 'Color', ko: '모색' }, type: 'text' },
      { key: 'height', label: { en: 'Height (hands)', ko: '키 (hands)' }, type: 'number' },
      { key: 'registry_no', label: { en: 'Registry No.', ko: '등록번호' }, type: 'text' },
    ],
  },
  {
    id: 'feline',
    name: { en: 'Cat', ko: '고양이' },
    icon: '🐱',
    gestationDays: 65,
    sexTerms: {
      male: { en: 'Tom', ko: '수컷' },
      female: { en: 'Queen', ko: '암컷' },
    },
    defaultFields: [
      { key: 'breed', label: { en: 'Breed', ko: '품종' }, type: 'text' },
      { key: 'color', label: { en: 'Color/Pattern', ko: '모색/패턴' }, type: 'text' },
      { key: 'registry_no', label: { en: 'Registry No.', ko: '등록번호' }, type: 'text' },
    ],
  },
  {
    id: 'cattle',
    name: { en: 'Cattle', ko: '소' },
    icon: '🐄',
    gestationDays: 283,
    sexTerms: {
      male: { en: 'Bull', ko: '수소' },
      female: { en: 'Cow', ko: '암소' },
    },
    defaultFields: [
      { key: 'breed', label: { en: 'Breed', ko: '품종' }, type: 'text' },
      { key: 'weight', label: { en: 'Weight (kg)', ko: '체중 (kg)' }, type: 'number' },
      { key: 'registry_no', label: { en: 'Registry No.', ko: '등록번호' }, type: 'text' },
    ],
  },
  {
    id: 'zoo',
    name: { en: 'Zoo / Wildlife', ko: '동물원 / 야생동물' },
    icon: '🦁',
    gestationDays: 90,
    sexTerms: {
      male: { en: 'Male', ko: '수컷' },
      female: { en: 'Female', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'origin', label: { en: 'Origin', ko: '출처' }, type: 'text' },
    ],
  },
  {
    id: 'custom',
    name: { en: 'Custom', ko: '사용자 정의' },
    icon: '🧬',
    gestationDays: 30,
    sexTerms: {
      male: { en: 'Male', ko: '수컷' },
      female: { en: 'Female', ko: '암컷' },
    },
    defaultFields: [],
  },
];

export function getSpeciesProfile(id: string): SpeciesProfile {
  return SPECIES_PROFILES.find(p => p.id === id) ?? SPECIES_PROFILES[SPECIES_PROFILES.length - 1]!;
}

export function getSpeciesList(): readonly SpeciesProfile[] {
  return SPECIES_PROFILES;
}
