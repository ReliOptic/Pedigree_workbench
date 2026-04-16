import type { Language } from '../types/translation.types';
import { lookupSpecies } from './eol-api';

export interface FieldDef {
  key: string;
  label: Record<Language, string>;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  required?: boolean;
}

export interface SpeciesProfile {
  id: string;
  /** Display name — kept as Record<Language, string> for i18n compatibility */
  name: Record<Language, string>;
  icon: string;
  category: 'livestock' | 'companion' | 'avian' | 'marine' | 'primate' | 'large-mammal' | 'marsupial' | 'regional' | 'custom';

  reproductionType: 'viviparous' | 'oviparous' | 'marsupial';
  /** Days of gestation (viviparous/marsupial) or incubation (oviparous) */
  gestationOrIncubation: number;
  /** Marsupial only: days in pouch after birth */
  pouchDays?: number;
  /** e.g. 'litter' | 'clutch' | 'joey' */
  offspringTerm: string;
  typicalOffspringCount: { min: number; max: number };
  /** Age at sexual maturity in days */
  breedingAge: { male: number; female: number };

  sexTerms: { male: Record<Language, string>; female: Record<Language, string> };
  defaultFields: FieldDef[];
  importAliases: Record<string, string[]>;

  isBuiltIn: boolean;

  // ── Legacy compat ────────────────────────────────────────────────────────
  /** @deprecated Use gestationOrIncubation */
  gestationDays: number;
}

// ── Preset table ─────────────────────────────────────────────────────────────

