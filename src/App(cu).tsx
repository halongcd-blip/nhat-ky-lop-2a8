import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  setDoc,
  getDoc,
  setLogLevel
} from 'firebase/firestore';
import { 
  BookHeart, 
  Cat, 
  MessageCircle, 
  UserPlus, 
  LogOut, 
  Send, 
  Star, 
  Users, 
  Calendar,
  Smile,
  Image as ImageIcon,
  GraduationCap,
  Heart,
  MessageSquare,
  Camera,
  Settings,
  ImagePlus
} from 'lucide-react';

// Bật log để debug Firebase
setLogLevel('debug');

// --- Global Variables (Canvas Environment) ---
// *LƯU Ý: Khi triển khai thực tế bên ngoài Canvas, bạn cần thay thế các biến __global này
// bằng các giá trị thực tế của bạn hoặc dùng biến môi trường (environment variables).*
const __app_id = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const __firebase_config = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
const __initial_auth_token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : '';

// --- Firebase Configuration ---
// Khi triển khai, bạn cần thay thế code này bằng config thực tế từ Firebase Console
let firebaseConfig;
try {
  firebaseConfig = JSON.parse(__firebase_config);
} catch (e) {
  console.error("Lỗi parse Firebase Config. Vui lòng kiểm tra biến __firebase_config.", e);
  firebaseConfig = {}; // Fallback
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = __app_id;

// --- Types ---
interface UserProfile {
  id?: string;
  username: string;
  password?: string;
  displayName: string;
  role: 'admin' | 'student';
  avatarColor: string;
}

interface Comment {
  id: string; // usually timestamp + random
  authorName: string;
  content: string;
  createdAt: any;
}

interface Post {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  createdAt: any;
  type: 'diary' | 'pet' | 'chat' | 'homework' | 'rewards' | 'birthday';
  imageUrl?: string;
  likes?: string[]; // Array of userIds who liked
  comments?: Comment[];
}

// --- Helper Components ---

const Button = ({ onClick, children, className = "", variant = "primary", disabled = false }: any) => {
  const baseStyle = "px-4 py-2 rounded-xl font-bold transition-all transform active:scale-95 shadow-md flex items-center justify-center gap-2";
  const variants: any = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white",
    secondary: "bg-pink-400 hover:bg-pink-500 text-white",
    success: "bg-green-500 hover:bg-green-600 text-white",
    danger: "bg-red-400 hover:bg-red-500 text-white",
    purple: "bg-purple-500 hover:bg-purple-600 text-white",
    orange: "bg-orange-400 hover:bg-orange-500 text-white",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-700 shadow-none",
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = "", color = "white" }: any) => {
  const bgColors: any = {
    white: "bg-white",
    yellow: "bg-yellow-50",
    blue: "bg-blue-50",
    pink: "bg-pink-50",
    purple: "bg-purple-50",
  };
  return (
    <div className={`${bgColors[color]} p-4 rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {children}
    </div>
  );
};

// --- Main Application Component ---

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'login' | 'dashboard' | 'diary' | 'pets' | 'chat' | 'admin' | 'homework' | 'rewards' | 'birthday'>('login');
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Login Inputs
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // App Settings (Banner)
  const [bannerUrl, setBannerUrl] = useState('');

  // Data State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  // --- Initialization & Authentication ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (__initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Lỗi xác thực Firebase", e);
        // Fallback to anonymous if custom token fails
        await signInAnonymously(auth);
      }
    };
    initAuth();
    
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (u) => {
        setFirebaseUser(u);
        setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Users & Settings (Depends on isAuthReady)
  useEffect(() => {
    if (!isAuthReady) return;
    
    // Fetch Users
    const qUsers = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const uList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      setUsers(uList);
    }, (err) => console.error("Error fetching users", err));

    // Fetch Settings (Banner)
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
    const unsubSettings = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            setBannerUrl(docSnap.data().bannerUrl || '');
        }
    }, (err) => console.error("Error fetching settings", err));

    return () => {
        unsubUsers();
        unsubSettings();
    };
  }, [isAuthReady]);

  // Fetch Posts based on View (Depends on isAuthReady and view)
  useEffect(() => {
    if (!isAuthReady || (view === 'login' || view === 'dashboard' || view === 'admin')) return;
    
    // Map view to collection name
    let collectionName = '';
    switch(view) {
      case 'chat': collectionName = 'messages'; break;
      case 'diary': collectionName = 'posts_diary'; break;
      case 'pets': collectionName = 'posts_pets'; break;
      case 'homework': collectionName = 'posts_homework'; break;
      case 'rewards': collectionName = 'posts_rewards'; break;
      case 'birthday': collectionName = 'posts_birthday'; break;
      default: return;
    }
    
    const q = collection(db, 'artifacts', appId, 'public', 'data', collectionName);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let pList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      // Sort in memory
      pList.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return view === 'chat' ? tA - tB : tB - tA; // Chat: Oldest first, Others: Newest first
      });
      setPosts(pList);
    }, (err) => console.error("Error fetching posts", err));

    return () => unsubscribe();
  }, [isAuthReady, view]);


  // --- Actions ---

  const handleLogin = () => {
    setLoginError('');
    
    // Logic cho Admin (Giáo viên)
    if (loginUser === 'admin' && loginPass === 'admin') {
      setCurrentUser({
        id: 'admin', // Dùng ID cố định cho admin
        username: 'admin',
        displayName: 'Cô Giáo (Admin)',
        role: 'admin',
        avatarColor: 'bg-purple-500'
      });
      setView('dashboard');
      return;
    }

    // Logic cho Học sinh
    const foundUser = users.find(u => u.username === loginUser && u.password === loginPass);
    if (foundUser) {
      setCurrentUser(foundUser);
      setView('dashboard');
    } else {
      setLoginError('Tên đăng nhập hoặc mật khẩu không đúng!');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('login');
    setLoginUser('');
    setLoginPass('');
  };

  const createPost = async (content: string, type: string, imageUrl?: string) => {
    if (!content.trim() && !imageUrl) return;
    if (!currentUser) return;

    let collectionName = '';
    switch(type) {
      case 'chat': collectionName = 'messages'; break;
      case 'diary': collectionName = 'posts_diary'; break;
      case 'pets': collectionName = 'posts_pets'; break;
      case 'homework': collectionName = 'posts_homework'; break;
      case 'rewards': collectionName = 'posts_rewards'; break;
      case 'birthday': collectionName = 'posts_birthday'; break;
    }

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', collectionName), {
        content,
        type,
        authorId: currentUser.id || 'admin',
        authorName: currentUser.displayName,
        authorColor: currentUser.avatarColor,
        imageUrl: imageUrl || '',
        createdAt: serverTimestamp(),
        likes: [],
        comments: []
      });
    } catch (e) {
      console.error("Error creating post", e);
    }
  };

  const toggleLike = async (post: Post, collectionName: string) => {
    if (!currentUser) return;
    const postRef = doc(db, 'artifacts', appId, 'public', 'data', collectionName, post.id);
    const userId = currentUser.id || 'admin';
    const hasLiked = post.likes?.includes(userId);

    try {
      if (hasLiked) {
        await updateDoc(postRef, { likes: arrayRemove(userId) });
      } else {
        await updateDoc(postRef, { likes: arrayUnion(userId) });
      }
    } catch (e) {
      console.error("Error toggling like", e);
    }
  };

  const addComment = async (post: Post, collectionName: string, commentText: string) => {
    if (!currentUser || !commentText.trim()) return;
    const postRef = doc(db, 'artifacts', appId, 'public', 'data', collectionName, post.id);
    
    const newComment: Comment = {
      id: Date.now().toString(),
      authorName: currentUser.displayName,
      content: commentText,
      createdAt: new Date().toISOString()
    };

    try {
      await updateDoc(postRef, { comments: arrayUnion(newComment) });
    } catch (e) {
      console.error("Error adding comment", e);
    }
  };

  const createUser = async (username: string, pass: string, name: string) => {
    if (!username || !pass || !name) {
        console.error("Thông tin người dùng không đầy đủ.");
        return;
    }
    if (users.find(u => u.username === username)) {
      alert("Tên đăng nhập đã tồn tại!");
      return;
    }
    const colors = ['bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-pink-400', 'bg-indigo-400'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), {
        username,
        password: pass,
        displayName: name,
        role: 'student',
        avatarColor: randomColor
      });
      alert(`Đã tạo tài khoản cho em ${name}`);
    } catch (e) {
      console.error("Error creating user", e);
    }
  };

  const updateBanner = async (url: string) => {
    try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), {
            bannerUrl: url
        }, { merge: true });
        alert('Cập nhật banner thành công!');
        setBannerUrl(url); // Cập nhật state ngay lập tức
    } catch (e) {
        console.error("Error updating banner", e);
    }
  };

  // --- Sub-Components (Views) ---

  const LoginView = () => (
    <div className="min-h-screen bg-yellow-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border-4 border-yellow-300 relative overflow-hidden">
        <div className="text-center mb-8 relative z-10">
          {bannerUrl ? (
             <div className="mb-4 rounded-xl overflow-hidden shadow-lg border-2 border-yellow-200">
                <img src={bannerUrl} alt="Class Banner" className="w-full h-40 object-cover" onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src="https://placehold.co/400x160/FCD34D/FFF?text=Banner+2A8+Lỗi"; }}/>
             </div>
          ) : (
            <div className="inline-block p-4 bg-yellow-200 rounded-full mb-4 animate-bounce">
                <BookHeart size={48} className="text-yellow-600" />
            </div>
          )}
          
          <h1 className="text-3xl font-extrabold text-gray-800 text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600 uppercase tracking-tight">
            Nhật Ký 2A8
          </h1>
          <p className="font-bold text-gray-600 mt-1">Trường Tiểu học Hồng Gai</p>
        </div>

        <div className="space-y-4 relative z-10">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Tên đăng nhập</label>
            <input 
              type="text" 
              value={loginUser}
              onChange={e => setLoginUser(e.target.value)}
              className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-yellow-400 transition-all"
              placeholder="Nhập tên đăng nhập..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu</label>
            <input 
              type="password" 
              value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
              className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-yellow-400 transition-all"
              placeholder="Nhập mật khẩu..."
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
          
          {loginError && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-2 rounded-lg">{loginError}</p>}

          <Button onClick={handleLogin} className="w-full py-3 text-lg shadow-yellow-200" variant="primary">
            Vào Lớp Học
          </Button>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-xl text-sm text-gray-600 border border-blue-100">
             <p><strong>Dành cho giáo viên (Demo):</strong></p>
             <p>User: admin / Pass: admin</p>
             <p className="mt-2"><strong>Dành cho học sinh (Ví dụ):</strong></p>
             {users.filter(u => u.role === 'student').slice(0, 2).map(u => (
                <p key={u.id} className="text-xs">User: {u.username} / Pass: {u.password}</p>
             ))}
          </div>
        </div>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-yellow-200 rounded-full opacity-50 blur-xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-orange-200 rounded-full opacity-50 blur-xl"></div>
      </div>
    </div>
  );

  const Dashboard = () => (
    <div className="p-6 max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Xin chào, {currentUser?.displayName}! 👋</h2>
          <p className="text-gray-500">Chúc bạn một ngày học tập vui vẻ.</p>
        </div>
        <Button onClick={handleLogout} variant="ghost" className="text-red-500">
          <LogOut size={20} /> Thoát
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div onClick={() => setView('diary')} className="cursor-pointer bg-gradient-to-br from-blue-400 to-blue-600 text-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
          <BookHeart size={32} className="mb-4" />
          <h3 className="text-xl font-bold">Nhật Ký Hàng Ngày</h3>
          <p className="opacity-90 text-sm mt-1">Ghi lại niềm vui mỗi ngày.</p>
        </div>
        
        <div onClick={() => setView('pets')} className="cursor-pointer bg-gradient-to-br from-pink-400 to-pink-600 text-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
          <Cat size={32} className="mb-4" />
          <h3 className="text-xl font-bold">Góc Thú Cưng</h3>
          <p className="opacity-90 text-sm mt-1">Chia sẻ ảnh thú cưng.</p>
        </div>

        <div onClick={() => setView('homework')} className="cursor-pointer bg-gradient-to-br from-indigo-400 to-indigo-600 text-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
          <GraduationCap size={32} className="mb-4" />
          <h3 className="text-xl font-bold">Bài Tập & Hỏi Đáp</h3>
          <p className="opacity-90 text-sm mt-1">Thảo luận bài tập về nhà.</p>
        </div>

        <div onClick={() => setView('rewards')} className="cursor-pointer bg-gradient-to-br from-yellow-400 to-yellow-600 text-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
          <Star size={32} className="mb-4" />
          <h3 className="text-xl font-bold">Bảng Bé Ngoan</h3>
          <p className="opacity-90 text-sm mt-1">Xem ai được khen thưởng nào!</p>
        </div>

        <div onClick={() => setView('birthday')} className="cursor-pointer bg-gradient-to-br from-red-400 to-red-600 text-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
          <Calendar size={32} className="mb-4" />
          <h3 className="text-xl font-bold">Góc Sinh Nhật</h3>
          <p className="opacity-90 text-sm mt-1">Chúc mừng sinh nhật các bạn.</p>
        </div>

        <div onClick={() => setView('chat')} className="cursor-pointer bg-gradient-to-br from-green-400 to-green-600 text-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
          <MessageCircle size={32} className="mb-4" />
          <h3 className="text-xl font-bold">Tâm Sự Lớp Học</h3>
          <p className="opacity-90 text-sm mt-1">Trò chuyện vui vẻ.</p>
        </div>

        {currentUser?.role === 'admin' && (
          <div onClick={() => setView('admin')} className="cursor-pointer bg-white border-2 border-purple-200 text-purple-600 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
            <Settings size={32} className="mb-4" />
            <h3 className="text-xl font-bold">Quản Lý Lớp</h3>
            <p className="text-sm mt-1 text-gray-500">Cài đặt & Thêm học sinh.</p>
          </div>
        )}
      </div>
    </div>
  );

  const AdminPanel = () => {
    const [newName, setNewName] = useState('');
    const [newUser, setNewUser] = useState('');
    const [newPass, setNewPass] = useState('');
    const [bannerInput, setBannerInput] = useState(bannerUrl);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleCreate = () => {
        createUser(newUser, newPass, newName);
        setNewName(''); setNewUser(''); setNewPass('');
    }

    const handleBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const res = reader.result as string;
                setBannerInput(res);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
      <div className="max-w-2xl mx-auto pb-20">
        {/* Banner Settings */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-purple-100 mb-8">
            <h2 className="text-2xl font-bold text-purple-600 mb-6 flex items-center gap-2">
                <ImagePlus /> Cài đặt Banner (Màn hình đăng nhập)
            </h2>
            <div className="space-y-4">
                {bannerInput && (
                    <img src={bannerInput} className="w-full h-40 object-cover rounded-xl border" alt="Banner Preview" onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src="https://placehold.co/400x160/FCD34D/FFF?text=Banner+Lỗi"; }} />
                )}
                <div className="flex gap-2">
                    <input 
                        className="flex-1 p-3 bg-gray-50 rounded-xl border"
                        placeholder="Dán link ảnh hoặc tải lên..." 
                        value={bannerInput} 
                        onChange={e => setBannerInput(e.target.value)} 
                    />
                     <input type="file" className="hidden" ref={fileRef} onChange={handleBannerFile} accept="image/*" />
                    <Button variant="ghost" onClick={() => fileRef.current?.click()} className="shrink-0">
                        <ImageIcon size={20}/> Tải ảnh
                    </Button>
                </div>
                <Button variant="purple" onClick={() => updateBanner(bannerInput)} className="w-full">
                    Lưu Banner Mới
                </Button>
            </div>
        </div>

        {/* Add User */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-purple-100 mb-8">
          <h2 className="text-2xl font-bold text-purple-600 mb-6 flex items-center gap-2">
            <UserPlus /> Thêm Học Sinh Mới
          </h2>
          <div className="space-y-4">
            <input className="w-full p-3 bg-gray-50 rounded-xl border" placeholder="Họ và tên học sinh (VD: Nguyễn Văn A)" value={newName} onChange={e => setNewName(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
                <input className="w-full p-3 bg-gray-50 rounded-xl border" placeholder="Tên đăng nhập" value={newUser} onChange={e => setNewUser(e.target.value)} />
                <input className="w-full p-3 bg-gray-50 rounded-xl border" placeholder="Mật khẩu" value={newPass} onChange={e => setNewPass(e.target.value)} />
            </div>
            <Button variant="purple" onClick={handleCreate} className="w-full">Tạo Tài Khoản</Button>
          </div>
        </div>

        {/* User List */}
        <div>
            <h3 className="font-bold text-gray-600 mb-4">Danh sách lớp ({users.filter(u => u.role !== 'admin').length} học sinh)</h3>
            <div className="space-y-2">
                {users.filter(u => u.role !== 'admin').map(u => (
                    <div key={u.id} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${u.avatarColor} flex items-center justify-center text-white font-bold text-xs`}>
                                {u.displayName.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-sm">{u.displayName}</p>
                                <p className="text-xs text-gray-400">User: {u.username}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
  };

  // --- Reusable Post Item Component ---
  const PostItem = ({ post, collectionName }: { post: Post, collectionName: string }) => {
    const [commentText, setCommentText] = useState('');
    const [showComments, setShowComments] = useState(false);
    
    const userId = currentUser?.id || 'admin';
    const isLiked = post.likes?.includes(userId);
    const likeCount = post.likes?.length || 0;

    const handleSendComment = () => {
        if (!commentText.trim()) return;
        addComment(post, collectionName, commentText);
        setCommentText('');
    };

    const quickEmojis = ['❤️', '👍', '😂', '😮', '😢', '🎉', '💯'];

    return (
        <Card color="white" className="border-2 border-gray-50 mb-6">
            <div className="flex items-center gap-2 mb-3">
                <div className={`w-10 h-10 rounded-full ${post.authorColor} flex items-center justify-center text-white font-bold text-sm`}>
                    {post.authorName.charAt(0)}
                </div>
                <div>
                    <p className="font-bold text-gray-800">{post.authorName} 
                       {post.authorId === 'admin' && <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">Giáo viên</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                        {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString('vi-VN') : 'Vừa xong'}
                    </p>
                </div>
            </div>
            
            <p className="text-gray-700 mb-3 whitespace-pre-wrap text-lg">{post.content}</p>
            
            {post.imageUrl && (
                <div className="rounded-2xl overflow-hidden mb-3 bg-gray-100 border border-gray-100">
                    <img src={post.imageUrl} alt="Attachment" className="w-full h-auto object-cover max-h-96" onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src="https://placehold.co/400x160/FCD34D/FFF?text=Ảnh+Lỗi"; }}/>
                </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center gap-4 py-2 border-t border-gray-100">
                <button 
                    onClick={() => toggleLike(post, collectionName)}
                    className={`flex items-center gap-1 font-bold text-sm transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                >
                    <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                    {likeCount > 0 ? likeCount : 'Thả tim'}
                </button>
                <button 
                    onClick={() => setShowComments(!showComments)}
                    className="flex items-center gap-1 font-bold text-sm text-gray-400 hover:text-blue-500 transition-colors"
                >
                    <MessageSquare size={20} />
                    {post.comments?.length || 0} Bình luận
                </button>
            </div>

            {/* Comment Section */}
            {showComments && (
                <div className="mt-3 bg-gray-50 rounded-xl p-3">
                    {/* Existing Comments */}
                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                        {post.comments && post.comments.map((c, idx) => (
                            <div key={idx} className="flex gap-2 text-sm">
                                <span className="font-bold text-gray-800 shrink-0">{c.authorName}:</span>
                                <span className="text-gray-600 break-words">{c.content}</span>
                            </div>
                        ))}
                        {(!post.comments || post.comments.length === 0) && (
                            <p className="text-gray-400 text-center text-xs italic">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                        )}
                    </div>

                    {/* Emoji Bar */}
                    <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                        {quickEmojis.map(emoji => (
                            <button key={emoji} onClick={() => setCommentText(prev => prev + emoji)} className="hover:bg-gray-200 rounded p-1 transition-colors">
                                {emoji}
                            </button>
                        ))}
                    </div>

                    {/* Add Comment */}
                    <div className="flex gap-2">
                        <input 
                            className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                            placeholder="Viết bình luận..."
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                        />
                        <button onClick={handleSendComment} className="bg-blue-500 text-white p-2 rounded-xl hover:bg-blue-600">
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </Card>
    );
  };

  const FeedView = ({ type }: { type: string }) => {
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Permission check for Rewards page (Chỉ Admin mới được đăng Bé Ngoan)
    const canPost = type !== 'rewards' || currentUser?.role === 'admin';

    let collectionName = '';
    let placeholder = '';
    let headerTitle = '';
    
    switch(type) {
      case 'diary': 
        collectionName = 'posts_diary'; 
        placeholder = 'Hôm nay con có chuyện gì vui không?'; 
        headerTitle = 'Nhật Ký Hàng Ngày';
        break;
      case 'pets': 
        collectionName = 'posts_pets'; 
        placeholder = 'Kể về thú cưng của con đi...'; 
        headerTitle = 'Góc Thú Cưng';
        break;
      case 'homework': 
        collectionName = 'posts_homework'; 
        placeholder = 'Con muốn hỏi bài tập nào, hoặc chia sẻ lời giải...'; 
        headerTitle = 'Bài Tập & Hỏi Đáp';
        break;
      case 'rewards': 
        collectionName = 'posts_rewards'; 
        placeholder = 'Cô khen ngợi bạn nào hôm nay...'; 
        headerTitle = 'Bảng Bé Ngoan (Giáo viên)';
        break;
      case 'birthday': 
        collectionName = 'posts_birthday'; 
        placeholder = 'Chúc mừng sinh nhật bạn nào nhỉ?'; 
        headerTitle = 'Góc Sinh Nhật';
        break;
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = () => {
        createPost(content, type, imageUrl);
        setContent('');
        setImageUrl('');
    };

    return (
      <div className="max-w-2xl mx-auto pb-24">
        <div className="mb-6 text-center">
             <h2 className="text-2xl font-bold text-gray-800">{headerTitle}</h2>
        </div>

        {/* Create Post Area */}
        {canPost && (
            <div className="bg-white p-4 rounded-3xl shadow-lg mb-8 border border-blue-100">
            <textarea 
                className="w-full p-3 bg-gray-50 rounded-xl focus:outline-none resize-none text-gray-700"
                rows={3}
                placeholder={placeholder}
                value={content}
                onChange={e => setContent(e.target.value)}
            />
            
            {imageUrl && (
                <div className="relative mt-2 rounded-xl overflow-hidden bg-gray-100 max-h-48 w-fit border">
                    <img src={imageUrl} className="h-full object-contain max-h-48" alt="Preview" onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src="https://placehold.co/100x100/FCD34D/FFF?text=Ảnh+Lỗi"; }}/>
                    <button onClick={() => setImageUrl('')} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 leading-none text-xs w-6 h-6 flex items-center justify-center">X</button>
                </div>
            )}

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileSelect}
                />
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => fileInputRef.current?.click()} className="text-gray-500 hover:bg-gray-100">
                        <ImageIcon size={20} className="text-green-500" /> <span className="text-xs font-bold text-gray-600">Ảnh</span>
                    </Button>
                    <Button variant="ghost" onClick={() => fileInputRef.current?.click()} className="text-gray-500 hover:bg-gray-100">
                        <Camera size={20} className="text-blue-500" /> <span className="text-xs font-bold text-gray-600">Chụp</span>
                    </Button>
                </div>
                
                <Button variant="primary" onClick={handleSubmit} disabled={!content.trim() && !imageUrl}>
                <Send size={18} /> Đăng bài
                </Button>
            </div>
            </div>
        )}
        
        {!canPost && currentUser?.role !== 'admin' && (
            <div className="text-center text-gray-500 py-10 bg-white rounded-3xl border border-dashed border-yellow-300">
                <Star size={48} className="mx-auto mb-2 text-yellow-500"/>
                <p>Khu vực này dành cho cô giáo đăng bài khen thưởng!</p>
                <p className="font-bold">Các con hãy chăm ngoan để được lên Bảng Bé Ngoan nhé!</p>
            </div>
        )}

        {/* Feed List */}
        <div className="space-y-4">
            {posts.map(post => (
                <PostItem key={post.id} post={post} collectionName={collectionName} />
            ))}
            {posts.length === 0 && (
                <div className="text-center text-gray-400 py-10 bg-white rounded-3xl border border-dashed border-gray-300">
                    <Smile size={48} className="mx-auto mb-2 opacity-50"/>
                    <p>Chưa có bài viết nào.</p>
                    {canPost ? <p>Hãy là người đầu tiên chia sẻ!</p> : <p>Chờ cô giáo đăng bài nhé!</p>}
                </div>
            )}
        </div>
      </div>
    );
  };

  const ChatView = () => {
    const [msg, setMsg] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [posts]);

    const sendMsg = () => {
        if (!msg.trim()) return;
        createPost(msg, 'chat');
        setMsg('');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-3xl shadow-xl border border-green-100 overflow-hidden max-w-2xl mx-auto">
            <div className="bg-green-100 p-4 font-bold text-green-700 flex items-center gap-2">
                <MessageCircle size={20} /> Góc Tâm Sự Lớp 2A8
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" ref={scrollRef}>
                {posts.map(post => {
                    // post.authorId === 'admin' vì admin được set id='admin' trong handleLogin
                    const isMe = post.authorId === (currentUser?.id || 'admin') && currentUser?.role === 'admin'; 
                    // Học sinh không dùng id của firebase auth, nên phải dựa vào id được gán trong handleLogin
                    const isStudentMe = currentUser?.role === 'student' && post.authorId === currentUser.id;
                    const finalIsMe = isMe || isStudentMe;
                    
                    return (
                        <div key={post.id} className={`flex ${finalIsMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] ${finalIsMe ? 'bg-green-500 text-white rounded-l-2xl rounded-tr-2xl' : 'bg-white text-gray-800 border border-gray-200 rounded-r-2xl rounded-tl-2xl'} p-3 shadow-sm`}>
                                {!finalIsMe && <p className="text-xs font-bold mb-1 opacity-70 text-green-700">{post.authorName}</p>}
                                <p>{post.content}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="p-3 bg-white border-t flex gap-2">
                <input 
                    className="flex-1 p-3 rounded-xl border focus:outline-none focus:border-green-400 bg-gray-50"
                    placeholder="Nhập tin nhắn..."
                    value={msg}
                    onChange={e => setMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMsg()}
                />
                <Button variant="success" onClick={sendMsg} disabled={!msg.trim()}><Send size={18}/></Button>
            </div>
        </div>
    )
  }

  // --- Main Layout ---
  
  // Hiển thị loading cho đến khi trạng thái auth được kiểm tra xong
  if (!isAuthReady) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-indigo-50">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-blue-500 border-blue-200"></div>
        </div>
    );
  }

  if (view === 'login') return <LoginView />;

  return (
    <div className="min-h-screen bg-indigo-50 font-sans">
        {/* Header Navigation */}
        <div className="bg-white shadow-sm sticky top-0 z-50">
            <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                <div 
                    onClick={() => setView('dashboard')} 
                    className="flex items-center gap-2 font-bold text-lg text-indigo-600 cursor-pointer hover:opacity-80 truncate"
                >
                    <BookHeart /> 
                    <span className="hidden sm:inline">Nhật Ký 2A8 - TH Hồng Gai</span>
                    <span className="sm:hidden">NK 2A8</span>
                </div>
                
                <div className="flex gap-2">
                     <button onClick={() => setView('dashboard')} className={`p-2 rounded-xl transition-colors ${view === 'dashboard' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'}`}>
                        🏠
                     </button>
                     {view !== 'dashboard' && (
                         <span className="px-3 py-1 bg-indigo-100 rounded-full text-xs sm:text-sm font-bold text-indigo-600 flex items-center">
                            {view === 'diary' ? 'Nhật ký' : 
                             view === 'pets' ? 'Thú cưng' : 
                             view === 'chat' ? 'Tâm sự' : 
                             view === 'homework' ? 'Bài tập' :
                             view === 'rewards' ? 'Bé ngoan' :
                             view === 'birthday' ? 'Sinh nhật' :
                             'Quản lý'}
                         </span>
                     )}
                </div>
            </div>
        </div>

        {/* Body Content */}
        <div className="p-4">
            {view === 'dashboard' && <Dashboard />}
            {view === 'admin' && <AdminPanel />}
            {view === 'chat' && <ChatView />}
            {(view !== 'dashboard' && view !== 'admin' && view !== 'chat') && <FeedView type={view} />}
        </div>
    </div>
  );
}