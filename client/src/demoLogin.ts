// Quick Demo sign-in helper.
//
// Demo passwords are NOT stored in source. They are read from a local,
// uncommitted `client/.env.local` (see client/.env.example) and only in the
// Vite dev server (`import.meta.env.DEV`). Production builds (Dockerfile) never
// set these variables and `DEV` is false there, so the Quick Demo buttons are
// not rendered and no demo password is bundled.

export type DemoRole = 'PARTICIPANT' | 'ORGANIZER';

export interface DemoCredentials {
  email: string;
  password: string;
}

export interface DemoEnv {
  DEV?: boolean;
  VITE_DEMO_ORGANIZER_EMAIL?: string;
  VITE_DEMO_ORGANIZER_PASSWORD?: string;
  VITE_DEMO_PARTICIPANT_EMAIL?: string;
  VITE_DEMO_PARTICIPANT_PASSWORD?: string;
}

export function getDemoCredentials(env: DemoEnv): Record<DemoRole, DemoCredentials> | null {
  if (!env.DEV) return null;
  const organizerPassword = env.VITE_DEMO_ORGANIZER_PASSWORD?.trim();
  const participantPassword = env.VITE_DEMO_PARTICIPANT_PASSWORD?.trim();
  if (!organizerPassword || !participantPassword) return null;
  return {
    ORGANIZER: {
      email: env.VITE_DEMO_ORGANIZER_EMAIL?.trim() || 'organizer@kmutt.ac.th',
      password: organizerPassword,
    },
    PARTICIPANT: {
      email: env.VITE_DEMO_PARTICIPANT_EMAIL?.trim() || 'participant@kmutt.ac.th',
      password: participantPassword,
    },
  };
}

