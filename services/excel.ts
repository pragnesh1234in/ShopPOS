
import * as XLSX from 'xlsx';
import { db } from './db';
import { Product } from '../types';

export const exportProductsToExcel = async () => {
  const products = await db.products.toArray();
  const worksheet = XLSX.utils.json_to_sheet(products);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
  XLSX.writeFile(workbook, "NexusPOS_Products.xlsx");
};

export const exportSalesToExcel = async () => {
  const sales = await db.sales.toArray();
  // Flatten sales for easier reading
  const flattenedSales = sales.map(s => ({
    ID: s.id,
    Date: s.date.toLocaleDateString(),
    Total: s.total,
    Payment: s.paymentMethod,
    Items: s.items.map(i => `${i.name} x${i.quantity}`).join(', ')
  }));
  
  const worksheet = XLSX.utils.json_to_sheet(flattenedSales);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");
  XLSX.writeFile(workbook, "NexusPOS_Sales.xlsx");
};

export const exportProductTemplate = () => {
  const template = [
    {
      name: "Sample Product Name",
      brand: "Brand Name",
      category: "Category",
      barcode: "1234567890",
      mrp: 100,
      discountRate: 10,
      price: 90,
      stock: 50,
      gstRate: 18,
      cost: 60
    }
  ];
  
  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Import Template");
  XLSX.writeFile(workbook, "NexusPOS_Import_Template.xlsx");
};

export const importProductsFromExcel = async (file: File) => {
  return new Promise<void>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as Product[];

        // Basic validation and sanitation
        const validProducts = json.filter(p => p.name && p.price).map(p => ({
          ...p,
          brand: p.brand || '',
          mrp: Number(p.mrp) || 0,
          discountRate: Number(p.discountRate) || 0,
          stock: Number(p.stock) || 0,
          price: Number(p.price) || 0,
          cost: Number(p.cost) || 0,
          gstRate: Number(p.gstRate) || 0,
          barcode: String(p.barcode || Math.floor(Math.random() * 1000000))
        }));

        await db.products.bulkPut(validProducts);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsBinaryString(file);
  });
};
