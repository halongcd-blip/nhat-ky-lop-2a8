import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, collection, query, setDoc } from 'firebase/firestore';

// Lấy biến môi trường từ Vite. Đảm bảo các biến này đã được đặt trên Vercel/Netlify.
// Vercel (hoặc môi trường Build) sẽ thay thế các biến này bằng giá trị thực.
const appId = import.meta.env.VITE_APP_ID || 'default-app-id';
const firebaseConfigJson = import.meta.env.VITE_FIREBASE_CONFIG;
const initialAuthToken = import.meta.env.VITE_AUTH_TOKEN;

let firebaseApp: any;
let db: any;
let auth: any;

try {
    const firebaseConfig = JSON.parse(firebaseConfigJson);
    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

// Hàm khởi tạo và xác thực người dùng
const setupAuthAndDatabase = async (setUserId: (id: string) => void, setIsAuthReady: (ready: boolean) => void) => {
    if (!auth) {
        setIsAuthReady(true);
        return;
    }

    // Xác thực người dùng
    try {
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }
    } catch (e) {
        console.error("Firebase Auth failed:", e);
    }

    // Thiết lập listener cho trạng thái xác thực
    onAuthStateChanged(auth, (user) => {
        if (user) {
            setUserId(user.uid);
        } else {
            // Trường hợp không có token, sử dụng ID ngẫu nhiên cho người dùng ẩn danh
            setUserId(auth.currentUser?.uid || crypto.randomUUID());
        }
        setIsAuthReady(true);
    });
};

// Component chính
const App: React.FC = () => {
    const [userId, setUserId] = useState<string | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [sharedData, setSharedData] = useState<{ message: string }>({ message: 'Đang tải dữ liệu...' });
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    // 1. Khởi tạo Firebase và Xác thực
    useEffect(() => {
        if (auth) {
            setupAuthAndDatabase(setUserId, setIsAuthReady);
        } else {
             // Xử lý khi khởi tạo Firebase thất bại (do thiếu config)
            setErrorMessage("Lỗi: Firebase chưa được cấu hình. Vui lòng kiểm tra VITE_FIREBASE_CONFIG.");
            setIsAuthReady(true);
            setIsLoading(false);
        }
    }, []);

    // 2. Lấy dữ liệu công khai (Sau khi xác thực xong)
    useEffect(() => {
        if (!isAuthReady || !userId || !db) return;

        // Path công khai (Public data path)
        const publicCollectionPath = `/artifacts/${appId}/public/data/shared_messages`;
        const docRef = doc(db, publicCollectionPath, "welcome_message");

        setIsLoading(true);

        const unsubscribe = onSnapshot(docRef, 
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    setSharedData(docSnapshot.data() as { message: string });
                } else {
                    // Nếu tài liệu không tồn tại, tạo tài liệu mặc định
                    setDoc(docRef, { message: "Chào mừng đến với Nhật Ký Lớp 2A8!" }, { merge: true })
                        .then(() => setSharedData({ message: "Chào mừng đến với Nhật Ký Lớp 2A8!" }))
                        .catch(err => console.error("Error creating default doc:", err));
                }
                setIsLoading(false);
            }, 
            (error) => {
                console.error("Firestore Snapshot Error:", error);
                setErrorMessage("Lỗi khi tải dữ liệu: Vui lòng kiểm tra Quy tắc bảo mật Firestore.");
                setIsLoading(false);
            }
        );

        // Cleanup listener
        return () => unsubscribe();
    }, [isAuthReady, userId]); // Dependency on isAuthReady and userId

    // Chức năng cập nhật dữ liệu
    const updateMessage = async (newMessage: string) => {
        if (!db || !userId) return;

        const publicCollectionPath = `/artifacts/${appId}/public/data/shared_messages`;
        const docRef = doc(db, publicCollectionPath, "welcome_message");
        
        try {
            await setDoc(docRef, { message: newMessage, lastUpdatedBy: userId }, { merge: true });
        } catch (error) {
            setErrorMessage("Không thể cập nhật tin nhắn. Vui lòng kiểm tra quyền ghi Firestore.");
            console.error("Update error:", error);
        }
    };

    const handleUpdateClick = () => {
        const timestamp = new Date().toLocaleTimeString();
        updateMessage(`Tin nhắn được cập nhật bởi ${userId} lúc ${timestamp}`);
    };

    // Hiển thị UI
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
            <script src="https://cdn.tailwindcss.com"></script>
            <div className="w-full max-w-2xl bg-white shadow-xl rounded-xl p-8 space-y-6">
                <header className="text-center">
                    <h1 className="text-4xl font-extrabold text-indigo-700">
                        Nhật Ký Lớp 2A8
                    </h1>
                    <p className="text-gray-500 mt-2">Ứng dụng cộng tác thời gian thực</p>
                </header>

                <section className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <h2 className="text-xl font-semibold text-indigo-600 mb-2">Thông tin hệ thống</h2>
                    <p className="text-sm text-gray-700">
                        **User ID:** <span className="font-mono text-xs break-all bg-yellow-100 p-1 rounded">{userId || 'Đang xác thực...'}</span>
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                        **Trạng thái DB:** {isAuthReady ? (isLoading ? 'Đang tải...' : 'Sẵn sàng') : 'Đang khởi tạo...'}
                    </p>
                </section>
                
                {errorMessage && (
                    <div className="p-4 text-sm text-red-800 bg-red-100 rounded-lg" role="alert">
                        <span className="font-medium">Lỗi nghiêm trọng:</span> {errorMessage}
                    </div>
                )}

                <section className="text-center p-6 bg-indigo-100 rounded-xl shadow-inner">
                    <h2 className="text-2xl font-bold text-indigo-800 mb-4">Tin nhắn Chung (Chia sẻ Công khai)</h2>
                    <div className="min-h-16 flex items-center justify-center">
                        {isLoading && isAuthReady ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        ) : (
                            <p className="text-gray-800 text-lg italic">{sharedData.message}</p>
                        )}
                    </div>
                </section>

                <div className="flex justify-center">
                    <button
                        onClick={handleUpdateClick}
                        disabled={!isAuthReady || isLoading}
                        className={`px-6 py-3 rounded-full font-semibold text-white transition duration-200 shadow-md ${
                            isAuthReady && !isLoading 
                                ? 'bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-4 focus:ring-green-300' 
                                : 'bg-gray-400 cursor-not-allowed'
                        }`}
                    >
                        Cập nhật Tin nhắn Mẫu (Public)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default App;