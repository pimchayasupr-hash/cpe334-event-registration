import { describe, it, expect } from 'vitest';
import { getDemoCredentials } from './demoLogin';

const devEnv = {
  DEV: true,
  VITE_DEMO_ORGANIZER_PASSWORD: 'local-org-value',
  VITE_DEMO_PARTICIPANT_PASSWORD: 'local-part-value',
};

describe('Quick Demo credentials (Issue #27)', () => {
  it('is disabled outside the Vite dev server (production build)', () => {
    expect(getDemoCredentials({ ...devEnv, DEV: false })).toBeNull();
  });

  it('is disabled in dev when demo passwords are not set in .env.local', () => {
    expect(getDemoCredentials({ DEV: true })).toBeNull();
  });

  it('uses passwords only from env in dev', () => {
    const creds = getDemoCredentials(devEnv);
    expect(creds?.ORGANIZER.password).toBe('local-org-value');
    expect(creds?.PARTICIPANT.password).toBe('local-part-value');
    expect(creds?.ORGANIZER.email).toBe('organizer@kmutt.ac.th');
  });
});

