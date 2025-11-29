/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Khai báo các biến toàn cục mà Canvas cung cấp
declare const __app_id: string;
declare const __firebase_config: string;
declare const __initial_auth_token: string | undefined;

// Khai báo cho các biến bị lỗi trong file App.tsx của bạn
declare const TEXTAREA: string;
declare const FIREBASE_CONFIG: string;
declare const AUTH_TOKEN: string;