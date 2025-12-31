import { Product, Order, User } from "./types.ts";

/** 
 * --- LOCAL PERSISTENCE ENGINE ---
 * This app is now purely frontend-driven using LocalStorage.
 */
const STORAGE_KEY_PRODUCTS = 'beeraleyda_products_v11'; // Bumped to v11 to force refresh and remove products
const STORAGE_KEY_ORDERS = 'beeraleyda_orders_v1';
const STORAGE_KEY_USERS = 'beeraleyda_users_v1';

const getInitialProducts = (): Product[] => {
  return [
    { id: 'm1', name: 'Moos', nameEn: 'Bananas', category: 'Fruit', price: 0.8, unit: 'kg', quantity: 200, farmerId: 'f1', farmerName: 'Abdi Farah', location: 'Jannaale', image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=800&q=80', verified: true },
    { id: 'm2', name: 'Tamaandho', nameEn: 'Tomatoes', category: 'Vegetables', price: 1.5, unit: 'kg', quantity: 50, farmerId: 'f2', farmerName: 'Maryan Ali', location: 'Afgooye', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80', verified: true },
    { id: 'm3', name: 'Basal', nameEn: 'Onions', category: 'Vegetables', price: 1.2, unit: 'kg', quantity: 150, farmerId: 'f1', farmerName: 'Abdi Farah', location: 'Jannaale', image: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=800&q=80', verified: true },
    { id: 'm5', name: 'Galley', nameEn: 'Corn', category: 'Vegetables', price: 1.0, unit: 'kg', quantity: 300, farmerId: 'f4', farmerName: 'Sahra Ahmed', location: 'Lower Shabelle', image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=80', verified: true },
    { id: 'm7', name: 'Karooto', nameEn: 'Carrots', category: 'Vegetables', price: 1.1, unit: 'kg', quantity: 120, farmerId: 'f2', farmerName: 'Maryan Ali', location: 'Afgooye', image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=800&q=80', verified: true },
    { id: 'm8', name: 'Baradho', nameEn: 'Potatoes', category: 'Vegetables', price: 0.9, unit: 'kg', quantity: 500, farmerId: 'f3', farmerName: 'Hassan Nur', location: 'Baidoa', image: 'https://images.unsplash.com/photo-1508313880080-c4bef0730395?auto=format&fit=crop&w=800&q=80', verified: true },
    { id: 'm12', name: 'Bamiye', nameEn: 'Okra', category: 'Vegetables', price: 2.2, unit: 'kg', quantity: 45, farmerId: 'f3', farmerName: 'Hassan Nur', location: 'Baidoa', image: 'https://images.unsplash.com/photo-1464454709131-ffd692591ee5?auto=format&fit=crop&w=800&q=80', verified: true },
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
};

const getLocalProducts = (): Product[] => {
  const stored = localStorage.getItem(STORAGE_KEY_PRODUCTS);
  if (stored) return JSON.parse(stored);
  const initial = getInitialProducts();
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(initial));
  return initial;
};

const getLocalOrders = (): Order[] => {
  const stored = localStorage.getItem(STORAGE_KEY_ORDERS);
  return stored ? JSON.parse(stored) : [];
};

const getLocalUsers = (): (User & { password?: string })[] => {
  const stored = localStorage.getItem(STORAGE_KEY_USERS);
  return stored ? JSON.parse(stored) : [];
};

let localProductListeners: ((p: Product[]) => void)[] = [];
let localOrderListeners: ((o: Order[]) => void)[] = [];

export const subscribeToProducts = (callback: (products: Product[]) => void) => {
  callback(getLocalProducts());
  localProductListeners.push(callback);
  return () => { 
    localProductListeners = localProductListeners.filter(l => l !== callback); 
  };
};

export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
  callback(getLocalOrders());
  localOrderListeners.push(callback);
  return () => { 
    localOrderListeners = localOrderListeners.filter(l => l !== callback); 
  };
};

export const addProductToDB = async (product: Omit<Product, 'id'>) => {
  const products = getLocalProducts();
  const id = 'local-p-' + Date.now();
  const newP = { ...product, id };
  products.push(newP as Product);
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  localProductListeners.forEach(l => l([...products]));
  return id;
};

export const placeOrderInDB = async (order: Omit<Order, 'id'>) => {
  const orders = getLocalOrders();
  const id = 'local-o-' + Date.now();
  const newO = { ...order, id };
  orders.push(newO as Order);
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  localOrderListeners.forEach(l => l([...orders]));
  return id;
};

// Simulated Auth Methods
export const registerUserLocal = async (user: User & { password?: string }) => {
  const users = getLocalUsers();
  users.push(user);
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  return user;
};

export const loginUserLocal = async (email: string, pass: string): Promise<User | null> => {
  const users = getLocalUsers();
  const found = users.find(u => u.email === email && u.password === pass);
  if (found) {
    const { password, ...userWithoutPass } = found;
    return userWithoutPass;
  }
  return null;
};

export const updatePasswordLocal = async (email: string, newPass: string): Promise<boolean> => {
  const users = getLocalUsers();
  const index = users.findIndex(u => u.email === email);
  if (index !== -1) {
    users[index].password = newPass;
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    return true;
  }
  return false;
};