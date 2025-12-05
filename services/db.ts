
import Dexie, { Table } from 'dexie';
import { Product, Sale, Employee, Coupon, Expense, Settings, BogoScheme } from '../types';

export class NexusPOSDatabase extends Dexie {
  products!: Table<Product>;
  sales!: Table<Sale>;
  employees!: Table<Employee>;
  coupons!: Table<Coupon>;
  expenses!: Table<Expense>;
  settings!: Table<Settings>;
  bogoSchemes!: Table<BogoScheme>;

  constructor() {
    super('NexusPOSDB');
    (this as any).version(1).stores({
      products: '++id, barcode, name, category, brand',
      sales: '++id, date, customerName',
      employees: '++id, name, role',
      coupons: '++id, code, active',
      expenses: '++id, date, category',
      settings: '++id',
      bogoSchemes: '++id, name'
    });
  }
}

export const db = new NexusPOSDatabase();

// Seed initial data if empty
(db as any).on('populate', () => {
  db.products.bulkAdd([
    { name: 'Espresso', barcode: '1001', brand: 'NexusBrew', price: 150.00, mrp: 200.00, discountRate: 25.0, cost: 50.00, stock: 100, category: 'Beverages', gstRate: 18 },
    { name: 'Cappuccino', barcode: '1002', brand: 'NexusBrew', price: 180.00, mrp: 250.00, discountRate: 28.0, cost: 60.00, stock: 100, category: 'Beverages', gstRate: 18 },
    { name: 'Croissant', barcode: '2001', brand: 'BakeryBest', price: 80.00, mrp: 100.00, discountRate: 20.0, cost: 30.00, stock: 50, category: 'Food', gstRate: 5 },
    { name: 'Blueberry Muffin', barcode: '2002', brand: 'BakeryBest', price: 120.00, mrp: 150.00, discountRate: 20.0, cost: 45.00, stock: 40, category: 'Food', gstRate: 5 },
  ]);
  
  db.settings.add({
    storeName: "Nexus Coffee & Co",
    currency: "₹",
    address: "123 Tech Park, Silicon Valley",
    phone: "9876543210",
    gstNo: "29ABCDE1234F1Z5",
    footerText: "Thank you for visiting! Please come again.",
    taxIncluded: false
  });

  db.bogoSchemes.bulkAdd([
    { name: 'Standard BOGO (Buy 1 Get 1)', buyQty: 1, getQty: 1 },
    { name: 'Buy 2 Get 1 Free', buyQty: 2, getQty: 1 }
  ]);

  db.employees.add({
    name: "Admin User",
    role: "admin",
    code: "1234"
  });
});
