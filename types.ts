
export interface Product {
  id?: number;
  name: string;
  barcode: string;
  brand?: string; // New field
  price: number; // Sale Price
  mrp?: number;  // Maximum Retail Price (New field)
  discountRate?: number; // Discount Percentage (New field)
  cost: number;  // Purchase Price
  stock: number;
  category: string;
  gstRate: number; // Percentage, e.g., 18 for 18%
}

export interface CartItem extends Product {
  quantity: number;
  discount: number; // Per unit discount value
}

export interface Sale {
  id?: number;
  date: Date;
  customerName?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'upi';
  discountDetails?: {
    coupon?: { code: string; amount: number };
    bogo?: { schemeName: string; amount: number };
    manual?: { amount: number };
  };
}

export interface Employee {
  id?: number;
  name: string;
  role: 'admin' | 'staff';
  code: string; // Login code
}

export interface Coupon {
  id?: number;
  code: string;
  type: 'percent' | 'flat';
  value: number;
  active: boolean;
}

export interface Expense {
  id?: number;
  date: Date;
  description: string;
  amount: number;
  category: string;
}

export interface Settings {
  id?: number;
  storeName: string;
  currency: string;
  address: string;
  phone?: string;
  gstNo?: string;
  logo?: string; // Base64 string
  footerText?: string;
  taxIncluded: boolean;
}

export interface BogoScheme {
  id?: number;
  name: string;
  buyQty: number;
  getQty: number;
}
