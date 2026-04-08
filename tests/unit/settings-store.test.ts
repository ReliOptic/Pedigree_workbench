import { describe, expect, it } from 'vitest';

import {
  getActiveNav,
  getLanguage,
  getLastSelectedId,
  setActiveNav,
  setLanguage,
  setLastSelectedId,
} from '../../src/services/settings-store';

describe('settings-store', () => {
  it('returns english as the default language', () => {
    expect(getLanguage()).toBe('en');
  });

  it('round-trips a valid language', () => {
    setLanguage('ko');
    expect(getLanguage()).toBe('ko');
  });

  it('falls back to default when localStorage holds garbage', () => {
    localStorage.setItem('pdw.language', 'klingon');
    expect(getLanguage()).toBe('en');
  });

  it('round-trips and clears the last selected id', () => {
    setLastSelectedId('GEN-0942');
    expect(getLastSelectedId()).toBe('GEN-0942');
    setLastSelectedId(null);
    expect(getLastSelectedId()).toBeNull();
  });

  it('returns workbench when no nav is set', () => {
    expect(getActiveNav()).toBe('workbench');
    setActiveNav('cohort');
    expect(getActiveNav()).toBe('cohort');
  });
});
