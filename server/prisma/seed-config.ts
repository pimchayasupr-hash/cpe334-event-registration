// Resolves the credentials used by prisma/seed.ts.
//
// Passwords are never hardcoded here. They must come from the environment
// (local `.env` copied from `.env.example`, CI job env, or Cloud Run job
// secrets). Priority:
//   - Organizer: SEED_ORGANIZER_PASSWORD, then ADMIN_PASSWORD
//   - Participant: SEED_PARTICIPANT_PASSWORD, then DEMO_USER_PASSWORD
// Accepting the deploy.sh alias names (ADMIN_PASSWORD / DEMO_USER_PASSWORD)
// ensures seeding works when pre-provisioned Cloud Run migration jobs cannot
// be inspected directly. If neither variable is set, seeding fails closed
// without any hardcoded fallback and without logging secret values.

export interface SeedCredentials {
  organizerEmail: string;
  organizerPassword: string;
  participantEmail: string;
  participantPassword: string;
}

type Env = Record<string, string | undefined>;

const PLACEHOLDER_PREFIX = 'change-me';

function requireFirstValue(env: Env, primaryName: string, aliasName: string): { name: string; value: string } {
  const primary = env[primaryName]?.trim();
  if (primary) {
    return { name: primaryName, value: primary };
  }
  const alias = env[aliasName]?.trim();
  if (alias) {
    return { name: aliasName, value: alias };
  }
  throw new Error(
    `${primaryName} (or ${aliasName}) is required for seeding. Set it in .env (see .env.example) or map it from a secret in the migration job.`,
  );
}

export function resolveSeedCredentials(env: Env): SeedCredentials {
  const isProduction = env.NODE_ENV === 'production';

  const organizer = requireFirstValue(env, 'SEED_ORGANIZER_PASSWORD', 'ADMIN_PASSWORD');
  const participant = requireFirstValue(env, 'SEED_PARTICIPANT_PASSWORD', 'DEMO_USER_PASSWORD');

  if (isProduction) {
    for (const entry of [organizer, participant]) {
      if (entry.value.toLowerCase().startsWith(PLACEHOLDER_PREFIX)) {
        throw new Error(
          `${entry.name} still uses the .env.example placeholder. Use a real secret in production.`,
        );
      }
    }
  }

  return {
    organizerEmail: env.SEED_ORGANIZER_EMAIL?.trim() || 'organizer@kmutt.ac.th',
    organizerPassword: organizer.value,
    participantEmail: env.SEED_PARTICIPANT_EMAIL?.trim() || 'participant@kmutt.ac.th',
    participantPassword: participant.value,
  };
}
