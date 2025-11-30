import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, Auth } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, Firestore } from 'firebase/firestore';

// Đã loại bỏ tất cả các dòng 'declare const' khỏi đây. 
// Khai báo type đã được xử lý duy nhất trong file 'vite-env.d.ts'.

// Component chính
const App: React.FC = () => {
    // State để lưu trữ các instance Firebase đã khởi tạo
    const [appInstance, setAppInstance] = useState<FirebaseApp | null>(null);
    const [db, setDb] = useState<Firestore | null>(null);
    const [auth, setAuth] = useState<Auth | null>(null);
    const [appId, setAppId] = useState<string>('default-app-id');

    // State cho thông tin người dùng và dữ liệu
    const [userId, setUserId] = useState<string | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [sharedData, setSharedData] = useState<{ message: string }>({ message: 'Đang tải dữ liệu...' });
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    // --- EFFECT 1: Khởi tạo Firebase ---
    useEffect(() => {
        try {
            // Đọc các biến toàn cục một cách an toàn
            const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            // __firebase_config là chuỗi JSON, phải được parse
            const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
            
            setAppId(currentAppId);

            if (Object.keys(firebaseConfig).length > 0) {
                const firebaseApp = initializeApp(firebaseConfig);
                setAppInstance(firebaseApp);
                setDb(getFirestore(firebaseApp));
                setAuth(getAuth(firebaseApp));
            } else {
                setErrorMessage("Lỗi: Firebase config bị thiếu.");
                setIsAuthReady(true);
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            setErrorMessage("Lỗi khởi tạo Firebase. Vui lòng kiểm tra cấu hình.");
            setIsAuthReady(true);
            setIsLoading(false);
        }
    }, []); 

    // --- EFFECT 2: Xác thực Người dùng ---
    useEffect(() => {
        if (!auth) return;

        const setupAuth = async () => {
            try {
                // Đọc biến toàn cục một cách an toàn
                const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (e) {
                console.error("Firebase Auth failed:", e);
                setErrorMessage("Xác thực Firebase thất bại.");
            }

            // Thiết lập listener cho trạng thái xác thực
            const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    // Nếu không có token, sử dụng ID ngẫu nhiên cho người dùng ẩn danh
                    setUserId(auth.currentUser?.uid || crypto.randomUUID());
                }
                setIsAuthReady(true);
            });
            return unsubscribeAuth;
        };

        setupAuth();
    }, [auth]); 

    // --- EFFECT 3: Lấy dữ liệu công khai (Sau khi xác thực xong) ---
    useEffect(() => {
        // Chỉ chạy khi đã xác thực xong và có các instance cần thiết
        if (!isAuthReady || !userId || !db || !appId) return; 

        // Path công khai (Public data path)
        const publicCollectionPath = `/artifacts/${appId}/public/data/shared_messages`;
        const docRef = doc(db, publicCollectionPath, "welcome_message");

        setIsLoading(true);

        // Thiết lập lắng nghe thay đổi thời gian thực
        const unsubscribeSnapshot = onSnapshot(docRef, 
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
        return () => unsubscribeSnapshot();
    }, [isAuthReady, userId, db, appId]); 

    // Chức năng cập nhật dữ liệu 
    const updateMessage = useCallback(async (newMessage: string) => {
        if (!db || !userId || !appId) return;

        const publicCollectionPath = `/artifacts/${appId}/public/data/shared_messages`;
        const docRef = doc(db, publicCollectionPath, "welcome_message");
        
        try {
            await setDoc(docRef, { message: newMessage, lastUpdatedBy: userId }, { merge: true });
        } catch (error) {
            setErrorMessage("Không thể cập nhật tin nhắn. Vui lòng kiểm tra quyền ghi Firestore.");
            console.error("Update error:", error);
        }
    }, [db, userId, appId]);

    const handleUpdateClick = () => {
        const timestamp = new Date().toLocaleTimeString('vi-VN');
        updateMessage(`Tin nhắn được cập nhật bởi ${userId || 'Ẩn danh'} lúc ${timestamp}`);
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
                        **App ID:** <span className="font-mono text-xs break-all bg-yellow-100 p-1 rounded">{appId}</span>
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
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
                        disabled={!isAuthReady || isLoading || !db}
                        className={`px-6 py-3 rounded-full font-semibold text-white transition duration-200 shadow-md ${
                            isAuthReady && !isLoading && db
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