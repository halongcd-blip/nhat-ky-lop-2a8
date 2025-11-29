/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ID: string;
  // Thêm các biến môi trường khác (nếu có) vào đây, Vercel sẽ tự động xử lý.
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Khai báo các biến toàn cục của Canvas
declare const __app_id: string;
declare const __firebase_config: string;
declare const __initial_auth_token: string | undefined;

// Khai báo các biến bị lỗi (nếu bạn dùng import.meta.env)
// Tuy nhiên, ưu tiên dùng biến __app_id, __firebase_config, __initial_auth_token
// Nếu bạn đang cố gắng truy cập các biến này, hãy đảm bảo chúng được tiền tố VITE_
// Nếu lỗi đang trỏ đến các biến không có VITE_, chúng ta cần điều chỉnh code App.tsx sau.
// Tạm thời, tôi sẽ khai báo kiểu cho các biến mà log báo lỗi.
declare const TEXTAREA: string;
declare const FIREBASE_CONFIG: string;
declare const AUTH_TOKEN: string;