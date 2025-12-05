
import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { Settings as SettingsIcon, Save, Store, Zap, Plus, Trash2, Printer, Image as ImageIcon, Upload } from 'lucide-react';

const SettingsPage = () => {
  const currentSettings = useLiveQuery(() => db.settings.toArray());
  const bogoSchemes = useLiveQuery(() => db.bogoSchemes.toArray());

  const [formData, setFormData] = useState({
    storeName: '',
    address: '',
    currency: '₹',
    phone: '',
    gstNo: '',
    footerText: '',
    logo: '' // Base64 string
  });

  // State for new BOGO scheme form
  const [bogoForm, setBogoForm] = useState({
    name: '',
    buyQty: 1,
    getQty: 1
  });

  useEffect(() => {
    if (currentSettings && currentSettings.length > 0) {
      const s = currentSettings[0];
      setFormData({
        storeName: s.storeName || '',
        address: s.address || '',
        currency: s.currency || '₹',
        phone: s.phone || '',
        gstNo: s.gstNo || '',
        footerText: s.footerText || '',
        logo: s.logo || ''
      });
    }
  }, [currentSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logo: '' }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentSettings && currentSettings.length > 0) {
        await db.settings.update(currentSettings[0].id!, formData);
        alert('Settings saved successfully!');
      } else {
         await db.settings.add({
             ...formData,
             taxIncluded: false
         });
         alert('Settings saved successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save settings');
    }
  };

  const handleAddBogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bogoForm.name) return;
    try {
      await db.bogoSchemes.add({
        name: bogoForm.name,
        buyQty: Number(bogoForm.buyQty),
        getQty: Number(bogoForm.getQty)
      });
      setBogoForm({ name: '', buyQty: 1, getQty: 1 });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteBogo = (id: number) => {
    if (confirm("Are you sure you want to delete this scheme?")) {
      db.bogoSchemes.delete(id);
    }
  };

  if (!currentSettings) return null;

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="bg-slate-900 p-2 rounded-lg">
          <SettingsIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">System Settings</h1>
          <p className="text-slate-500">Configure global preferences, bill format, and discount schemes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Store & Bill Settings */}
        <div className="space-y-6">
          <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-2">
              <Store className="w-5 h-5 text-indigo-600" /> Store Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Store Name</label>
                <input 
                  name="storeName" 
                  value={formData.storeName} 
                  onChange={handleChange}
                  required 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Currency Symbol</label>
                    <input 
                      name="currency" 
                      value={formData.currency} 
                      onChange={handleChange}
                      required 
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
                    <input 
                      name="gstNo" 
                      value={formData.gstNo} 
                      onChange={handleChange}
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                 </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea 
                  name="address" 
                  value={formData.address} 
                  onChange={handleChange}
                  required 
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                />
              </div>
            </div>

            <h2 className="text-lg font-bold text-slate-800 mt-8 mb-6 flex items-center gap-2 border-b pb-2">
              <Printer className="w-5 h-5 text-indigo-600" /> Bill Format Settings
            </h2>
            <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Store Logo (Printed on Bill)</label>
                 <div className="flex items-start gap-4">
                    {formData.logo ? (
                      <div className="relative group">
                        <img src={formData.logo} alt="Logo" className="w-24 h-24 object-contain border border-slate-200 rounded-lg p-1" />
                        <button 
                          type="button" 
                          onClick={handleRemoveLogo}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="w-8 h-8 mb-1" />
                        <span className="text-[10px]">No Logo</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors">
                        <Upload className="w-4 h-4" /> Upload Logo
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                      <p className="text-xs text-slate-500 mt-2">Recommended: Square PNG/JPG, max 500KB.</p>
                    </div>
                 </div>
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bill Footer Text</label>
                  <input 
                    name="footerText" 
                    value={formData.footerText} 
                    onChange={handleChange}
                    placeholder="Thank you for visiting!"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
               </div>
            </div>

            <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold transition-all mt-8">
              <Save className="w-4 h-4" /> Save All Settings
            </button>
          </form>
        </div>

        {/* BOGO Settings */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> Add New BOGO Scheme
            </h2>
            <form onSubmit={handleAddBogo} className="space-y-4">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Scheme Name</label>
                 <input 
                   placeholder="e.g. Summer Buy 2 Get 1"
                   value={bogoForm.name}
                   onChange={e => setBogoForm({...bogoForm, name: e.target.value})}
                   required 
                   className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Buy Quantity</label>
                  <input 
                    type="number"
                    min="1"
                    value={bogoForm.buyQty} 
                    onChange={e => setBogoForm({...bogoForm, buyQty: parseInt(e.target.value)})}
                    required 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Get Free Quantity</label>
                  <input 
                    type="number"
                    min="1"
                    value={bogoForm.getQty} 
                    onChange={e => setBogoForm({...bogoForm, getQty: parseInt(e.target.value)})}
                    required 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
              </div>
              <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all">
                <Plus className="w-4 h-4" /> Add Scheme
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Active Schemes</h2>
            <div className="space-y-3">
              {bogoSchemes?.map(scheme => (
                <div key={scheme.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <div>
                    <h4 className="font-bold text-slate-700">{scheme.name}</h4>
                    <p className="text-xs text-slate-500">Buy <span className="font-bold">{scheme.buyQty}</span>, Get <span className="font-bold">{scheme.getQty}</span> Free</p>
                  </div>
                  <button onClick={() => deleteBogo(scheme.id!)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {bogoSchemes?.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-4">No schemes configured.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
