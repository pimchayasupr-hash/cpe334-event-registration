import { describe, it, expect } from 'vitest';
import { resolveSeedCredentials } from '../prisma/seed-config';

const base = {
  SEED_ORGANIZER_PASSWORD: 'org-test-value-1',
  SEED_PARTICIPANT_PASSWORD: 'part-test-value-1',
};

describe('Seed credential resolution (Issue #27)', () => {
  it('uses passwords from the environment', () => {
    const creds = resolveSeedCredentials({ ...base });
    expect(creds.organizerPassword).toBe('org-test-value-1');
    expect(creds.participantPassword).toBe('part-test-value-1');
  });

  it('stops when SEED_ORGANIZER_PASSWORD is missing (no hardcoded fallback)', () => {
    expect(() => resolveSeedCredentials({ SEED_PARTICIPANT_PASSWORD: 'x' })).toThrow(
      /SEED_ORGANIZER_PASSWORD is required/,
    );
  });

  it('stops when SEED_PARTICIPANT_PASSWORD is missing or blank', () => {
    expect(() =>
      resolveSeedCredentials({ SEED_ORGANIZER_PASSWORD: 'x', SEED_PARTICIPANT_PASSWORD: '   ' }),
    ).toThrow(/SEED_PARTICIPANT_PASSWORD is required/);
  });

  it('stops in production when a password is missing', () => {
    expect(() => resolveSeedCredentials({ NODE_ENV: 'production' })).toThrow(/is required/);
  });

  it('rejects .env.example placeholder passwords in production', () => {
    expect(() =>
      resolveSeedCredentials({
        NODE_ENV: 'production',
        SEED_ORGANIZER_PASSWORD: 'change-me-organizer',
        SEED_PARTICIPANT_PASSWORD: 'part-test-value-1',
      }),
    ).toThrow(/placeholder/);
  });

  it('allows .env.example placeholders outside production (local clean clone, C-03)', () => {
    const creds = resolveSeedCredentials({
      NODE_ENV: 'development',
      SEED_ORGANIZER_PASSWORD: 'change-me-organizer',
      SEED_PARTICIPANT_PASSWORD: 'change-me-participant',
    });
    expect(creds.organizerPassword).toBe('change-me-organizer');
  });

  it('uses default account emails when emails are not set', () => {
    const creds = resolveSeedCredentials({ ...base });
    expect(creds.organizerEmail).toBe('organizer@kmutt.ac.th');
    expect(creds.participantEmail).toBe('participant@kmutt.ac.th');
  });
});

