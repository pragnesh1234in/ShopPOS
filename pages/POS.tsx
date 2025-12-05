
import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { Product, CartItem, Coupon, Sale } from '../types';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, Printer, Scan, ShoppingCart, Tag, Zap, Percent, IndianRupee, CheckCircle, RotateCcw } from 'lucide-react';

const POS = () => {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState<Coupon | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  
  // New Features State
  const [manualDiscount, setManualDiscount] = useState<string>('');
  const [manualDiscountType, setManualDiscountType] = useState<'amount' | 'percent'>('amount');
  const [isBogoActive, setIsBogoActive] = useState(false);
  const [selectedBogoId, setSelectedBogoId] = useState<number | null>(null);

  // Printing & Success State
  const [lastOrder, setLastOrder] = useState<Sale | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Fetch Settings for Print
  const settings = useLiveQuery(async () => {
    const s = await db.settings.toArray();
    return s[0];
  });

  const products = useLiveQuery(
    async () => {
      let collection = db.products.orderBy('name');
      if (selectedCategory !== 'All') {
        return await collection.filter(p => p.category === selectedCategory).toArray();
      }
      return await collection.toArray();
    },
    [selectedCategory]
  );
  
  const categories = useLiveQuery(async () => {
    const all = await db.products.toArray();
    const cats = new Set(all.map(p => p.category));
    return ['All', ...Array.from(cats)];
  });

  const bogoSchemes = useLiveQuery(() => db.bogoSchemes.toArray());

  // Set default BOGO scheme
  useEffect(() => {
    if (bogoSchemes && bogoSchemes.length > 0 && !selectedBogoId) {
      setSelectedBogoId(bogoSchemes[0].id!);
    }
  }, [bogoSchemes]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search on mount for barcode scanning readiness
  useEffect(() => {
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1, discount: 0 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleBarcodeScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const barcode = query;
      const product = await db.products.where('barcode').equals(barcode).first();
      if (product) {
        addToCart(product);
        setQuery('');
      }
    }
  };

  const applyCoupon = async () => {
    const coupon = await db.coupons.where('code').equals(couponCode).first();
    if (coupon && coupon.active) {
      setActiveCoupon(coupon);
      setCouponCode('');
      alert("Coupon Applied!");
    } else {
      alert("Invalid or inactive coupon");
    }
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // 1. Coupon Discount
  const couponDiscountVal = (activeCoupon?.type === 'flat' ? activeCoupon.value : 
    activeCoupon?.type === 'percent' ? (subtotal * activeCoupon.value / 100) : 0);

  // 2. BOGO Discount
  const currentBogoScheme = bogoSchemes?.find(s => s.id == selectedBogoId);
  
  // Group logic (e.g. Buy 2 Get 1 = Group of 3)
  const bogoGroup = currentBogoScheme ? (currentBogoScheme.buyQty + currentBogoScheme.getQty) : 2;
  const bogoGet = currentBogoScheme ? currentBogoScheme.getQty : 1;

  const bogoDiscount = (isBogoActive && currentBogoScheme)
    ? cart.reduce((sum, item) => {
        // How many complete groups?
        const groups = Math.floor(item.quantity / bogoGroup);
        // Free items = groups * Get Quantity
        const freeItems = groups * bogoGet;
        return sum + (freeItems * item.price);
      }, 0)
    : 0;

  // 3. Manual Discount
  const manualDiscountInput = parseFloat(manualDiscount) || 0;
  const manualDiscountVal = manualDiscountType === 'amount' 
    ? manualDiscountInput 
    : (subtotal * manualDiscountInput / 100);

  // 4. Item level discounts
  const itemDiscounts = cart.reduce((sum, item) => sum + (item.discount * item.quantity), 0);

  const discountTotal = itemDiscounts + couponDiscountVal + bogoDiscount + manualDiscountVal;

  const taxTotal = cart.reduce((sum, item) => {
    const itemTotal = (item.price * item.quantity);
    return sum + (itemTotal * (item.gstRate / 100));
  }, 0);

  const finalTotal = Math.max(0, subtotal + taxTotal - discountTotal);

  // Prepare discount details object
  const currentDiscountDetails = {
    bogo: (isBogoActive && bogoDiscount > 0 && currentBogoScheme) 
      ? { schemeName: currentBogoScheme.name, amount: bogoDiscount } 
      : undefined,
    coupon: (activeCoupon && couponDiscountVal > 0) 
      ? { code: activeCoupon.code, amount: couponDiscountVal } 
      : undefined,
    manual: (manualDiscountVal > 0) 
      ? { amount: manualDiscountVal } 
      : undefined
  };

  const handleCheckout = async (method: 'cash' | 'card' | 'upi') => {
    if (cart.length === 0) return;

    try {
      const saleData: Sale = {
          date: new Date(),
          items: [...cart], // copy current cart items
          subtotal,
          tax: taxTotal,
          discount: discountTotal,
          total: finalTotal,
          paymentMethod: method,
          discountDetails: currentDiscountDetails
      };

      // 1. Save Sale
      await (db as any).transaction('rw', db.sales, db.products, async () => {
        await db.sales.add(saleData);

        // 2. Deduct Stock
        for (const item of cart) {
          const product = await db.products.get(item.id!);
          if (product) {
            await db.products.update(item.id!, {
              stock: product.stock - item.quantity
            });
          }
        }
      });

      // 3. Update UI state
      setLastOrder(saleData); // Store for printing
      setCart([]);
      setActiveCoupon(null);
      setManualDiscount('');
      setManualDiscountType('amount');
      setIsBogoActive(false);
      setShowCheckout(false);
      setShowSuccess(true); // Open Success/Print Modal
      
    } catch (err) {
      console.error("Checkout failed", err);
      alert("Checkout failed. Check stock levels.");
    }
  };

  const handleNewOrder = () => {
    setShowSuccess(false);
    setLastOrder(null);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const handlePrintBill = () => {
    window.print();
  };

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) || 
    p.barcode.includes(query)
  );

  // Derived data for printing: Use lastOrder if in success mode, otherwise use current cart (for estimates)
  const printSource = showSuccess && lastOrder ? lastOrder : {
    items: cart,
    subtotal: subtotal,
    tax: taxTotal,
    discount: discountTotal,
    total: finalTotal,
    discountDetails: currentDiscountDetails
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Product Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-100">
        {/* Header */}
        <header className="bg-white p-4 shadow-sm flex items-center justify-between gap-4 z-10">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search or Scan Barcode..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleBarcodeScan}
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {categories?.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </header>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts?.map(product => (
              <div 
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-all active:scale-95 flex flex-col h-full"
              >
                <div className="bg-slate-100 rounded-lg h-32 mb-3 flex items-center justify-center text-slate-300">
                   {/* Placeholder for image - using standard icon if no image */}
                   <div className="text-4xl font-bold text-slate-200 uppercase tracking-widest">
                      {product.name.substring(0,2)}
                   </div>
                </div>
                <div className="mt-auto">
                  <h3 className="font-semibold text-slate-800 line-clamp-1">{product.name}</h3>
                  <div className="flex justify-between items-end mt-1">
                    <span className="text-indigo-600 font-bold">₹{product.price.toFixed(2)}</span>
                    <span className="text-xs text-slate-500">{product.stock} in stock</span>
                  </div>
                  {product.discountRate ? (
                    <div className="mt-1 text-xs text-green-600 font-medium">{product.discountRate}% OFF</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-xl z-20">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" /> Current Order
          </h2>
          <span className="bg-indigo-200 text-indigo-800 px-2 py-1 rounded-full text-xs font-bold">
            {cart.reduce((a, b) => a + b.quantity, 0)} Items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <Scan className="w-16 h-16 opacity-20" />
              <p>Scan barcode or select items</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-800 text-sm">{item.name}</h4>
                  <div className="text-xs text-slate-500 mt-1">
                    ₹{item.price.toFixed(2)} x {item.quantity}
                    {isBogoActive && currentBogoScheme && item.quantity >= bogoGroup && (
                       <span className="ml-2 text-indigo-600 font-bold text-[10px] bg-indigo-100 px-1 rounded">BOGO ACTIVE</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between gap-2">
                   <div className="font-bold text-slate-800">
                     ₹{(item.price * item.quantity).toFixed(2)}
                   </div>
                   <div className="flex items-center gap-2 bg-white rounded-md shadow-sm border border-slate-200">
                     <button onClick={() => updateQuantity(item.id!, -1)} className="p-1 hover:bg-slate-100 text-slate-600">
                       <Minus className="w-3 h-3" />
                     </button>
                     <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                     <button onClick={() => updateQuantity(item.id!, 1)} className="p-1 hover:bg-slate-100 text-slate-600">
                       <Plus className="w-3 h-3" />
                     </button>
                   </div>
                </div>
                <button onClick={() => removeFromCart(item.id!)} className="text-red-400 hover:text-red-600 self-start">
                   <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-200 p-4 space-y-3 bg-white">
           {/* BOGO Toggle & Selection */}
           <div className={`rounded-lg border transition-colors ${isBogoActive ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
              <div 
                className="flex items-center justify-between p-3 cursor-pointer"
                onClick={() => setIsBogoActive(!isBogoActive)}
              >
                <div className="flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${isBogoActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold ${isBogoActive ? 'text-indigo-900' : 'text-slate-600'}`}>BOGO Scheme</span>
                    <span className="text-[10px] text-slate-500">
                      {isBogoActive && currentBogoScheme 
                         ? `Active: ${currentBogoScheme.name}` 
                         : 'Buy X Get Y Free logic'}
                    </span>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isBogoActive ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${isBogoActive ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>
              
              {/* Dropdown for selecting scheme */}
              {isBogoActive && (
                <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-2">
                   <select 
                     value={selectedBogoId || ''} 
                     onChange={(e) => setSelectedBogoId(Number(e.target.value))}
                     className="w-full text-xs p-2 rounded border border-indigo-200 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                   >
                     {bogoSchemes?.map(s => (
                       <option key={s.id} value={s.id}>{s.name} (Buy {s.buyQty} Get {s.getQty})</option>
                     ))}
                   </select>
                </div>
              )}
           </div>

           {/* Coupon Input */}
           <div className="flex gap-2">
             <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Coupon Code" 
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-indigo-500"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                />
             </div>
             <button onClick={applyCoupon} className="px-3 py-2 bg-slate-800 text-white text-xs rounded-md font-medium hover:bg-slate-900">
               Apply
             </button>
           </div>
           
           {/* Manual Discount Input with Toggle */}
           <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                 {manualDiscountType === 'amount' ? (
                   <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                 ) : (
                   <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                 )}
                 <input 
                   type="number" 
                   placeholder={`Manual Discount (${manualDiscountType === 'amount' ? '₹' : '%'})`}
                   className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-indigo-500"
                   value={manualDiscount}
                   onChange={e => setManualDiscount(e.target.value)}
                 />
              </div>
              <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200">
                <button 
                  onClick={() => setManualDiscountType('amount')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${manualDiscountType === 'amount' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  ₹
                </button>
                <button 
                  onClick={() => setManualDiscountType('percent')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${manualDiscountType === 'percent' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  %
                </button>
              </div>
           </div>

           {/* Totals */}
           <div className="space-y-1 text-sm text-slate-600 pt-2 border-t border-slate-100">
             <div className="flex justify-between">
               <span>Subtotal</span>
               <span>₹{subtotal.toFixed(2)}</span>
             </div>
             <div className="flex justify-between">
               <span>Tax</span>
               <span>₹{taxTotal.toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-green-600 font-medium">
               <span>Discount</span>
               <span>-₹{discountTotal.toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-100">
               <span>Total</span>
               <span>₹{finalTotal.toFixed(2)}</span>
             </div>
           </div>

           <button 
             onClick={() => setShowCheckout(true)}
             disabled={cart.length === 0}
             className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
           >
             Checkout <CreditCard className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* Checkout Payment Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 text-center">
              <h3 className="text-xl font-bold text-slate-800">Complete Payment</h3>
              <p className="text-slate-500 text-sm mt-1">Total Amount: <span className="text-indigo-600 font-bold text-lg">₹{finalTotal.toFixed(2)}</span></p>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <button onClick={() => handleCheckout('cash')} className="flex flex-col items-center gap-3 p-6 border rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                <Banknote className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-slate-700">Cash</span>
              </button>
              <button onClick={() => handleCheckout('card')} className="flex flex-col items-center gap-3 p-6 border rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                <CreditCard className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-slate-700">Card</span>
              </button>
              <button onClick={() => handleCheckout('upi')} className="col-span-2 flex flex-col items-center gap-3 p-6 border rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                <Smartphone className="w-8 h-8 text-indigo-500 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-slate-700">Digital Wallet / UPI</span>
              </button>
            </div>
            <div className="p-4 border-t border-slate-100">
               <button onClick={() => setShowCheckout(false)} className="w-full py-2 text-slate-500 font-medium hover:text-slate-800">
                 Cancel
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Success & Print Modal */}
      {showSuccess && lastOrder && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                 <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Order Successful!</h2>
              <p className="text-slate-500 text-sm mb-6">Transaction ID: #{lastOrder.id || 'Pending'}</p>
              
              <div className="w-full bg-slate-50 rounded-lg p-4 mb-6 border border-slate-100">
                 <div className="flex justify-between text-sm text-slate-600 mb-1">
                   <span>Amount Paid</span>
                   <span className="font-bold">₹{lastOrder.total.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-sm text-slate-600">
                   <span>Method</span>
                   <span className="capitalize">{lastOrder.paymentMethod}</span>
                 </div>
              </div>

              <button 
                onClick={handlePrintBill} 
                className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg mb-3 transition-colors"
              >
                <Printer className="w-5 h-5" /> Print Bill
              </button>
              
              <button 
                onClick={handleNewOrder}
                className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> New Order
              </button>
           </div>
        </div>
      )}

      {/* Print Bill Template (Hidden on screen, visible on print) */}
      <div className="hidden print-only fixed inset-0 bg-white z-[100] p-8">
         <div className="text-center mb-6">
           {settings?.logo && (
             <img src={settings.logo} alt="Store Logo" className="h-16 mx-auto mb-2 object-contain" />
           )}
           <h1 className="text-2xl font-bold">{settings?.storeName || 'NexusPOS'}</h1>
           <p className="text-sm text-gray-500">{settings?.address || 'Store Address'}</p>
           {settings?.phone && <p className="text-sm text-gray-500">Ph: {settings.phone}</p>}
           {settings?.gstNo && <p className="text-sm text-gray-500">GSTIN: {settings.gstNo}</p>}
           
           {lastOrder && showSuccess && (
             <div className="mt-4 border-t border-b border-dashed py-2">
                <p className="text-xs text-slate-600 font-bold">INVOICE #{lastOrder.id}</p>
                <p className="text-xs text-slate-500">{lastOrder.date.toLocaleDateString()} {lastOrder.date.toLocaleTimeString()}</p>
             </div>
           )}
         </div>
         <table className="w-full text-left mb-6 text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {printSource.items.map((item, i) => (
                <tr key={i} className="border-b border-dashed">
                  <td className="py-2">
                    {item.name}
                  </td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">₹{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
              
              {/* Discount Lines */}
              {printSource.discountDetails?.bogo && (
                <tr className="border-b border-dashed text-slate-600 italic">
                  <td className="py-2">BOGO Discount ({printSource.discountDetails.bogo.schemeName})</td>
                  <td className="py-2 text-right"></td>
                  <td className="py-2 text-right">-₹{printSource.discountDetails.bogo.amount.toFixed(2)}</td>
                </tr>
              )}
              {printSource.discountDetails?.coupon && (
                 <tr className="border-b border-dashed text-slate-600 italic">
                   <td className="py-2">Coupon ({printSource.discountDetails.coupon.code})</td>
                   <td className="py-2 text-right"></td>
                   <td className="py-2 text-right">-₹{printSource.discountDetails.coupon.amount.toFixed(2)}</td>
                 </tr>
              )}
              {printSource.discountDetails?.manual && (
                 <tr className="border-b border-dashed text-slate-600 italic">
                   <td className="py-2">Manual Discount</td>
                   <td className="py-2 text-right"></td>
                   <td className="py-2 text-right">-₹{printSource.discountDetails.manual.amount.toFixed(2)}</td>
                 </tr>
              )}
            </tbody>
         </table>
         <div className="space-y-1 text-right font-bold text-sm">
           <p>Subtotal: ₹{printSource.subtotal.toFixed(2)}</p>
           <p>Tax: ₹{printSource.tax.toFixed(2)}</p>
           <p className="text-xl border-t border-dashed pt-2 mt-2">Total: ₹{printSource.total.toFixed(2)}</p>
         </div>
         <div className="mt-8 text-center text-xs text-gray-500">
           {settings?.footerText || "Thank you for your business!"}
         </div>
      </div>
    </div>
  );
};

export default POS;
