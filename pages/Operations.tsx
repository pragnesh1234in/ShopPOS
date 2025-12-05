import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { Trash2, Plus, Percent, Users, IndianRupee, Tag } from 'lucide-react';

const Tabs = ({ active, onChange }: { active: string; onChange: (v: string) => void }) => (
  <div className="flex space-x-1 bg-slate-200 p-1 rounded-xl mb-6 inline-flex">
    {['Coupons', 'Employees', 'Expenses'].map(tab => (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          active === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
        }`}
      >
        {tab}
      </button>
    ))}
  </div>
);

const CouponsPanel = () => {
  const coupons = useLiveQuery(() => db.coupons.toArray());
  
  const addCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    await db.coupons.add({
      code: fd.get('code') as string,
      type: fd.get('type') as 'percent' | 'flat',
      value: Number(fd.get('value')),
      active: true
    });
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Plus className="w-5 h-5" /> Create Coupon</h3>
        <form onSubmit={addCoupon} className="space-y-4">
          <input name="code" placeholder="Coupon Code (e.g. SUMMER20)" required className="w-full border p-2 rounded" />
          <div className="flex gap-4">
             <select name="type" className="border p-2 rounded flex-1">
               <option value="percent">Percentage (%)</option>
               <option value="flat">Flat Amount (₹)</option>
             </select>
             <input name="value" type="number" placeholder="Value" required className="border p-2 rounded flex-1" />
          </div>
          <button className="w-full bg-indigo-600 text-white py-2 rounded font-medium">Create Coupon</button>
        </form>
      </div>
      
      <div className="space-y-3">
        {coupons?.map(c => (
          <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-800">{c.code}</p>
              <p className="text-xs text-slate-500">{c.type === 'percent' ? `${c.value}% Off` : `₹${c.value} Off`}</p>
            </div>
            <button onClick={() => db.coupons.delete(c.id!)} className="text-red-400 hover:text-red-600">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
        {coupons?.length === 0 && <p className="text-slate-400 text-center py-4">No active coupons</p>}
      </div>
    </div>
  );
};

const EmployeesPanel = () => {
  const employees = useLiveQuery(() => db.employees.toArray());

  const addEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    await db.employees.add({
      name: fd.get('name') as string,
      role: fd.get('role') as 'admin' | 'staff',
      code: fd.get('code') as string
    });
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Users className="w-5 h-5" /> Add Staff</h3>
        <form onSubmit={addEmployee} className="space-y-4">
          <input name="name" placeholder="Full Name" required className="w-full border p-2 rounded" />
          <input name="code" placeholder="Login Code" required className="w-full border p-2 rounded" />
          <select name="role" className="w-full border p-2 rounded">
            <option value="staff">Staff</option>
            <option value="admin">Manager/Admin</option>
          </select>
          <button className="w-full bg-indigo-600 text-white py-2 rounded font-medium">Add Employee</button>
        </form>
      </div>
      
      <div className="space-y-3">
        {employees?.map(e => (
          <div key={e.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-2 rounded-full">
                <Users className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="font-bold text-slate-800">{e.name}</p>
                <p className="text-xs text-slate-500 uppercase">{e.role}</p>
              </div>
            </div>
            <button onClick={() => db.employees.delete(e.id!)} className="text-red-400 hover:text-red-600">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ExpensesPanel = () => {
  const expenses = useLiveQuery(() => db.expenses.toArray());
  
  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    await db.expenses.add({
      date: new Date(),
      description: fd.get('description') as string,
      amount: Number(fd.get('amount')),
      category: fd.get('category') as string
    });
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><IndianRupee className="w-5 h-5" /> Record Expense</h3>
        <form onSubmit={addExpense} className="space-y-4">
          <input name="description" placeholder="Description (e.g. Utility Bill)" required className="w-full border p-2 rounded" />
          <input name="amount" type="number" placeholder="Amount (₹)" required className="w-full border p-2 rounded" />
          <input name="category" placeholder="Category" list="expCategories" className="w-full border p-2 rounded" />
          <datalist id="expCategories">
             <option value="Utilities" />
             <option value="Rent" />
             <option value="Supplies" />
          </datalist>
          <button className="w-full bg-indigo-600 text-white py-2 rounded font-medium">Save Expense</button>
        </form>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
           <thead className="bg-slate-50 text-slate-600">
             <tr>
               <th className="p-3">Desc</th>
               <th className="p-3 text-right">Amt</th>
               <th className="p-3"></th>
             </tr>
           </thead>
           <tbody>
             {expenses?.map(ex => (
               <tr key={ex.id} className="border-t border-slate-50">
                 <td className="p-3">
                   <p className="font-medium text-slate-800">{ex.description}</p>
                   <p className="text-xs text-slate-500">{ex.date.toLocaleDateString()}</p>
                 </td>
                 <td className="p-3 text-right font-medium text-red-500">-₹{ex.amount.toFixed(2)}</td>
                 <td className="p-3 text-right">
                    <button onClick={() => db.expenses.delete(ex.id!)} className="text-slate-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                 </td>
               </tr>
             ))}
           </tbody>
        </table>
      </div>
    </div>
  );
};

const Operations = () => {
  const [tab, setTab] = useState('Coupons');

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Operations & Management</h1>
      <Tabs active={tab} onChange={setTab} />
      
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {tab === 'Coupons' && <CouponsPanel />}
        {tab === 'Employees' && <EmployeesPanel />}
        {tab === 'Expenses' && <ExpensesPanel />}
      </div>
    </div>
  );
};

export default Operations;