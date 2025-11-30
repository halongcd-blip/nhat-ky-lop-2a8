/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// KHAI BÁO BIẾN TOÀN CỤC CHÍNH XÁC (Canvas Global Variables)
declare const __app_id: string;
declare const __firebase_config: string;
declare const __initial_auth_token: string | undefined;