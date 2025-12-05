
import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { Sale, Expense } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, IndianRupee, ShoppingBag, CreditCard, LayoutDashboard, FileText, PieChart as PieIcon, Calendar, Download, TrendingDown, DollarSign
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- Components ---

const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
    <div>
      <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
    <div className={`p-3 rounded-full ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
  </div>
);

const DateRangeFilter = ({ range, onChange }: { range: { start: string, end: string }, onChange: (r: { start: string, end: string }) => void }) => (
  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
    <Calendar className="w-4 h-4 text-slate-400 ml-2" />
    <input 
      type="date" 
      value={range.start}
      onChange={(e) => onChange({ ...range, start: e.target.value })}
      className="text-sm text-slate-600 outline-none border-r border-slate-200 pr-2"
    />
    <span className="text-slate-400">-</span>
    <input 
      type="date" 
      value={range.end}
      onChange={(e) => onChange({ ...range, end: e.target.value })}
      className="text-sm text-slate-600 outline-none pl-2"
    />
  </div>
);

// --- Tabs ---

const OverviewTab = ({ sales, products }: { sales: Sale[], products: any[] }) => {
  const stats = useMemo(() => {
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    return {
      totalSales: totalSales.toFixed(2),
      totalOrders: sales.length,
      avgOrder: (sales.length ? totalSales / sales.length : 0).toFixed(2)
    };
  }, [sales]);

  const salesByDate = useMemo(() => {
    const map = new Map();
    sales.forEach(sale => {
      const date = sale.date.toLocaleDateString();
      map.set(date, (map.get(date) || 0) + sale.total);
    });
    return Array.from(map.entries()).map(([date, total]) => ({ date, total }));
  }, [sales]);

  const topProducts = useMemo(() => {
    const countMap = new Map();
    sales.forEach(sale => {
      sale.items.forEach(item => {
        countMap.set(item.name, (countMap.get(item.name) || 0) + item.quantity);
      });
    });
    return Array.from(countMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [sales]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value={`₹${stats.totalSales}`} icon={IndianRupee} color="bg-emerald-500" subtext="In selected period" />
        <StatCard title="Total Orders" value={stats.totalOrders} icon={ShoppingBag} color="bg-blue-500" subtext="In selected period" />
        <StatCard title="Avg. Order Value" value={`₹${stats.avgOrder}`} icon={CreditCard} color="bg-indigo-500" />
        <StatCard title="Total Products" value={products?.length || 0} icon={TrendingUp} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96">
          <h3 className="text-lg font-bold text-slate-700 mb-6">Sales Trend</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesByDate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill: "#6366f1"}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96">
          <h3 className="text-lg font-bold text-slate-700 mb-6">Top Selling Products</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={120} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: '#f1f5f9'}} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const SalesReportTab = ({ sales }: { sales: Sale[] }) => {
  const exportData = () => {
    const data = sales.map(s => ({
      ID: s.id,
      Date: s.date.toLocaleDateString(),
      Time: s.date.toLocaleTimeString(),
      Items: s.items.length,
      Payment: s.paymentMethod,
      Subtotal: s.subtotal,
      Tax: s.tax,
      Discount: s.discount,
      Total: s.total
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    XLSX.writeFile(wb, "Sales_Report.xlsx");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-500">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="font-bold text-slate-700">Transaction History</h3>
        <button onClick={exportData} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
          <Download className="w-4 h-4" /> Export Excel
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-white border-b border-slate-200 font-semibold text-slate-800">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Date</th>
              <th className="p-4">Items Summary</th>
              <th className="p-4">Payment</th>
              <th className="p-4 text-right">Subtotal</th>
              <th className="p-4 text-right">Disc.</th>
              <th className="p-4 text-right">Tax</th>
              <th className="p-4 text-right font-bold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-slate-400">No sales found in this period.</td></tr>
            ) : (
              sales.map(sale => (
                <tr key={sale.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono text-xs text-slate-400">#{sale.id}</td>
                  <td className="p-4">
                    <div className="font-medium text-slate-800">{sale.date.toLocaleDateString()}</div>
                    <div className="text-xs text-slate-400">{sale.date.toLocaleTimeString()}</div>
                  </td>
                  <td className="p-4 max-w-xs truncate" title={sale.items.map(i => i.name).join(', ')}>
                    {sale.items.length} items <span className="text-slate-400">({sale.items[0]?.name}...)</span>
                  </td>
                  <td className="p-4 capitalize">
                    <span className="px-2 py-1 rounded-full text-xs bg-slate-100 border border-slate-200">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="p-4 text-right text-slate-500">₹{sale.subtotal.toFixed(2)}</td>
                  <td className="p-4 text-right text-red-400">-₹{sale.discount.toFixed(2)}</td>
                  <td className="p-4 text-right text-slate-500">₹{sale.tax.toFixed(2)}</td>
                  <td className="p-4 text-right font-bold text-slate-800">₹{sale.total.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ProfitLossTab = ({ sales, expenses }: { sales: Sale[], expenses: Expense[] }) => {
  const financials = useMemo(() => {
    let revenue = 0; // Net Sales (Subtotal - Discount)
    let cogs = 0;
    
    sales.forEach(sale => {
      // Logic: Revenue is what we earned before tax (Tax is a liability). 
      // But for simplicity in this POS, let's treat Total as Revenue if tax included, or Subtotal if not.
      // Let's use (Subtotal - Discount) as effectively "Net Sales".
      // Note: If GST is collected, it shouldn't be profit.
      revenue += (sale.subtotal - sale.discount);

      sale.items.forEach(item => {
        cogs += (item.cost * item.quantity);
      });
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    return { revenue, cogs, grossProfit, totalExpenses, netProfit };
  }, [sales, expenses]);

  const expenseBreakdown = useMemo(() => {
    const map = new Map();
    expenses.forEach(e => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Net Sales" value={`₹${financials.revenue.toFixed(2)}`} icon={DollarSign} color="bg-blue-500" subtext="Excl. Tax" />
        <StatCard title="Cost of Goods" value={`₹${financials.cogs.toFixed(2)}`} icon={ShoppingBag} color="bg-orange-500" />
        <StatCard title="Expenses" value={`₹${financials.totalExpenses.toFixed(2)}`} icon={TrendingDown} color="bg-red-500" />
        <StatCard 
          title="Net Profit" 
          value={`₹${financials.netProfit.toFixed(2)}`} 
          icon={financials.netProfit >= 0 ? TrendingUp : TrendingDown} 
          color={financials.netProfit >= 0 ? "bg-emerald-500" : "bg-red-600"} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-700 mb-6">Financial Breakdown</h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
               <span className="font-medium text-slate-600">Net Sales</span>
               <span className="font-bold text-slate-800">₹{financials.revenue.toFixed(2)}</span>
             </div>
             <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
               <span className="font-medium text-slate-600">(-) COGS (Product Cost)</span>
               <span className="font-bold text-orange-600">₹{financials.cogs.toFixed(2)}</span>
             </div>
             <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
               <span className="font-medium text-slate-700">(=) Gross Profit</span>
               <span className="font-bold text-blue-700">₹{financials.grossProfit.toFixed(2)}</span>
             </div>
             <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
               <span className="font-medium text-slate-600">(-) Operating Expenses</span>
               <span className="font-bold text-red-600">₹{financials.totalExpenses.toFixed(2)}</span>
             </div>
             <div className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${financials.netProfit >= 0 ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
               <span className="font-bold text-slate-800 text-lg">(=) Net Profit</span>
               <span className={`font-bold text-xl ${financials.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                 ₹{financials.netProfit.toFixed(2)}
               </span>
             </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-700 mb-2">Expense Distribution</h3>
          <div className="h-64">
            {expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${Number(value).toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-slate-400 text-sm">No expenses recorded</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Page ---

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'pnl'>('overview');
  
  // Date Range State (Default: This Month)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Fetch Data
  const allSales = useLiveQuery(() => db.sales.toArray());
  const allExpenses = useLiveQuery(() => db.expenses.toArray());
  const allProducts = useLiveQuery(() => db.products.toArray());

  // Filter Data based on Date Range
  const filteredSales = useMemo(() => {
    if (!allSales) return [];
    const start = new Date(dateRange.start);
    start.setHours(0,0,0,0);
    const end = new Date(dateRange.end);
    end.setHours(23,59,59,999);
    
    return allSales.filter(s => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });
  }, [allSales, dateRange]);

  const filteredExpenses = useMemo(() => {
    if (!allExpenses) return [];
    const start = new Date(dateRange.start);
    start.setHours(0,0,0,0);
    const end = new Date(dateRange.end);
    end.setHours(23,59,59,999);
    
    return allExpenses.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });
  }, [allExpenses, dateRange]);

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1">Track business performance, sales, and financial health</p>
        </div>
        
        <DateRangeFilter range={dateRange} onChange={setDateRange} />
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200 p-1 rounded-xl inline-flex">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'sales', label: 'Sales Report', icon: FileText },
          { id: 'pnl', label: 'Profit & Loss', icon: PieIcon },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {activeTab === 'overview' && (
          // For overview, we might want to show all-time data or filtered data? 
          // Usually overview implies "Dashboard" state. But filters are useful.
          // Let's pass the filtered data to respond to the date picker, 
          // or allSales if we want strictly "Dashboard" behavior. 
          // The prompt asked for "Reports", so filtered is better.
          <OverviewTab sales={filteredSales} products={allProducts || []} />
        )}
        {activeTab === 'sales' && (
          <SalesReportTab sales={filteredSales} />
        )}
        {activeTab === 'pnl' && (
          <ProfitLossTab sales={filteredSales} expenses={filteredExpenses} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
