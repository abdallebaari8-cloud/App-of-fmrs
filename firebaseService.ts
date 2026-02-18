
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  sendEmailVerification,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { Product, Order, User, UserRole } from "./types.ts";

// Firebase configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyAsnyW-UDRyV29q5LbLA5lV54HgPzDFtBw",
  authDomain: "somali-farmer.firebaseapp.com",
  projectId: "somali-farmer",
  storageBucket: "somali-farmer.firebasestorage.app",
  messagingSenderId: "147562130662",
  appId: "1:147562130662:web:64135db7f6791085d1df27"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/** 
 * --- LOCAL PERSISTENCE ENGINE (Non-Auth Data) ---
 */
const STORAGE_KEY_PRODUCTS = 'beeraleyda_products_v11';
const STORAGE_KEY_ORDERS = 'beeraleyda_orders_v1';
const STORAGE_KEY_USER_METADATA = 'beeraleyda_user_meta_v1';

const safeGetItem = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch (e) { return null; }
};

const safeSetItem = (key: string, value: string) => {
  try { localStorage.setItem(key, value); } catch (e) {}
};

const getUserMeta = (uid: string) => {
  const meta = safeGetItem(STORAGE_KEY_USER_METADATA);
  if (!meta) return {};
  try { return JSON.parse(meta)[uid] || {}; } catch { return {}; }
};

const saveUserMeta = (uid: string, data: any) => {
  const meta = safeGetItem(STORAGE_KEY_USER_METADATA);
  let allMeta = meta ? JSON.parse(meta) : {};
  allMeta[uid] = { ...(allMeta[uid] || {}), ...data };
  safeSetItem(STORAGE_KEY_USER_METADATA, JSON.stringify(allMeta));
};

