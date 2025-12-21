import { Product, Order } from "./types.ts";

/** 
 * --- LOCAL PERSISTENCE ENGINE ---
 * This app is now purely frontend-driven using LocalStorage.
 */
const STORAGE_KEY_PRODUCTS = 'beeraleyda_products_v1';
const STORAGE_KEY_ORDERS = 'beeraleyda_orders_v1';

const getInitialProducts = (): Product[] => {
  return [
    { id: 'm1', name: 'Moos', nameEn: 'Bananas', category: 'Fruit', price: 0.8, unit: 'kg', quantity: 200, farmerId: 'f1', farmerName: 'Abdi Farah', location: 'Jannaale', image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=800&q=80', verified: true },
    { id: 'm2', name: 'Tamaandho', nameEn: 'Tomatoes', category: 'Vegetables', price: 1.5, unit: 'kg', quantity: 50, farmerId: 'f2', farmerName: 'Maryan Ali', location: 'Afgooye', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80', verified: true },
    { id: 'm3', name: 'Basal', nameEn: 'Onions', category: 'Vegetables', price: 1.2, unit: 'kg', quantity: 150, farmerId: 'f1', farmerName: 'Abdi Farah', location: 'Jannaale', image: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=800&q=80', verified: true }
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
