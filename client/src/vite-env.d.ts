/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_DEMO_ORGANIZER_EMAIL?: string;
  readonly VITE_DEMO_ORGANIZER_PASSWORD?: string;
  readonly VITE_DEMO_PARTICIPANT_EMAIL?: string;
  readonly VITE_DEMO_PARTICIPANT_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

