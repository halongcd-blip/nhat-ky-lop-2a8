import React from 'react';
import ReactDOM from 'react-dom/client';
// Import component App chính.
import App from './App'; 
import './index.css';

// Khởi tạo ứng dụng React và render component App
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);