/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Khai báo các biến toàn cục (Global Variables) mà Canvas cung cấp.
// Đây là nơi DUY NHẤT để khai báo chúng, tránh lặp lại trong App.tsx.
declare const __app_id: string;
declare const __firebase_config: string;
declare const __initial_auth_token: string | undefined;