import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, collection, query, setDoc, Timestamp, orderBy, deleteDoc } from 'firebase/firestore';
import { ClipboardCopy } from 'lucide-react';

// =================================================================
// ĐÃ SỬA LỖI TRUY CẬP BIẾN MÔI TRƯỜNG DÙNG import.meta.env (BẮT BUỘC CHO VITE)
// =================================================================

// Lấy các giá trị từ Biến Môi Trường Vercel. 
const appId = import.meta.env.VITE_APP_ID || 'default-app-id';
const firebaseConfigRaw = import.meta.env.VITE_FIREBASE_CONFIG;
const initialAuthToken = import.meta.env.VITE_AUTH_TOKEN;

// Phân tích cú pháp chuỗi JSON của cấu hình Firebase
let firebaseConfig;
try {
  // BẮT BUỘC: Biến VITE_FIREBASE_CONFIG phải là chuỗi JSON hợp lệ trong Vercel Environment Variables
  firebaseConfig = JSON.parse(firebaseConfigRaw);
} catch (e) {
  console.error("LỖI CẤU HÌNH: Biến VITE_FIREBASE_CONFIG không phải là chuỗi JSON hợp lệ.", e);
}

// Khởi tạo Firebase và Firestore
const app = firebaseConfig ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;

// --- Định nghĩa Kiểu Dữ liệu ---

interface LogEntry {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Timestamp;
}

// --- Component Chính ---

