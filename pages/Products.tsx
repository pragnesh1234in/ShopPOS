
import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { Product } from '../types';
import { exportProductsToExcel, importProductsFromExcel, exportProductTemplate } from '../services/excel';
import { Plus, Edit2, Trash2, Download, Upload, Search, X, FileSpreadsheet, Package, Layers, IndianRupee, AlertTriangle } from 'lucide-react';

const Products = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');

  // Form State for controlled inputs to handle auto-calculations
  const [formData, setFormData] = useState({
    mrp: '',
    price: '',
    discount: ''
  });
  
  // Fetch all products for stats calculation
  const allProducts = useLiveQuery(() => db.products.toArray());

  // Derive filtered products for the table
  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];
    return allProducts
      .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts, search]);

  // Calculate Inventory Stats
  const stats = useMemo(() => {
    if (!allProducts) return { count: 0, items: 0, value: 0, lowStock: 0 };
    return allProducts.reduce((acc, curr) => ({
      count: acc.count + 1, // Total unique products
      items: acc.items + curr.stock, // Total physical items
      value: acc.value + (curr.cost * curr.stock), // Total value (Cost based)
      lowStock: curr.stock < 5 ? acc.lowStock + 1 : acc.lowStock
    }), { count: 0, items: 0, value: 0, lowStock: 0 });
  }, [allProducts]);

  // Initialize form data when modal opens or editingProduct changes
  useEffect(() => {
    if (isModalOpen) {
      setFormData({
        mrp: editingProduct?.mrp?.toString() || '',
        price: editingProduct?.price?.toString() || '',
        discount: editingProduct?.discountRate?.toString() || ''
      });
    }
  }, [isModalOpen, editingProduct]);

  // Handle changes and auto-calculate fields
  const handleCalcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const field = e.target.name as 'mrp' | 'price' | 'discount';
    const val = e.target.value;
    
    // Update the field being typed immediately
    const newData = { ...formData, [field]: val };
    const numVal = parseFloat(val);

    // Calculation logic
    if (!isNaN(numVal)) {
      if (field === 'mrp') {
        const disc = parseFloat(formData.discount);
        if (!isNaN(disc)) {
           newData.price = (numVal * (1 - disc / 100)).toFixed(2);
        } else {
           const price = parseFloat(formData.price);
           if (!isNaN(price) && numVal > 0) {
             newData.discount = (((numVal - price) / numVal) * 100).toFixed(2);
           }
        }
      } else if (field === 'discount') {
        const mrp = parseFloat(formData.mrp);
        if (!isNaN(mrp)) {
          newData.price = (mrp * (1 - numVal / 100)).toFixed(2);
        }
      } else if (field === 'price') {
        const mrp = parseFloat(formData.mrp);
        if (!isNaN(mrp) && mrp > 0) {
          newData.discount = (((mrp - numVal) / mrp) * 100).toFixed(2);
        }
      }
    }

    setFormData(newData);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const formEntries = new FormData(formEl);
    const data: any = Object.fromEntries(formEntries.entries());
    
    // Use the state values for the calculated fields to ensure consistency
    data.price = parseFloat(formData.price) || 0;
    data.mrp = parseFloat(formData.mrp) || 0;
    data.discountRate = parseFloat(formData.discount) || 0;
    
    // Parse other numbers
    data.cost = parseFloat(data.cost);
    data.stock = parseInt(data.stock);
    data.gstRate = parseFloat(data.gstRate);

    if (editingProduct?.id) {
      await db.products.update(editingProduct.id, data);
    } else {
      await db.products.add(data);
    }
    
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const deleteProduct = async (id: number) => {
    if (confirm('Delete this product?')) {
      await db.products.delete(id);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      try {
        await importProductsFromExcel(e.target.files[0]);
        alert('Products imported successfully!');
      } catch (err) {
        alert('Error importing file');
        console.error(err);
      }
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Inventory</h1>
          <p className="text-slate-500 mt-1">Manage products, prices and stock levels</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportProductTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Template
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-slate-700 font-medium shadow-sm transition-colors">
            <Upload className="w-4 h-4" /> Import Excel
            <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
          </label>
          <button 
            onClick={exportProductsToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button 
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Inventory Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Total Products</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.count}</h3>
            <p className="text-xs text-slate-400 mt-1">Unique SKUs</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
             <Package className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Total Stock Units</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.items}</h3>
            <p className="text-xs text-slate-400 mt-1">Items in hand</p>
          </div>
          <div className="p-3 bg-amber-100 rounded-lg">
             <Layers className="w-6 h-6 text-amber-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Inventory Value</p>
            <h3 className="text-2xl font-bold text-indigo-600">₹{stats.value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
            <p className="text-xs text-slate-400 mt-1">Total Cost Value</p>
          </div>
          <div className="p-3 bg-emerald-100 rounded-lg">
             <IndianRupee className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Low Stock Alerts</p>
            <h3 className="text-2xl font-bold text-red-600">{stats.lowStock}</h3>
            <p className="text-xs text-slate-400 mt-1">Items below 5 units</p>
          </div>
          <div className="p-3 bg-red-100 rounded-lg">
             <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search products..." 
            className="bg-transparent border-none focus:ring-0 text-slate-700 placeholder-slate-400 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-800">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Brand</th>
                <th className="p-4">Category</th>
                <th className="p-4">Barcode</th>
                <th className="p-4 text-right">MRP</th>
                <th className="p-4 text-right">Discount</th>
                <th className="p-4 text-right">Sale Price</th>
                <th className="p-4 text-right">Stock</th>
                <th className="p-4 text-center">GST %</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-900">{p.name}</td>
                    <td className="p-4 text-slate-500">{p.brand || '-'}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs">{p.category}</span></td>
                    <td className="p-4 font-mono text-xs">{p.barcode}</td>
                    <td className="p-4 text-right text-slate-500">₹{p.mrp?.toFixed(2) || '-'}</td>
                    <td className="p-4 text-right text-green-600">{p.discountRate ? p.discountRate.toFixed(1) + '%' : '-'}</td>
                    <td className="p-4 text-right font-medium text-indigo-600">₹{p.price.toFixed(2)}</td>
                    <td className={`p-4 text-right font-bold ${p.stock < 5 ? 'text-red-500' : 'text-green-600'}`}>
                      {p.stock}
                    </td>
                    <td className="p-4 text-center">{p.gstRate}%</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}
                          className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteProduct(p.id!)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">
                {editingProduct ? 'Edit Product' : 'New Product'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
                  <input name="name" defaultValue={editingProduct?.name} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                
                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                  <input name="brand" defaultValue={editingProduct?.brand} placeholder="e.g. NexusBrew" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <input name="category" list="categories" defaultValue={editingProduct?.category} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  <datalist id="categories">
                    <option value="Beverages" />
                    <option value="Food" />
                    <option value="Electronics" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Barcode</label>
                  <input name="barcode" defaultValue={editingProduct?.barcode} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                {/* Purchase Price (Cost) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Price (₹)</label>
                  <input name="cost" type="number" step="0.01" defaultValue={editingProduct?.cost} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                {/* MRP */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">MRP (₹)</label>
                  <input 
                    name="mrp" 
                    value={formData.mrp}
                    onChange={handleCalcChange}
                    type="number" step="0.01" 
                    placeholder="Max Retail Price" 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>

                {/* Discount % */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Discount (%)</label>
                  <input 
                    name="discount" 
                    value={formData.discount}
                    onChange={handleCalcChange}
                    type="number" step="0.1" 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>

                {/* Sale Price */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sale Price (₹)</label>
                  <input 
                    name="price" 
                    value={formData.price}
                    onChange={handleCalcChange}
                    type="number" step="0.01" 
                    required 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-indigo-50" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
                  <input name="stock" type="number" defaultValue={editingProduct?.stock} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">GST Rate (%)</label>
                  <input name="gstRate" type="number" defaultValue={editingProduct?.gstRate || 0} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold mt-4">
                Save Product
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