const PRESETS: readonly SpeciesProfile[] = [
  // ── Livestock ─────────────────────────────────────────────────────────────
  {
    id: 'swine',
    name: { en: 'Swine', ko: '돼지' },
    icon: '🐷',
    category: 'livestock',
    reproductionType: 'viviparous',
    gestationOrIncubation: 114,
    gestationDays: 114,
    offspringTerm: 'litter',
    typicalOffspringCount: { min: 8, max: 14 },
    breedingAge: { male: 240, female: 210 },
    sexTerms: {
      male: { en: 'Boar', ko: '수퇘지' },
      female: { en: 'Sow', ko: '암퇘지' },
    },
    defaultFields: [
      { key: 'weight', label: { en: 'Weight (kg)', ko: '체중 (kg)' }, type: 'number' },
      { key: 'litter_size', label: { en: 'Litter Size', ko: '산자수' }, type: 'number' },
      { key: 'registry_no', label: { en: 'Registry No.', ko: '등록번호' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'dad', 'boar', 'sire_id'],
      dam: ['mother', 'mom', 'sow', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'cattle',
    name: { en: 'Cattle', ko: '소' },
    icon: '🐄',
    category: 'livestock',
    reproductionType: 'viviparous',
    gestationOrIncubation: 283,
    gestationDays: 283,
    offspringTerm: 'calf',
    typicalOffspringCount: { min: 1, max: 1 },
    breedingAge: { male: 365, female: 365 },
    sexTerms: {
      male: { en: 'Bull', ko: '수소' },
      female: { en: 'Cow', ko: '암소' },
    },
    defaultFields: [
      { key: 'breed', label: { en: 'Breed', ko: '품종' }, type: 'text' },
      { key: 'weight', label: { en: 'Weight (kg)', ko: '체중 (kg)' }, type: 'number' },
      { key: 'registry_no', label: { en: 'Registry No.', ko: '등록번호' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'bull', 'sire_id'],
      dam: ['mother', 'cow', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'equine',
    name: { en: 'Horse', ko: '말' },
    icon: '🐴',
    category: 'livestock',
    reproductionType: 'viviparous',
    gestationOrIncubation: 340,
    gestationDays: 340,
    offspringTerm: 'foal',
    typicalOffspringCount: { min: 1, max: 1 },
    breedingAge: { male: 730, female: 730 },
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
    importAliases: {
      sire: ['father', 'stallion', 'sire_id'],
      dam: ['mother', 'mare', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'ovine',
    name: { en: 'Sheep', ko: '양' },
    icon: '🐑',
    category: 'livestock',
    reproductionType: 'viviparous',
    gestationOrIncubation: 152,
    gestationDays: 152,
    offspringTerm: 'lamb',
    typicalOffspringCount: { min: 1, max: 3 },
    breedingAge: { male: 365, female: 365 },
    sexTerms: {
      male: { en: 'Ram', ko: '수양' },
      female: { en: 'Ewe', ko: '암양' },
    },
    defaultFields: [
      { key: 'breed', label: { en: 'Breed', ko: '품종' }, type: 'text' },
      { key: 'fleece_weight', label: { en: 'Fleece Weight (kg)', ko: '양모 무게 (kg)' }, type: 'number' },
      { key: 'registry_no', label: { en: 'Registry No.', ko: '등록번호' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'ram', 'sire_id'],
      dam: ['mother', 'ewe', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'caprine',
    name: { en: 'Goat', ko: '염소' },
    icon: '🐐',
    category: 'livestock',
    reproductionType: 'viviparous',
    gestationOrIncubation: 150,
    gestationDays: 150,
    offspringTerm: 'kid',
    typicalOffspringCount: { min: 1, max: 3 },
    breedingAge: { male: 365, female: 365 },
    sexTerms: {
      male: { en: 'Buck', ko: '수염소' },
      female: { en: 'Doe', ko: '암염소' },
    },
    defaultFields: [
      { key: 'breed', label: { en: 'Breed', ko: '품종' }, type: 'text' },
      { key: 'milk_yield', label: { en: 'Milk Yield (L/day)', ko: '유량 (L/일)' }, type: 'number' },
      { key: 'registry_no', label: { en: 'Registry No.', ko: '등록번호' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'buck', 'sire_id'],
      dam: ['mother', 'doe', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },

  // ── Companion ─────────────────────────────────────────────────────────────
  {
    id: 'canine',
    name: { en: 'Dog', ko: '개' },
    icon: '🐕',
    category: 'companion',
    reproductionType: 'viviparous',
    gestationOrIncubation: 63,
    gestationDays: 63,
    offspringTerm: 'litter',
    typicalOffspringCount: { min: 4, max: 8 },
    breedingAge: { male: 365, female: 365 },
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
    importAliases: {
      sire: ['father', 'stud', 'sire_id'],
      dam: ['mother', 'bitch', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'feline',
    name: { en: 'Cat', ko: '고양이' },
    icon: '🐱',
    category: 'companion',
    reproductionType: 'viviparous',
    gestationOrIncubation: 65,
    gestationDays: 65,
    offspringTerm: 'litter',
    typicalOffspringCount: { min: 3, max: 6 },
    breedingAge: { male: 270, female: 240 },
    sexTerms: {
      male: { en: 'Tom', ko: '수컷' },
      female: { en: 'Queen', ko: '암컷' },
    },
    defaultFields: [
      { key: 'breed', label: { en: 'Breed', ko: '품종' }, type: 'text' },
      { key: 'color', label: { en: 'Color/Pattern', ko: '모색/패턴' }, type: 'text' },
      { key: 'registry_no', label: { en: 'Registry No.', ko: '등록번호' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'tom', 'sire_id'],
      dam: ['mother', 'queen', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'rabbit',
    name: { en: 'Rabbit', ko: '토끼' },
    icon: '🐇',
    category: 'companion',
    reproductionType: 'viviparous',
    gestationOrIncubation: 31,
    gestationDays: 31,
    offspringTerm: 'litter',
    typicalOffspringCount: { min: 4, max: 12 },
    breedingAge: { male: 180, female: 150 },
    sexTerms: {
      male: { en: 'Buck', ko: '수컷' },
      female: { en: 'Doe', ko: '암컷' },
    },
    defaultFields: [
      { key: 'breed', label: { en: 'Breed', ko: '품종' }, type: 'text' },
      { key: 'color', label: { en: 'Color/Markings', ko: '모색' }, type: 'text' },
      { key: 'registry_no', label: { en: 'Registry No.', ko: '등록번호' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'buck', 'sire_id'],
      dam: ['mother', 'doe', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },

  // ── Avian ─────────────────────────────────────────────────────────────────
  {
    id: 'parrot',
    name: { en: 'Parrot', ko: '앵무새' },
    icon: '🦜',
    category: 'avian',
    reproductionType: 'oviparous',
    gestationOrIncubation: 26,
    gestationDays: 26,
    offspringTerm: 'clutch',
    typicalOffspringCount: { min: 2, max: 4 },
    breedingAge: { male: 730, female: 730 },
    sexTerms: {
      male: { en: 'Cock', ko: '수컷' },
      female: { en: 'Hen', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'band_no', label: { en: 'Band No.', ko: '링 번호' }, type: 'text' },
      { key: 'color_mutation', label: { en: 'Color Mutation', ko: '색상 변이' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'cock', 'sire_id'],
      dam: ['mother', 'hen', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'penguin',
    name: { en: 'Penguin', ko: '펭귄' },
    icon: '🐧',
    category: 'avian',
    reproductionType: 'oviparous',
    gestationOrIncubation: 35,
    gestationDays: 35,
    offspringTerm: 'clutch',
    typicalOffspringCount: { min: 1, max: 2 },
    breedingAge: { male: 1095, female: 1095 },
    sexTerms: {
      male: { en: 'Male', ko: '수컷' },
      female: { en: 'Female', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'origin', label: { en: 'Origin', ko: '출처' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'raptor',
    name: { en: 'Raptor', ko: '맹금류' },
    icon: '🦅',
    category: 'avian',
    reproductionType: 'oviparous',
    gestationOrIncubation: 35,
    gestationDays: 35,
    offspringTerm: 'clutch',
    typicalOffspringCount: { min: 1, max: 4 },
    breedingAge: { male: 730, female: 730 },
    sexTerms: {
      male: { en: 'Tiercel', ko: '수컷' },
      female: { en: 'Falcon', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'band_no', label: { en: 'Band No.', ko: '링 번호' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'poultry',
    name: { en: 'Poultry', ko: '가금류' },
    icon: '🐔',
    category: 'avian',
    reproductionType: 'oviparous',
    gestationOrIncubation: 21,
    gestationDays: 21,
    offspringTerm: 'clutch',
    typicalOffspringCount: { min: 8, max: 15 },
    breedingAge: { male: 150, female: 150 },
    sexTerms: {
      male: { en: 'Cock', ko: '수컷' },
      female: { en: 'Hen', ko: '암컷' },
    },
    defaultFields: [
      { key: 'breed', label: { en: 'Breed', ko: '품종' }, type: 'text' },
      { key: 'ring_no', label: { en: 'Ring No.', ko: '링 번호' }, type: 'text' },
      { key: 'egg_production', label: { en: 'Egg Production', ko: '산란수' }, type: 'number' },
    ],
    importAliases: {
      sire: ['father', 'cock', 'rooster', 'sire_id'],
      dam: ['mother', 'hen', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'ratite',
    name: { en: 'Ratite (Ostrich)', ko: '주조류 (타조)' },
    icon: '🦤',
    category: 'avian',
    reproductionType: 'oviparous',
    gestationOrIncubation: 42,
    gestationDays: 42,
    offspringTerm: 'clutch',
    typicalOffspringCount: { min: 8, max: 15 },
    breedingAge: { male: 730, female: 730 },
    sexTerms: {
      male: { en: 'Cock', ko: '수컷' },
      female: { en: 'Hen', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'ring_no', label: { en: 'Ring No.', ko: '링 번호' }, type: 'text' },
      { key: 'weight', label: { en: 'Weight (kg)', ko: '체중 (kg)' }, type: 'number' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },

  // ── Marine ────────────────────────────────────────────────────────────────
  {
    id: 'cetacean',
    name: { en: 'Cetacean (Whale/Dolphin)', ko: '고래목' },
    icon: '🐋',
    category: 'marine',
    reproductionType: 'viviparous',
    gestationOrIncubation: 365,
    gestationDays: 365,
    offspringTerm: 'calf',
    typicalOffspringCount: { min: 1, max: 1 },
    breedingAge: { male: 1825, female: 1825 },
    sexTerms: {
      male: { en: 'Bull', ko: '수컷' },
      female: { en: 'Cow', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'origin', label: { en: 'Origin', ko: '출처' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'pinniped',
    name: { en: 'Pinniped (Seal/Sea Lion)', ko: '기각류' },
    icon: '🦭',
    category: 'marine',
    reproductionType: 'viviparous',
    gestationOrIncubation: 330,
    gestationDays: 330,
    offspringTerm: 'pup',
    typicalOffspringCount: { min: 1, max: 1 },
    breedingAge: { male: 1460, female: 1095 },
    sexTerms: {
      male: { en: 'Bull', ko: '수컷' },
      female: { en: 'Cow', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'origin', label: { en: 'Origin', ko: '출처' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'sea-turtle',
    name: { en: 'Sea Turtle', ko: '바다거북' },
    icon: '🐢',
    category: 'marine',
    reproductionType: 'oviparous',
    gestationOrIncubation: 60,
    gestationDays: 60,
    offspringTerm: 'clutch',
    typicalOffspringCount: { min: 50, max: 200 },
    breedingAge: { male: 5475, female: 5475 },
    sexTerms: {
      male: { en: 'Male', ko: '수컷' },
      female: { en: 'Female', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'tag_no', label: { en: 'Tag No.', ko: '태그 번호' }, type: 'text' },
      { key: 'nesting_site', label: { en: 'Nesting Site', ko: '산란지' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },

  // ── Primate ───────────────────────────────────────────────────────────────
  {
    id: 'primate',
    name: { en: 'Primate', ko: '영장류' },
    icon: '🐒',
    category: 'primate',
    reproductionType: 'viviparous',
    gestationOrIncubation: 180,
    gestationDays: 180,
    offspringTerm: 'infant',
    typicalOffspringCount: { min: 1, max: 2 },
    breedingAge: { male: 1460, female: 1095 },
    sexTerms: {
      male: { en: 'Male', ko: '수컷' },
      female: { en: 'Female', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'origin', label: { en: 'Origin', ko: '출처' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'great-ape',
    name: { en: 'Great Ape', ko: '대형 유인원' },
    icon: '🦍',
    category: 'primate',
    reproductionType: 'viviparous',
    gestationOrIncubation: 260,
    gestationDays: 260,
    offspringTerm: 'infant',
    typicalOffspringCount: { min: 1, max: 1 },
    breedingAge: { male: 3285, female: 2920 },
    sexTerms: {
      male: { en: 'Male', ko: '수컷' },
      female: { en: 'Female', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'origin', label: { en: 'Origin', ko: '출처' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },

  // ── Large Mammals ─────────────────────────────────────────────────────────
  {
    id: 'big-cat',
    name: { en: 'Big Cat', ko: '대형 고양이과' },
    icon: '🐆',
    category: 'large-mammal',
    reproductionType: 'viviparous',
    gestationOrIncubation: 100,
    gestationDays: 100,
    offspringTerm: 'litter',
    typicalOffspringCount: { min: 2, max: 4 },
    breedingAge: { male: 1095, female: 1095 },
    sexTerms: {
      male: { en: 'Male', ko: '수컷' },
      female: { en: 'Female', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'origin', label: { en: 'Origin', ko: '출처' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'elephant',
    name: { en: 'Elephant', ko: '코끼리' },
    icon: '🐘',
    category: 'large-mammal',
    reproductionType: 'viviparous',
    gestationOrIncubation: 660,
    gestationDays: 660,
    offspringTerm: 'calf',
    typicalOffspringCount: { min: 1, max: 1 },
    breedingAge: { male: 3650, female: 3650 },
    sexTerms: {
      male: { en: 'Bull', ko: '수컷' },
      female: { en: 'Cow', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'origin', label: { en: 'Origin', ko: '출처' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'bull', 'sire_id'],
      dam: ['mother', 'cow', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'bear',
    name: { en: 'Bear', ko: '곰' },
    icon: '🐻',
    category: 'large-mammal',
    reproductionType: 'viviparous',
    gestationOrIncubation: 220,
    gestationDays: 220,
    offspringTerm: 'cub',
    typicalOffspringCount: { min: 1, max: 3 },
    breedingAge: { male: 1460, female: 1095 },
    sexTerms: {
      male: { en: 'Boar', ko: '수컷' },
      female: { en: 'Sow', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'origin', label: { en: 'Origin', ko: '출처' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'hippo',
    name: { en: 'Hippopotamus', ko: '하마' },
    icon: '🦛',
    category: 'large-mammal',
    reproductionType: 'viviparous',
    gestationOrIncubation: 240,
    gestationDays: 240,
    offspringTerm: 'calf',
    typicalOffspringCount: { min: 1, max: 1 },
    breedingAge: { male: 2555, female: 2190 },
    sexTerms: {
      male: { en: 'Bull', ko: '수컷' },
      female: { en: 'Cow', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'origin', label: { en: 'Origin', ko: '출처' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'rhino',
    name: { en: 'Rhinoceros', ko: '코뿔소' },
    icon: '🦏',
    category: 'large-mammal',
    reproductionType: 'viviparous',
    gestationOrIncubation: 480,
    gestationDays: 480,
    offspringTerm: 'calf',
    typicalOffspringCount: { min: 1, max: 1 },
    breedingAge: { male: 2190, female: 2190 },
    sexTerms: {
      male: { en: 'Bull', ko: '수컷' },
      female: { en: 'Cow', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'origin', label: { en: 'Origin', ko: '출처' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },

  // ── Marsupial ─────────────────────────────────────────────────────────────
  {
    id: 'kangaroo',
    name: { en: 'Kangaroo', ko: '캥거루' },
    icon: '🦘',
    category: 'marsupial',
    reproductionType: 'marsupial',
    gestationOrIncubation: 33,
    gestationDays: 33,
    pouchDays: 270,
    offspringTerm: 'joey',
    typicalOffspringCount: { min: 1, max: 1 },
    breedingAge: { male: 730, female: 548 },
    sexTerms: {
      male: { en: 'Buck', ko: '수컷' },
      female: { en: 'Doe', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'origin', label: { en: 'Origin', ko: '출처' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'koala',
    name: { en: 'Koala', ko: '코알라' },
    icon: '🐨',
    category: 'marsupial',
    reproductionType: 'marsupial',
    gestationOrIncubation: 35,
    gestationDays: 35,
    pouchDays: 180,
    offspringTerm: 'joey',
    typicalOffspringCount: { min: 1, max: 1 },
    breedingAge: { male: 730, female: 730 },
    sexTerms: {
      male: { en: 'Male', ko: '수컷' },
      female: { en: 'Female', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'origin', label: { en: 'Origin', ko: '출처' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'wombat',
    name: { en: 'Wombat', ko: '웜뱃' },
    icon: '🦡',
    category: 'marsupial',
    reproductionType: 'marsupial',
    gestationOrIncubation: 22,
    gestationDays: 22,
    pouchDays: 180,
    offspringTerm: 'joey',
    typicalOffspringCount: { min: 1, max: 1 },
    breedingAge: { male: 730, female: 548 },
    sexTerms: {
      male: { en: 'Male', ko: '수컷' },
      female: { en: 'Female', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'origin', label: { en: 'Origin', ko: '출처' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },

  // ── Regional ──────────────────────────────────────────────────────────────
  {
    id: 'asian-bear',
    name: { en: 'Asian Bear', ko: '아시아 곰' },
    icon: '🐼',
    category: 'regional',
    reproductionType: 'viviparous',
    gestationOrIncubation: 220,
    gestationDays: 220,
    offspringTerm: 'cub',
    typicalOffspringCount: { min: 1, max: 3 },
    breedingAge: { male: 1460, female: 1095 },
    sexTerms: {
      male: { en: 'Boar', ko: '수컷' },
      female: { en: 'Sow', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'origin', label: { en: 'Origin', ko: '출처' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'cervidae',
    name: { en: 'Cervidae (Deer)', ko: '사슴과' },
    icon: '🦌',
    category: 'regional',
    reproductionType: 'viviparous',
    gestationOrIncubation: 200,
    gestationDays: 200,
    offspringTerm: 'fawn',
    typicalOffspringCount: { min: 1, max: 2 },
    breedingAge: { male: 548, female: 548 },
    sexTerms: {
      male: { en: 'Stag', ko: '수컷' },
      female: { en: 'Hind', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'antler_score', label: { en: 'Antler Score', ko: '뿔 점수' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'stag', 'buck', 'sire_id'],
      dam: ['mother', 'hind', 'doe', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },
  {
    id: 'giraffe',
    name: { en: 'Giraffe', ko: '기린' },
    icon: '🦒',
    category: 'regional',
    reproductionType: 'viviparous',
    gestationOrIncubation: 450,
    gestationDays: 450,
    offspringTerm: 'calf',
    typicalOffspringCount: { min: 1, max: 1 },
    breedingAge: { male: 1825, female: 1460 },
    sexTerms: {
      male: { en: 'Bull', ko: '수컷' },
      female: { en: 'Cow', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'origin', label: { en: 'Origin', ko: '출처' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },

  // ── Legacy compat (zoo) ────────────────────────────────────────────────────
  {
    id: 'zoo',
    name: { en: 'Zoo / Wildlife', ko: '동물원 / 야생동물' },
    icon: '🦁',
    category: 'large-mammal',
    reproductionType: 'viviparous',
    gestationOrIncubation: 90,
    gestationDays: 90,
    offspringTerm: 'offspring',
    typicalOffspringCount: { min: 1, max: 2 },
    breedingAge: { male: 730, female: 730 },
    sexTerms: {
      male: { en: 'Male', ko: '수컷' },
      female: { en: 'Female', ko: '암컷' },
    },
    defaultFields: [
      { key: 'species_name', label: { en: 'Species', ko: '종명' }, type: 'text' },
      { key: 'studbook_no', label: { en: 'Studbook No.', ko: '스터드북 번호' }, type: 'text' },
      { key: 'origin', label: { en: 'Origin', ko: '출처' }, type: 'text' },
    ],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: true,
  },

  // ── Custom (sentinel / user-created base) ─────────────────────────────────
  {
    id: 'custom',
    name: { en: 'Custom', ko: '사용자 정의' },
    icon: '🧬',
    category: 'custom',
    reproductionType: 'viviparous',
    gestationOrIncubation: 30,
    gestationDays: 30,
    offspringTerm: 'offspring',
    typicalOffspringCount: { min: 1, max: 4 },
    breedingAge: { male: 365, female: 365 },
    sexTerms: {
      male: { en: 'Male', ko: '수컷' },
      female: { en: 'Female', ko: '암컷' },
    },
    defaultFields: [],
    importAliases: {
      sire: ['father', 'sire_id'],
      dam: ['mother', 'dam_id'],
      sex: ['gender'],
    },
    isBuiltIn: false,
  },
];

// ── Internal registry (supports user-added profiles at runtime) ───────────────

let _registry: SpeciesProfile[] = [...PRESETS];

/** All built-in preset profiles (read-only snapshot). */
export const SPECIES_PROFILES: readonly SpeciesProfile[] = PRESETS;

// ── Core accessors ────────────────────────────────────────────────────────────

/**
 * Get a profile by id. Falls back to the 'custom' sentinel when unknown.
 * Supports both built-in IDs and any runtime-registered custom profiles.
 */
export function getProfile(id: string): SpeciesProfile {
  return (
    _registry.find(p => p.id === id) ??
    _registry.find(p => p.id === 'custom')!
  );
}

/** @deprecated Use getProfile() */
export function getSpeciesProfile(id: string): SpeciesProfile {
  return getProfile(id);
}

/** All profiles currently registered (built-in + custom). */
export function getAllProfiles(): readonly SpeciesProfile[] {
  return _registry;
}

/** @deprecated Use getAllProfiles() */
export function getSpeciesList(): readonly SpeciesProfile[] {
  return getAllProfiles();
}

// ── Category + search helpers ─────────────────────────────────────────────────

export function getProfilesByCategory(category: string): SpeciesProfile[] {
  return _registry.filter(p => p.category === category);
}

export function searchProfiles(query: string): SpeciesProfile[] {
  const q = query.toLowerCase().trim();
  if (!q) return [..._registry];
  return _registry.filter(p => {
    const nameEn = p.name['en'].toLowerCase();
    const nameKo = p.name['ko'].toLowerCase();
    return (
      nameEn.includes(q) ||
      nameKo.includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });
}

// ── Custom profile factory ────────────────────────────────────────────────────

let _customCounter = 0;

/**
 * Create a new custom profile from a partial definition.
 * The result is NOT automatically registered — call registerProfile() if needed.
 */
export function createCustomProfile(base: Partial<SpeciesProfile>): SpeciesProfile {
  _customCounter += 1;
  const fallback = getProfile('custom');
  const id = base.id ?? `custom-${_customCounter}`;
  return {
    ...fallback,
    ...base,
    id,
    isBuiltIn: false,
    // Ensure gestationDays mirrors gestationOrIncubation for compat
    gestationDays: base.gestationOrIncubation ?? base.gestationDays ?? fallback.gestationDays,
    gestationOrIncubation:
      base.gestationOrIncubation ?? base.gestationDays ?? fallback.gestationOrIncubation,
  };
}

/**
 * Enrich an existing species profile with data from the EOL API.
 *
 * Only missing fields are filled in — existing values are never overwritten.
 * Returns a new profile object (the input is not mutated).
 * Returns the unchanged profile if the lookup fails or the app is offline.
 */
export async function enrichProfileFromEol(profile: SpeciesProfile): Promise<SpeciesProfile> {
  // Use the English name (most likely to match EOL) as the search term.
  const query = profile.name.en ?? profile.name.ko ?? '';
  if (!query) return profile;

  const info = await lookupSpecies(query);
  if (!info) return profile;

  // Build enriched copy — never overwrite fields that already have content.
  const enriched: SpeciesProfile = { ...profile };

  // Fill English name from scientific name if the profile name looks generic.
  if (!enriched.name.en && info.scientificName) {
    enriched.name = { ...enriched.name, en: info.scientificName };
  }

  // Use image URL as icon when the profile still has an emoji or empty icon.
  // An icon that starts with "http" is already a URL, so we leave it alone.
  if (info.imageUrl && !enriched.icon.startsWith('http')) {
    enriched.icon = info.imageUrl;
  }

  return enriched;
}

/**
 * Register a custom profile into the runtime registry.
 * If a profile with the same id already exists it is replaced.
 */
export function registerProfile(profile: SpeciesProfile): void {
  const idx = _registry.findIndex(p => p.id === profile.id);
  if (idx >= 0) {
    _registry[idx] = profile;
  } else {
    _registry.push(profile);
  }
}