const getInitialProducts = (): Product[] => [
  { id: 'm1', name: 'Moos', nameEn: 'Bananas', category: 'Fruit', price: 0.8, unit: 'kg', quantity: 200, farmerId: 'f1', farmerName: 'Abdi Farah', location: 'Jannaale', image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=800&q=80', verified: true },
  { id: 'm2', name: 'Tamaandho', nameEn: 'Tomatoes', category: 'Vegetables', price: 1.5, unit: 'kg', quantity: 50, farmerId: 'f2', farmerName: 'Maryan Ali', location: 'Afgooye', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80', verified: true },
  { id: 'm3', name: 'Basal', nameEn: 'Onions', category: 'Vegetables', price: 1.2, unit: 'kg', quantity: 150, farmerId: 'f1', farmerName: 'Abdi Farah', location: 'Jannaale', image: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=800&q=80', verified: true },
  { id: 'm5', name: 'Galley', nameEn: 'Corn', category: 'Vegetables', price: 1.0, unit: 'kg', quantity: 300, farmerId: 'f4', farmerName: 'Sahra Ahmed', location: 'Lower Shabelle', image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=80', verified: true },
  { id: 'm7', name: 'Karooto', nameEn: 'Carrots', category: 'Vegetables', price: 1.1, unit: 'kg', quantity: 120, farmerId: 'f2', farmerName: 'Maryan Ali', location: 'Afgooye', image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=800&q=80', verified: true },
  { id: 'm8', name: 'Baradho', nameEn: 'Potatoes', category: 'Vegetables', price: 0.9, unit: 'kg', quantity: 500, farmerId: 'f3', farmerName: 'Hassan Nur', location: 'Baidoa', image: 'https://images.unsplash.com/photo-1508313880080-c4bef0730395?auto=format&fit=crop&w=800&q=80', verified: true },
  { id: 'm12', name: 'Istoroberi', nameEn: 'Strawberry', category: 'Vegetables', price: 2.2, unit: 'kg', quantity: 45, farmerId: 'f3', farmerName: 'Hassan Nur', location: 'Baidoa', image: 'https://images.unsplash.com/photo-1464454709131-ffd692591ee5?auto=format&fit=crop&w=800&q=80', verified: true },
  { id: 'm13', name: 'Girin', nameEn: 'Wheat', category: 'Grains', price: 1.2, unit: 'kg', quantity: 400, farmerId: 'f4', farmerName: 'Sahra Ahmed', location: 'Jowhar', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80', verified: true },
  { id: 'm14', name: 'Digir', nameEn: 'Beans', category: 'Legumes', price: 1.8, unit: 'kg', quantity: 250, farmerId: 'f3', farmerName: 'Hassan Nur', location: 'Baidoa', image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=800&q=80', verified: true },
  { id: 'm15', name: 'Khayaar', nameEn: 'Cucumber', category: 'Vegetables', price: 0.7, unit: 'kg', quantity: 80, farmerId: 'f2', farmerName: 'Maryan Ali', location: 'Afgooye', image: 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=800&q=80', verified: true },
  { id: 'm16', name: 'Toon', nameEn: 'Garlic', category: 'Vegetables', price: 3.5, unit: 'kg', quantity: 40, farmerId: 'f4', farmerName: 'Sahra Ahmed', location: 'Jowhar', image: 'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&w=800&q=80', verified: true },
  { id: 'm17', name: 'Liin Dhanaan', nameEn: 'Lemon', category: 'Fruit', price: 1.2, unit: 'kg', quantity: 100, farmerId: 'f1', farmerName: 'Abdi Farah', location: 'Jannaale', image: 'https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&w=800&q=80', verified: true },
  { id: 'm18', name: 'Liin Macaan', nameEn: 'Orange', category: 'Fruit', price: 2.0, unit: 'kg', quantity: 150, farmerId: 'f2', farmerName: 'Maryan Ali', location: 'Afgooye', image: 'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=800&q=80', verified: true },
  { id: 'm20', name: 'Canab', nameEn: 'Grapes', category: 'Fruit', price: 5.0, unit: 'kg', quantity: 30, farmerId: 'f3', farmerName: 'Hassan Nur', location: 'Sool', image: 'https://images.unsplash.com/photo-1423483641154-5411ec9c0ddf?auto=format&fit=crop&w=800&q=80', verified: true },
  { id: 'm21', name: 'Xabxab', nameEn: 'Watermelon', category: 'Fruit', price: 3.0, unit: 'piece', quantity: 60, farmerId: 'f4', farmerName: 'Sahra Ahmed', location: 'Lower Shabelle', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80', verified: true },
  { id: 'm22', name: 'Canbe', nameEn: 'Mango', category: 'Fruit', price: 1.2, unit: 'kg', quantity: 100, farmerId: 'f2', farmerName: 'Maryan Ali', location: 'Afgooye', image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80', verified: true },
  { id: 'm24', name: 'Tufaax', nameEn: 'Apple', category: 'Fruit', price: 4.0, unit: 'kg', quantity: 50, farmerId: 'f1', farmerName: 'Abdi Farah', location: 'Hiran', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80', verified: true }
];

const getLocalProducts = (): Product[] => {
  const stored = safeGetItem(STORAGE_KEY_PRODUCTS);
  try { if (stored) return JSON.parse(stored); } catch (e) {}
  const initial = getInitialProducts();
  safeSetItem(STORAGE_KEY_PRODUCTS, JSON.stringify(initial));
  return initial;
};

const getLocalOrders = (): Order[] => {
  const stored = safeGetItem(STORAGE_KEY_ORDERS);
  try { return stored ? JSON.parse(stored) : []; } catch (e) { return []; }
};

let localProductListeners: ((p: Product[]) => void)[] = [];
let localOrderListeners: ((o: Order[]) => void)[] = [];

export const subscribeToProducts = (callback: (products: Product[]) => void) => {
  callback(getLocalProducts());
  localProductListeners.push(callback);
  return () => { localProductListeners = localProductListeners.filter(l => l !== callback); };
};

export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
  callback(getLocalOrders());
  localOrderListeners.push(callback);
  return () => { localOrderListeners = localOrderListeners.filter(l => l !== callback); };
};

export const addProductToDB = async (product: Omit<Product, 'id'>) => {
  const products = getLocalProducts();
  const id = 'local-p-' + Date.now();
  const newP = { ...product, id };
  products.push(newP as Product);
  safeSetItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  localProductListeners.forEach(l => l([...products]));
  return id;
};

export const placeOrderInDB = async (order: Omit<Order, 'id'>) => {
  const orders = getLocalOrders();
  const id = 'local-o-' + Date.now();
  const newO = { ...order, id };
  orders.push(newO as Order);
  safeSetItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  localOrderListeners.forEach(l => l([...orders]));
  return id;
};

/**
 * --- FIREBASE AUTHENTICATION WRAPPERS ---
 */
export const onAuthChange = (callback: (user: any | null) => void) => {
  return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
    if (fbUser) {
      if (!fbUser.emailVerified && !fbUser.providerData.some(p => p.providerId === 'google.com')) {
        callback(null);
        return;
      }
      const meta = getUserMeta(fbUser.uid);
      callback({
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || "User",
        email: fbUser.email || "",
        role: meta.role || UserRole.CUSTOMER,
        location: meta.location || "Mogadishu",
        photoURL: fbUser.photoURL || null
      });
    } else {
      callback(null);
    }
  });
};

export const loginWithFirebase = async (email: string, pass: string) => {
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  return credential.user;
};

export const registerWithFirebase = async (email: string, pass: string, role: UserRole) => {
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  const user = credential.user;
  
  saveUserMeta(user.uid, { role });
  
  await sendEmailVerification(user);
  await signOut(auth);
  return user;
};

export const loginWithGoogle = async () => {
  const credential = await signInWithPopup(auth, googleProvider);
  const user = credential.user;
  
  // If no role exists for this social user, default to CUSTOMER
  const meta = getUserMeta(user.uid);
  if (!meta.role) {
    saveUserMeta(user.uid, { role: UserRole.CUSTOMER });
  }
  
  return user;
};

export const updateUserProfilePhoto = async (photoURL: string) => {
  if (!auth.currentUser) return;
  await updateProfile(auth.currentUser, { photoURL });
};

export const logoutFromFirebase = async () => {
  await signOut(auth);
};
