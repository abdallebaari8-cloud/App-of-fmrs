
export enum Language {
  SOMALI = 'so',
  ENGLISH = 'en'
}

export enum UserRole {
  FARMER = 'farmer',
  CUSTOMER = 'customer'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  location?: string;
}

export interface Product {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  price: number;
  unit: string;
  quantity: number;
  farmerId: string;
  farmerName: string;
  location: string;
  image: string;
  verified: boolean;
}

export interface Order {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'shipped' | 'delivered';
  customerPhone: string;
  paymentMethod: 'evc' | 'cash';
  timestamp: number;
}

// Defining ViewType for app navigation
export type ViewType = 'landing' | 'login' | 'market' | 'dashboard' | 'orders';
