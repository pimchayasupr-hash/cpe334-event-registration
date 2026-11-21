import { describe, it, expect } from 'vitest';
import { resolveSeedCredentials } from '../prisma/seed-config';

const base = {
  SEED_ORGANIZER_PASSWORD: 'org-test-value-1',
  SEED_PARTICIPANT_PASSWORD: 'part-test-value-1',
};

describe('Seed credential resolution (Issue #27)', () => {
  it('uses SEED_* passwords when provided', () => {
    const creds = resolveSeedCredentials({ ...base });
    expect(creds.organizerPassword).toBe('org-test-value-1');
    expect(creds.participantPassword).toBe('part-test-value-1');
  });

  it('falls back to ADMIN_PASSWORD and DEMO_USER_PASSWORD aliases when SEED_* are absent', () => {
    const creds = resolveSeedCredentials({
      ADMIN_PASSWORD: 'alias-admin-value',
      DEMO_USER_PASSWORD: 'alias-demo-value',
    });
    expect(creds.organizerPassword).toBe('alias-admin-value');
    expect(creds.participantPassword).toBe('alias-demo-value');
  });

  it('prioritizes SEED_* over ADMIN_PASSWORD / DEMO_USER_PASSWORD when both are set', () => {
    const creds = resolveSeedCredentials({
      SEED_ORGANIZER_PASSWORD: 'primary-org-value',
      ADMIN_PASSWORD: 'alias-admin-value',
      SEED_PARTICIPANT_PASSWORD: 'primary-part-value',
      DEMO_USER_PASSWORD: 'alias-demo-value',
    });
    expect(creds.organizerPassword).toBe('primary-org-value');
    expect(creds.participantPassword).toBe('primary-part-value');
  });

  it('stops when neither SEED_ORGANIZER_PASSWORD nor ADMIN_PASSWORD is set', () => {
    expect(() => resolveSeedCredentials({ SEED_PARTICIPANT_PASSWORD: 'x' })).toThrow(
      /SEED_ORGANIZER_PASSWORD \(or ADMIN_PASSWORD\) is required/,
    );
  });

  it('stops when neither SEED_PARTICIPANT_PASSWORD nor DEMO_USER_PASSWORD is set (or blank)', () => {
    expect(() =>
      resolveSeedCredentials({
        SEED_ORGANIZER_PASSWORD: 'x',
        SEED_PARTICIPANT_PASSWORD: '   ',
        DEMO_USER_PASSWORD: '',
      }),
    ).toThrow(/SEED_PARTICIPANT_PASSWORD \(or DEMO_USER_PASSWORD\) is required/);
  });

  it('stops in production when no password env var is set', () => {
    expect(() => resolveSeedCredentials({ NODE_ENV: 'production' })).toThrow(/is required/);
  });

  it('rejects .env.example placeholder passwords in production (both SEED_* and alias names)', () => {
    expect(() =>
      resolveSeedCredentials({
        NODE_ENV: 'production',
        SEED_ORGANIZER_PASSWORD: 'change-me-organizer',
        SEED_PARTICIPANT_PASSWORD: 'part-test-value-1',
      }),
    ).toThrow(/placeholder/);

    expect(() =>
      resolveSeedCredentials({
        NODE_ENV: 'production',
        ADMIN_PASSWORD: 'org-test-value-1',
        DEMO_USER_PASSWORD: 'change-me-participant',
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
    expect(creds.participantPassword).toBe('change-me-participant');
  });

  it('uses default account emails when emails are not set', () => {
    const creds = resolveSeedCredentials({ ...base });
    expect(creds.organizerEmail).toBe('organizer@kmutt.ac.th');
    expect(creds.participantEmail).toBe('participant@kmutt.ac.th');
  });
});
