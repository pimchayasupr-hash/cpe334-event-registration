// Resolves the credentials used by prisma/seed.ts.
//
// Passwords are never hardcoded here. They must come from the environment
// (local `.env` copied from `.env.example`, CI job env, or Cloud Run job
// secrets). If a password is missing, seeding stops instead of falling back to
// a default value, so a misconfigured deploy cannot create accounts with a
// password that is published in this public repository.

export interface SeedCredentials {
  organizerEmail: string;
  organizerPassword: string;
  participantEmail: string;
  participantPassword: string;
}

type Env = Record<string, string | undefined>;

const PLACEHOLDER_PREFIX = 'change-me';

function requireValue(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required for seeding. Set it in .env (see .env.example) or map it from a secret in the migration job.`,
    );
  }
  return value;
}

export function resolveSeedCredentials(env: Env): SeedCredentials {
  const isProduction = env.NODE_ENV === 'production';

  const organizerPassword = requireValue(env, 'SEED_ORGANIZER_PASSWORD');
  const participantPassword = requireValue(env, 'SEED_PARTICIPANT_PASSWORD');

  if (isProduction) {
    for (const [name, value] of [
      ['SEED_ORGANIZER_PASSWORD', organizerPassword],
      ['SEED_PARTICIPANT_PASSWORD', participantPassword],
    ] as const) {
      if (value.toLowerCase().startsWith(PLACEHOLDER_PREFIX)) {
        throw new Error(
          `${name} still uses the .env.example placeholder. Use a real secret in production.`,
        );
      }
    }
  }

  return {
    organizerEmail: env.SEED_ORGANIZER_EMAIL?.trim() || 'organizer@kmutt.ac.th',
    organizerPassword,
    participantEmail: env.SEED_PARTICIPANT_EMAIL?.trim() || 'participant@kmutt.ac.th',
    participantPassword,
  };
}