const App: React.FC = () => {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [newEntryContent, setNewEntryContent] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('Người dùng ẩn danh');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Khởi tạo và Xác thực Firebase
  useEffect(() => {
    if (!auth) {
      // Nếu auth không được khởi tạo (do lỗi cấu hình), dừng lại
      console.error("Firebase Auth không được khởi tạo. Kiểm tra VITE_FIREBASE_CONFIG.");
      setIsAuthReady(true); // Vẫn set là ready để hiển thị thông báo lỗi cấu hình
      return;
    }

    // Đăng nhập bằng token tùy chỉnh (nếu có) hoặc ẩn danh
    const authenticate = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Lỗi xác thực Firebase, thử đăng nhập ẩn danh:", error);
        // Fallback an toàn:
        try {
            await signInAnonymously(auth);
        } catch (e) {
            console.error("Không thể đăng nhập ẩn danh lần cuối:", e);
        }
      }
    };

    // Theo dõi trạng thái xác thực
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        // Tên người dùng đơn giản từ ID
        setUserName(`User_${user.uid.substring(0, 8)}`); 
      } else {
        setUserId(null);
      }
      setIsAuthReady(true);
    });

    authenticate();
    return () => unsubscribe();
  }, []); // Chỉ chạy một lần khi component mount

  // 2. Lắng nghe dữ liệu nhật ký theo thời gian thực (Real-time Listener)
  useEffect(() => {
    // Ngăn chặn truy vấn nếu chưa sẵn sàng
    if (!db || !isAuthReady || !userId) {
      return;
    }

    // Đường dẫn bộ sưu tập công khai (chia sẻ giữa các người dùng)
    const publicCollectionPath = `artifacts/${appId}/public/data/class_logs`;
    const logsCollectionRef = collection(db, publicCollectionPath);

    // Truy vấn: Lấy tất cả, sắp xếp theo timestamp giảm dần (mới nhất lên trên)
    const q = query(logsCollectionRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Đảm bảo kiểu dữ liệu khớp
        timestamp: doc.data().timestamp, 
      } as LogEntry));
      setLogEntries(logs);
      setErrorMessage(null); // Xóa lỗi nếu tải thành công
    }, (error) => {
      console.error("Lỗi lắng nghe dữ liệu Firestore:", error);
      setErrorMessage("Lỗi tải dữ liệu. Hãy kiểm tra kết nối và cấu hình Firebase.");
    });

    // Hủy lắng nghe khi component bị hủy hoặc dependencies thay đổi
    return () => unsubscribe();
  }, [db, isAuthReady, userId]);

  // Xử lý lưu nhật ký mới
  const handleSaveEntry = async () => {
    if (!db || !userId || !newEntryContent.trim()) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const publicCollectionPath = `artifacts/${appId}/public/data/class_logs`;
      const logsCollectionRef = collection(db, publicCollectionPath);

      // setDoc với doc() không có ID sẽ tự động tạo ID mới
      await setDoc(doc(logsCollectionRef), { 
        userId: userId,
        userName: userName,
        content: newEntryContent.trim(),
        timestamp: Timestamp.now(),
      });

      setNewEntryContent('');
      setSuccessMessage('Nhật ký đã được lưu thành công!');
    } catch (e) {
      console.error("Lỗi khi ghi nhật ký vào Firestore:", e);
      setErrorMessage("Không thể lưu nhật ký. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMessage(null), 3000); 
    }
  };

  // Xử lý xóa nhật ký
  const handleDeleteEntry = async (id: string, entryUserId: string) => {
    if (!db || !userId || userId !== entryUserId) {
        setErrorMessage("Bạn không có quyền xóa mục nhật ký này.");
        setTimeout(() => setErrorMessage(null), 3000);
        return;
    }

    // Dùng cửa sổ xác nhận đơn giản thay vì window.confirm
    if (!window.confirm("Bạn có chắc chắn muốn xóa mục nhật ký này không?")) return;

    try {
      const publicCollectionPath = `artifacts/${appId}/public/data/class_logs`;
      const docRef = doc(db, publicCollectionPath, id);
      await deleteDoc(docRef);
    } catch (e) {
      console.error("Lỗi khi xóa nhật ký:", e);
      setErrorMessage("Không thể xóa nhật ký. Vui lòng thử lại.");
    }
  };

  // Xử lý sao chép userId
  const handleCopyUserId = () => {
    if (userId) {
      // Dùng navigator.clipboard (phương pháp hiện đại)
      navigator.clipboard.writeText(userId).then(() => {
        setSuccessMessage('Đã sao chép ID người dùng!');
        setTimeout(() => setSuccessMessage(null), 2000);
      }).catch(() => {
         // Fallback cho môi trường không hỗ trợ (như iFrame)
        const tempElement = document.createElement('textarea');
        tempElement.value = userId;
        document.body.appendChild(tempElement);
        tempElement.select();
        document.execCommand('copy'); // Sử dụng API cũ, được hỗ trợ trong iFrame
        document.body.removeChild(tempElement);
        setSuccessMessage('Đã sao chép ID người dùng (Fallback)!');
        setTimeout(() => setSuccessMessage(null), 2000);
      });
    }
  };

  // Định dạng thời gian
  const formatTimestamp = (timestamp: Timestamp) => {
    if (!timestamp) return 'Không rõ thời gian';
    // Sử dụng toDate() để chuyển Timestamp thành đối tượng Date
    const date = timestamp.toDate();
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Hiển thị tải khi chưa xác thực xong
  if (!isAuthReady) {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="text-lg font-medium text-gray-700">Đang tải và xác thực Firebase...</div>
        </div>
    );
  }

  // Hiển thị lỗi cấu hình nếu Firebase không khởi tạo được
  if (!db) {
      return (
          <div className="p-8 text-center bg-red-50 min-h-screen flex items-center justify-center">
              <div className="max-w-xl p-6 bg-white border border-red-300 rounded-lg shadow-lg">
                  <h1 className="text-xl font-bold text-red-600 mb-4">LỖI CẤU HÌNH HỆ THỐNG</h1>
                  <p className="text-gray-700">
                      Không thể kết nối Firebase. Vui lòng kiểm tra lại biến môi trường 
                      <code className="bg-gray-200 p-1 rounded font-mono">VITE_FIREBASE_CONFIG</code> 
                      trên Vercel. Đảm bảo nó là một chuỗi JSON hợp lệ.
                  </p>
              </div>
          </div>
      );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-6 md:p-10">

        {/* TIÊU ĐỀ & TRẠNG THÁI */}
        <h1 className="text-3xl font-extrabold text-blue-600 mb-2">Nhật Ký Lớp Học 2A8</h1>
        <p className="text-gray-500 mb-6 border-b pb-4">Nơi chia sẻ hoạt động và cảm xúc của các thành viên. (Công khai)</p>

        {/* THÔNG TIN NGƯỜI DÙNG & TOÀN CỤC */}
        <div className="bg-blue-50 p-4 rounded-xl mb-6 flex flex-wrap items-center justify-between shadow-inner">
          <p className="text-sm font-medium text-blue-700 truncate">
            Tên hiển thị: <span className="font-semibold">{userName}</span>
          </p>
          <div className="flex items-center mt-2 md:mt-0">
            <p className="text-xs text-gray-600 mr-2 truncate max-w-xs">
              {/* Hiển thị User ID ĐẦY ĐỦ để mọi người có thể tìm thấy nhau */}
              UserID: <span className="font-mono text-xs text-blue-800">{userId}</span>
            </p>
            <button
              onClick={handleCopyUserId}
              className="p-1 rounded-full text-blue-500 hover:bg-blue-200 transition duration-150"
              title="Sao chép UserID"
            >
              <ClipboardCopy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* THÔNG BÁO LỖI & THÀNH CÔNG */}
        {errorMessage && (
          <div className="p-3 mb-4 text-sm font-medium text-red-700 bg-red-100 rounded-lg border border-red-200">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="p-3 mb-4 text-sm font-medium text-green-700 bg-green-100 rounded-lg border border-green-200">
            {successMessage}
          </div>
        )}

        {/* KHU VỰC TẠO NHẬT KÝ MỚI */}
        <div className="mb-8 p-6 bg-white border border-gray-200 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Viết Nhật Ký Mới</h2>
          <textarea
            value={newEntryContent}
            onChange={(e) => setNewEntryContent(e.target.value)}
            placeholder="Bạn muốn chia sẻ điều gì về lớp học hôm nay? (Tối đa 500 ký tự)"
            maxLength={500}
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 resize-none"
            disabled={isSaving}
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-sm text-gray-500">
              {newEntryContent.length} / 500 ký tự
            </span>
            <button
              onClick={handleSaveEntry}
              disabled={isSaving || !newEntryContent.trim()}
              className={`px-6 py-2 rounded-full text-white font-semibold transition duration-300 shadow-lg ${
                isSaving || !newEntryContent.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl'
              }`}
            >
              {isSaving ? 'Đang lưu...' : 'Lưu Nhật Ký'}
            </button>
          </div>
        </div>

        {/* DANH SÁCH NHẬT KÝ */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Các Mục Nhật Ký Đã Chia Sẻ ({logEntries.length})</h2>
        {logEntries.length === 0 && (
          <p className="text-gray-500 italic p-4 border rounded-lg bg-gray-50">
            Chưa có mục nhật ký nào. Hãy là người đầu tiên chia sẻ!
          </p>
        )}

        <div className="space-y-4">
          {logEntries.map((entry) => (
            <div
              key={entry.id}
              // Highlight nhật ký của chính người dùng hiện tại
              className={`p-5 rounded-xl border transition-shadow duration-300 ${entry.userId === userId ? 'bg-blue-50 border-blue-200 shadow-lg' : 'bg-white border-gray-200 shadow-md'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-bold text-gray-700">
                  {entry.userName}
                  {entry.userId === userId && <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-blue-700 bg-blue-200 rounded-full">Bạn</span>}
                </p>
                <p className="text-xs text-gray-500 italic">
                  {formatTimestamp(entry.timestamp)}
                </p>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap mb-3">{entry.content}</p>
              
              {/* NÚT XÓA (CHỈ CHO NGƯỜI TẠO) */}
              {entry.userId === userId && (
                <div className="text-right">
                  <button
                    onClick={() => handleDeleteEntry(entry.id, entry.userId)}
                    className="text-xs font-medium text-red-500 hover:text-red-700 transition duration-150"
                  >
                    Xóa
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;