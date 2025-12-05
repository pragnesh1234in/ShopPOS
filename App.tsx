
import React from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, BarChart3, Settings as SettingsIcon, Users, Percent, Wallet, Briefcase } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Operations from './pages/Operations';
import SettingsPage from './pages/Settings';

// Navigation Component
const Sidebar = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'POS', icon: ShoppingCart },
    { path: '/dashboard', label: 'Reports', icon: LayoutDashboard },
    { path: '/products', label: 'Inventory', icon: Package },
    { path: '/operations', label: 'Operations', icon: Briefcase },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="w-20 lg:w-64 bg-slate-900 text-white flex flex-col h-screen sticky top-0 no-print">
      <div className="p-4 lg:p-6 flex items-center justify-center lg:justify-start gap-3 border-b border-slate-700">
        <div className="bg-indigo-500 p-2 rounded-lg">
          <Wallet className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold hidden lg:block">NexusPOS</span>
      </div>
      
      <nav className="flex-1 py-6 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 lg:px-6 py-3 transition-colors ${
              isActive(item.path) 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <item.icon className="w-6 h-6 flex-shrink-0" />
            <span className="hidden lg:block font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-700 text-xs text-center text-slate-500 hidden lg:block">
        v1.0.0 | Offline Ready
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 bg-slate-100 overflow-x-hidden">
          <Routes>
            <Route path="/" element={<POS />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
