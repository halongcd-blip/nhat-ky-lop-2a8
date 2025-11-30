/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ID: string;
  // Thêm các biến môi trường khác của Vite nếu cần
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Khai báo các biến toàn cục (Global Variables) mà Canvas cung cấp.
// Đảm bảo các biến này chỉ được khai báo ở đây để tránh xung đột.
declare const __app_id: string;
declare const __firebase_config: string;
declare const __initial_auth_token: string | undefined;

// Xóa bỏ các khai báo không cần thiết hoặc gây lỗi
// Ví dụ: TEXTAREA, FIREBASE_CONFIG, AUTH_TOKEN, v.v.