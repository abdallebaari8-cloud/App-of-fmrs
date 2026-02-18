
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter } from 'react-router-dom';
import { Language, UserRole, Product, Order, User, ViewType } from './types.ts';
import { translations } from './translations.ts';
import { getAIPitch, findProductsForNeeds } from './geminiService.ts';
import { 
  subscribeToProducts, 
  subscribeToOrders, 
  addProductToDB, 
  placeOrderInDB,
  onAuthChange,
  loginWithFirebase,
  registerWithFirebase,
  loginWithGoogle,
  logoutFromFirebase,
  updateUserProfilePhoto,
  auth
} from './firebaseService.ts';

const AuthScreen: React.FC<{ lang: Language, onCancel: () => void }> = ({ lang, onCancel }) => {
  const t = translations[lang];
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        const user = await registerWithFirebase(email, password, role);
        setVerificationEmail(user.email || email);
        setNeedsVerification(true);
      } else {
        const user = await loginWithFirebase(email, password);
        if (!user.emailVerified) {
          setVerificationEmail(user.email || email);
          setNeedsVerification(true);
          await logoutFromFirebase();
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Auth error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Google Sign-In failed");
    } finally {
      setLoading(false);
    }
  };

  if (needsVerification) {
    return (
      <div className="fixed inset-0 bg-white z-[60] flex items-center justify-center p-6 fade-in overflow-y-auto">
        <div className="max-w-md w-full text-center py-10">
          <div className="scale-in">
            <div className="text-7xl mb-6">📧</div>
            <h2 className="text-5xl font-black mb-6 tracking-tighter leading-none">{t.verifyEmailTitle}</h2>
            <p className="text-gray-500 mb-10 font-medium text-xl leading-relaxed">{t.verifyEmailSent.replace('[email]', verificationEmail)}</p>
            <button onClick={() => { setNeedsVerification(false); setIsRegister(false); }} className="w-full py-7 bg-green-600 text-white rounded-[2.5rem] font-black text-2xl shadow-xl hover:bg-green-700 transition-all active:scale-95 mt-4">{t.loginButton}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-[60] flex items-center justify-center p-6 fade-in overflow-y-auto">
      <div className="max-w-md w-full text-center py-10">
        <button onClick={onCancel} className="mb-8 text-green-600 font-bold flex items-center gap-2 hover:translate-x-[-4px] transition-transform mx-auto">
          ← {t.backToLogin}
        </button>
        
        <div className="scale-in">
          <div className="text-7xl mb-6">👋</div>
          <h2 className="text-5xl font-black mb-2 tracking-tighter leading-none">{isRegister ? t.registerTitle : t.loginTitle}</h2>
          <p className="text-gray-400 mb-10 font-medium text-lg leading-tight">{isRegister ? t.registerSubtitle : t.loginSubtitle}</p>

          <form onSubmit={handleSubmit} className="space-y-6 text-left">
            {isRegister && (
              <div className="mb-6">
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3 ml-4">{t.roleLabel}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setRole(UserRole.CUSTOMER)} className={`py-4 rounded-2xl font-bold transition-all border-2 ${role === UserRole.CUSTOMER ? 'bg-green-600 border-green-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>{t.customerLogin}</button>
                  <button type="button" onClick={() => setRole(UserRole.FARMER)} className={`py-4 rounded-2xl font-bold transition-all border-2 ${role === UserRole.FARMER ? 'bg-green-600 border-green-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>{t.farmerLogin}</button>
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">{t.emailLabel}</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-green-500 outline-none font-bold text-lg transition" placeholder="example@gmail.com" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">{t.passwordLabel}</label>
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-green-500 outline-none font-bold text-lg transition" placeholder="••••••••" />
            </div>

            {error && <p className="text-red-500 text-sm font-bold px-4">{error}</p>}

            {/* Google Sign-In Reordered: below email/pass, above main login button */}
            <button type="button" onClick={handleGoogleSignIn} disabled={loading} className="w-full py-5 bg-white border-4 border-gray-100 text-gray-600 rounded-[2.5rem] font-black text-lg shadow-sm hover:border-green-100 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t.continueWithGoogle}
            </button>

            {/* Main Action Button */}
            <button type="submit" disabled={loading} className="w-full py-7 bg-green-600 text-white rounded-[2.5rem] font-black text-2xl shadow-xl hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50">{loading ? "..." : (isRegister ? t.registerButton : t.loginButton)}</button>
          </form>

          <button onClick={() => setIsRegister(!isRegister)} className="mt-8 text-green-700 font-black text-sm hover:underline">{isRegister ? t.haveAccount : t.noAccount}</button>
        </div>
      </div>
    </div>
  );
};

const ProductCard: React.FC<{ product: Product, lang: Language, onBuy: (p: Product) => void }> = ({ product, lang, onBuy }) => {
  const t = translations[lang];
  const [pitch, setPitch] = useState<string>('');
  useEffect(() => { getAIPitch(product.name, product.location).then(setPitch); }, [product]);
  return (
    <div className="bg-white rounded-[2.5rem] overflow-hidden border border-green-50 group hover:shadow-2xl transition-all hover:-translate-y-1">
      <div className="h-64 overflow-hidden relative">
        <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full text-[10px] font-black uppercase text-green-700 tracking-widest shadow-sm">{product.location}</div>
      </div>
      <div className="p-8">
        <div className="flex justify-between items-start mb-4">
          <div><h3 className="text-2xl font-black text-gray-900">{lang === Language.SOMALI ? product.name : product.nameEn}</h3><p className="text-xs font-bold text-green-600 uppercase tracking-widest mt-1">{product.category}</p></div>
          <div className="text-right"><div className="text-3xl font-black text-green-600">${product.price}</div><div className="text-[10px] font-bold text-gray-400 uppercase">per {product.unit}</div></div>
        </div>
        <p className="text-gray-500 text-sm italic mb-6 leading-relaxed">"{pitch || '...'}"</p>
        <button onClick={() => onBuy(product)} className="w-full py-4 bg-green-50 text-green-700 rounded-2xl font-black text-sm hover:bg-green-600 hover:text-white transition-all">{t.buyNow}</button>
      </div>
    </div>
  );
};

const Marketplace: React.FC<{ lang: Language, products: Product[], onBuy: (p: Product) => void, hideHeader?: boolean, user: User | null, onGoToDashboard: () => void }> = ({ lang, products, onBuy, hideHeader = false, user, onGoToDashboard }) => {
  const t = translations[lang];
  const [query, setQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [filteredIds, setFilteredIds] = useState<string[] | null>(null);
  
  const handleAISearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) { setFilteredIds(null); return; }
    setAiLoading(true);
    const matches = await findProductsForNeeds(query, products);
    setFilteredIds(matches);
    setAiLoading(false);
  };

  const displayedProducts = filteredIds ? products.filter(p => filteredIds.includes(p.id)) : products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.nameEn.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto p-6 pb-32 fade-in">
      {!hideHeader && (<div className="mb-16 text-center pt-12"><h2 className="text-6xl font-black text-gray-900 tracking-tighter mb-4">{t.marketplace}</h2><p className="text-gray-400 font-bold text-lg">{t.tagline}</p></div>)}
      {user?.role === UserRole.FARMER && (
        <div className="mb-8 flex justify-center scale-in">
          <button onClick={onGoToDashboard} className="flex items-center gap-3 px-8 py-4 bg-green-600 text-white rounded-full font-black hover:bg-green-700 transition-all shadow-xl active:scale-95">
            <span className="text-2xl">🚜</span>
            {t.postHarvest}
          </button>
        </div>
      )}
      <div className="mb-12 bg-green-50/50 p-8 rounded-[3rem] border-2 border-green-100/50">
        <form onSubmit={handleAISearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative"><span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl">✨</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.aiPlaceholder} className="w-full pl-16 pr-6 py-5 bg-white border-2 border-green-100 rounded-3xl focus:border-green-500 outline-none font-bold text-lg transition shadow-sm" /></div>
          <button type="submit" disabled={aiLoading} className="px-10 py-5 bg-green-600 text-white rounded-3xl font-black text-lg hover:bg-green-700 transition shadow-lg disabled:opacity-50">{aiLoading ? t.aiThinking : t.aiFind}</button>
        </form>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{displayedProducts.map(p => (<ProductCard key={p.id} product={p} lang={lang} onBuy={onBuy} />))}</div>
    </div>
  );
};

const FarmerDashboard: React.FC<{ lang: Language, products: Product[], user: User | null, onAddProduct: (d: any) => void, onTriggerLogin: () => void }> = ({ lang, products, user, onAddProduct, onTriggerLogin }) => {
  const t = translations[lang];
  const [showAdd, setShowAdd] = useState(true); // Default to true for the 'dedicated interface' feel
  const [successMsg, setSuccessMsg] = useState(false);
  const [formData, setFormData] = useState({ farmerName: '', cropName: '', location: '', price: '', quantity: '', unit: 'kg', image: '' });
  const profileInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { 
    if (user && !formData.farmerName) {
      setFormData(prev => ({ 
        ...prev, 
        farmerName: user.name || '', 
        location: user.location || 'Mogadishu' 
      })); 
    }
  }, [user]);

  if (!user || user.role !== UserRole.FARMER) return (
    <div className="min-h-[70vh] flex items-center justify-center p-12 text-center fade-in">
      <div className="max-w-md">
        <div className="text-8xl mb-8 opacity-20">👩‍🌾</div>
        <h2 className="text-3xl font-black mb-4">{t.farmerOnly}</h2>
        <button onClick={onTriggerLogin} className="px-8 py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg hover:bg-green-700 transition">Login as Farmer</button>
      </div>
    </div>
  );

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => { await updateUserProfilePhoto(reader.result as string); window.location.reload(); };
      reader.readAsDataURL(file);
    }
  };

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const farmerProducts = products.filter(p => p.farmerId === user.id);
  
  const handleSubmit = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    const payload = {
      name: formData.cropName,
      nameEn: formData.cropName,
      farmerName: formData.farmerName,
      location: formData.location,
      price: parseFloat(formData.price) || 0,
      quantity: parseInt(formData.quantity) || 0,
      unit: formData.unit,
      image: formData.image
    };
    onAddProduct(payload); 
    setSuccessMsg(true);
    setFormData(prev => ({ ...prev, cropName: '', price: '', quantity: '', image: '' })); 
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 pt-12 pb-32 fade-in">
      {successMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-green-600 text-white px-8 py-4 rounded-full font-black shadow-2xl scale-in flex items-center gap-3">
          <span>✅</span> {lang === Language.SOMALI ? "Goosashada waa la soo geliyay!" : "Harvest Posted Successfully!"}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8 bg-green-50/50 p-8 md:p-12 rounded-[3.5rem] border-2 border-green-100/50">
        <div className="flex items-center gap-8">
          <div className="relative group cursor-pointer shrink-0" onClick={() => profileInputRef.current?.click()}>
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-8 border-white shadow-xl bg-white flex items-center justify-center transition-transform group-hover:scale-105">
              {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" alt="Profile" /> : <span className="text-5xl md:text-6xl">👨‍🌾</span>}
            </div>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex flex-col items-center justify-center text-white text-[10px] font-black uppercase text-center p-4">
              <span className="text-xl mb-1">📸</span> {t.uploadPhoto}
            </div>
            <input type="file" ref={profileInputRef} onChange={handleProfileImageChange} className="hidden" accept="image/*" />
          </div>
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter mb-2 leading-none">{user.name}</h2>
            <div className="flex items-center gap-3">
              <span className="px-4 py-1.5 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">{t.farmerLogin}</span>
              <span className="text-gray-400 font-bold">{user.location}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <div className="text-4xl font-black text-green-700">{farmerProducts.length}</div>
            <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Active Listings</div>
          </div>
        </div>
      </div>

      <div className="mb-16">
         <h3 className="text-4xl font-black text-gray-900 mb-8 tracking-tighter flex items-center gap-4">
           <span className="p-3 bg-green-100 rounded-2xl">🚜</span>
           {t.postHarvest}
         </h3>
         
         <form onSubmit={handleSubmit} className="bg-white p-8 md:p-12 rounded-[3rem] md:rounded-[4rem] border-4 border-green-50 shadow-2xl grid grid-cols-1 lg:grid-cols-2 gap-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-green-600"></div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase text-gray-400 mb-3 ml-2">{t.farmerNameLabel}</label>
              <input required placeholder="Your name or beerta magaceeda" value={formData.farmerName} onChange={e => setFormData({...formData, farmerName: e.target.value})} className="w-full p-6 bg-gray-50 rounded-3xl border-2 border-transparent focus:border-green-500 outline-none font-bold text-xl transition" />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-gray-400 mb-3 ml-2">{t.locationLabel}</label>
              <input required placeholder="Specific city or area" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-6 bg-gray-50 rounded-3xl border-2 border-transparent focus:border-green-500 outline-none font-bold text-xl transition" />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-gray-400 mb-3 ml-2">{t.cropNameLabel}</label>
              <input required placeholder="e.g. Watermelon, Onions, Bananas" value={formData.cropName} onChange={e => setFormData({...formData, cropName: e.target.value})} className="w-full p-6 bg-gray-50 rounded-3xl border-2 border-transparent focus:border-green-500 outline-none font-bold text-xl transition" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-black uppercase text-gray-400 mb-3 ml-2">Price ($)</label><input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full p-6 bg-gray-50 rounded-3xl border-2 border-transparent focus:border-green-500 outline-none font-bold text-xl transition" /></div>
              <div><label className="block text-xs font-black uppercase text-gray-400 mb-3 ml-2">Qty ({formData.unit})</label><input required type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full p-6 bg-gray-50 rounded-3xl border-2 border-transparent focus:border-green-500 outline-none font-bold text-xl transition" /></div>
            </div>
          </div>

          <div className="flex flex-col min-h-[300px]">
            <label className="block text-xs font-black uppercase text-gray-400 mb-3 ml-2">Harvest Photo (Required for quality check)</label>
            <div className={`relative flex-grow border-4 border-dashed rounded-[3rem] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden bg-gray-50/50 ${formData.image ? 'border-green-500' : 'border-gray-200 hover:border-green-300'}`} onClick={() => productInputRef.current?.click()}>
              {formData.image ? (
                <>
                  <img src={formData.image} className="w-full h-full object-cover" alt="Preview" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="bg-white text-green-600 px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest">Change Photo</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-8">
                  <span className="text-7xl mb-4 block">📸</span>
                  <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Snap or Upload Photo</span>
                </div>
              )}
            </div>
            <input type="file" ref={productInputRef} onChange={handleProductImageChange} className="hidden" accept="image/*" />
          </div>

          <button type="submit" className="md:col-span-2 py-8 bg-green-600 text-white rounded-[3rem] font-black text-3xl shadow-xl hover:bg-green-700 transition-all hover:scale-[1.01] active:scale-95 mt-4">
            Post Now
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {farmerProducts.length === 0 ? (
          <div className="md:col-span-3 py-32 text-center border-4 border-dashed border-gray-100 rounded-[4rem]">
            <div className="text-8xl mb-6 opacity-10">🏜️</div>
            <p className="text-gray-300 font-black text-2xl uppercase tracking-tighter">No active harvests posted.</p>
          </div>
        ) : (
          farmerProducts.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-[3rem] border border-green-50 shadow-sm hover:shadow-xl transition-all flex items-center gap-6 group">
              <div className="w-24 h-24 bg-green-50 rounded-[2rem] flex items-center justify-center text-4xl overflow-hidden shrink-0 border-2 border-green-100 shadow-inner group-hover:scale-110 transition-transform">
                {p.image ? <img src={p.image} className="w-full h-full object-cover" alt={p.name} /> : "🥬"}
              </div>
              <div className="flex-grow">
                <h3 className="text-2xl font-black text-gray-900 leading-tight">{p.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-sm font-black text-green-600">${p.price}</span>
                   <span className="text-gray-300">/</span>
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.quantity} {p.unit} remaining</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const CheckoutModal: React.FC<{ product: Product, lang: Language, onClose: () => void, onComplete: (d: any) => void }> = ({ product, lang, onClose, onComplete }) => {
  const t = translations[lang];
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<'evc' | 'cash'>('evc');
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6 fade-in">
      <div className="bg-white w-full max-w-lg rounded-[3.5rem] overflow-hidden shadow-2xl scale-in">
        <div className="bg-green-600 p-12 text-white">
          <button onClick={onClose} className="mb-8 text-white/60 hover:text-white transition font-black">← ESC</button>
          <h2 className="text-5xl font-black tracking-tighter mb-4">{t.checkout}</h2>
          <div className="flex justify-between items-center bg-white/10 p-4 rounded-2xl border border-white/20">
            <span className="font-bold">{lang === Language.SOMALI ? product.name : product.nameEn}</span>
            <span className="font-black text-2xl">${product.price}</span>
          </div>
        </div>
        <div className="p-12 space-y-8">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Phone Number</label>
            <input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 061XXXXXXX" className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-green-500 outline-none font-black text-2xl transition" />
          </div>
          <div className="space-y-4">
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400">Payment Method</label>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setMethod('evc')} className={`p-6 rounded-3xl border-4 font-black transition ${method === 'evc' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-400'}`}>
                <div className="text-2xl mb-1">📱</div> {t.paymentEVC}
              </button>
              <button onClick={() => setMethod('cash')} className={`p-6 rounded-3xl border-4 font-black transition ${method === 'cash' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-400'}`}>
                <div className="text-2xl mb-1">💵</div> {t.paymentCash}
              </button>
            </div>
          </div>
          <button onClick={() => onComplete({product, phone, method})} className="w-full py-6 bg-green-600 text-white rounded-[2rem] font-black text-2xl shadow-xl hover:bg-green-700 transition-all hover:scale-105 active:scale-95">
            {t.buyNow}
          </button>
        </div>
      </div>
    </div>
  );
};

const Navbar: React.FC<{ lang: Language, setLang: (l: Language) => void, user: User | null, onLogout: () => void, view: ViewType, setView: (v: ViewType) => void, onBack: () => void }> = ({ lang, setLang, user, onLogout, view, setView, onBack }) => {
  const t = translations[lang];
  const isLanding = view === 'landing';
  return (
    <nav className="bg-green-600 border-b border-green-700 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 md:gap-4">
          {!isLanding && (
            <button onClick={onBack} className="p-2 hover:bg-green-700 rounded-full transition-all group text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <button onClick={() => setView('landing')} className="text-2xl font-black flex items-center gap-2 hover:opacity-80 transition text-white">
            <span className="text-3xl">🌾</span>
            <span className="hidden md:inline">{t.appName}</span>
          </button>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div 
                className="flex items-center gap-2 px-3 py-1 bg-green-700/50 border border-green-500/30 rounded-full text-[11px] font-black uppercase tracking-wider text-green-50 cursor-pointer hover:bg-green-700/70 transition"
                onClick={() => setView('dashboard')}
              >
                {user.photoURL && <img src={user.photoURL} className="w-5 h-5 rounded-full object-cover" alt="" />}
                <span className="hidden lg:inline">{user.name}</span>
              </div>
              <button onClick={onLogout} className="p-2 hover:bg-red-500/20 rounded-full transition text-green-200 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ) : (
            <button onClick={() => setView('login')} className="px-6 py-2.5 rounded-full text-sm font-black transition-all bg-white text-green-600 hover:bg-green-50 shadow-md">{t.loginButton}</button>
          )}
          <div className="flex bg-green-700/50 rounded-full p-1 border border-green-500/30 shadow-inner">
            <button onClick={() => setLang(Language.SOMALI)} className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${lang === Language.SOMALI ? 'bg-white text-green-600 shadow-sm' : 'text-green-100 hover:text-white'}`}>SO</button>
            <button onClick={() => setLang(Language.ENGLISH)} className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${lang === Language.ENGLISH ? 'bg-white text-green-600 shadow-sm' : 'text-green-100 hover:text-white'}`}>EN</button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(Language.ENGLISH);
  const [user, setUser] = useState<any | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [view, setView] = useState<ViewType>('landing');
  const [appLoading, setAppLoading] = useState(true);
  const t = translations[lang];

  useEffect(() => { 
    const unsubscribeAuth = onAuthChange((fbUser) => {
      setUser(fbUser);
      setAppLoading(false);
      if (fbUser && view === 'login') {
        setView(fbUser.role === UserRole.FARMER ? 'dashboard' : 'landing');
      }
    });
    const unsubscribeProducts = subscribeToProducts((data) => setProducts(data)); 
    const unsubscribeOrders = subscribeToOrders((data) => setOrders(data)); 
    return () => { unsubscribeAuth(); unsubscribeProducts(); unsubscribeOrders(); }; 
  }, [view]);

  const handleLogout = async () => { await logoutFromFirebase(); setView('landing'); };
  
  const handleAddProduct = async (data: any) => { 
    if (!user) return; 
    const newP = { 
      name: data.name, 
      nameEn: data.name, 
      category: 'General', 
      price: data.price, 
      unit: data.unit || 'kg', 
      quantity: data.quantity, 
      farmerId: user.id, 
      farmerName: data.farmerName || user.name, 
      location: data.location, 
      image: data.image || `https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80`, 
      verified: false 
    }; 
    await addProductToDB(newP); 
  };

  const handleCompletePurchase = async (data: any) => { 
    const newOrder = { 
      productId: data.product.id, 
      productName: data.product.name, 
      quantity: 1, 
      totalPrice: data.product.price, 
      status: 'pending' as const, 
      customerPhone: data.phone, 
      paymentMethod: data.method as 'evc' | 'cash', 
      timestamp: Date.now(), 
      customerId: user?.id || 'guest' 
    }; 
    await placeOrderInDB(newOrder); 
    setSelectedProduct(null); 
    alert(lang === Language.SOMALI ? "Waad ku mahadsantahay dalabkaaga!" : "Order placed successfully!"); 
    setView('orders'); 
  };

  if (appLoading) return <div className="min-h-screen flex items-center justify-center font-black text-green-600">Loading...</div>;

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-white selection:bg-green-100">
        <Navbar lang={lang} setLang={setLang} user={user} onLogout={handleLogout} view={view} setView={setView} onBack={() => setView('landing')} />
        <main className="flex-grow">
          {view === 'login' && <AuthScreen lang={lang} onCancel={() => setView('landing')} />}
          {(view === 'landing' || view === 'market') && (
            <div className="fade-in">
              {!user && view === 'landing' && (
                <div className="flex flex-col items-center justify-center pt-16 pb-20 px-6 text-center bg-white border-b border-gray-50">
                  <div className="relative mb-16 scale-110 md:scale-125">
                    <div className="absolute -inset-16 bg-green-50 blur-[100px] rounded-full"></div>
                    <div className="relative p-12 bg-white rounded-full shadow-2xl border-[10px] border-white ring-2 ring-green-50">
                      <span className="text-8xl md:text-9xl">🚜</span>
                    </div>
                  </div>
                  <h1 className="text-5xl md:text-8xl font-black mb-6 text-gray-900 tracking-tighter leading-none">{t.appName}</h1>
                  <p className="text-green-800/40 mb-12 max-w-sm font-bold text-xl md:text-2xl leading-relaxed">{t.tagline}</p>
                  <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl px-4">
                    <button onClick={() => { const marketSection = document.getElementById('market-section'); marketSection?.scrollIntoView({ behavior: 'smooth' }); }} className="group relative flex-1 py-7 bg-green-600 text-white rounded-[3rem] font-black text-2xl shadow-2xl hover:bg-green-700 transition-all hover:-translate-y-2 active:scale-95">
                      <span className="relative flex items-center justify-center gap-4">{t.customerLogin} <span className="text-3xl">🧺</span></span>
                    </button>
                    <button onClick={() => setView('dashboard')} className="flex-1 py-7 bg-white text-green-700 border-4 border-green-100 rounded-[3rem] font-black text-2xl hover:bg-green-50 transition-all shadow-lg hover:-translate-y-1 flex items-center justify-center gap-4">
                      {t.farmerLogin} <span className="text-3xl">👨‍🌾</span>
                    </button>
                  </div>
                </div>
              )}
              <div id="market-section" className="bg-white">
                <Marketplace lang={lang} products={products} onBuy={p => { if (!user) setView('login'); else setSelectedProduct(p); }} hideHeader={view === 'landing' && !user} user={user} onGoToDashboard={() => setView('dashboard')} />
              </div>
            </div>
          )}
          {view === 'dashboard' && <FarmerDashboard lang={lang} products={products} user={user} onAddProduct={handleAddProduct} onTriggerLogin={() => setView('login')} />}
          {view === 'orders' && (
            <div className="p-6 max-w-3xl mx-auto fade-in pt-16 bg-white pb-32">
              <h2 className="text-5xl font-black text-gray-900 tracking-tighter mb-8">{t.myOrders}</h2>
              <div className="space-y-8">
                {orders.length === 0 ? (
                  <p className="text-center py-40 border-4 border-dashed border-green-50 rounded-[4rem] text-green-800/20 font-black text-2xl">No orders found.</p>
                ) : (
                  orders.map(o => (
                    <div key={o.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-green-50 flex items-center gap-8 group hover:shadow-xl transition-all">
                      <div className="w-20 h-20 bg-green-50 rounded-[2rem] flex items-center justify-center text-4xl group-hover:scale-110 transition">📦</div>
                      <div className="flex-grow flex justify-between">
                        <div><div className="font-black text-gray-900 text-2xl">{o.productName}</div></div>
                        <div className="text-right">
                          <div className="font-black text-green-600 text-3xl">${o.totalPrice}</div>
                          <div className="text-[10px] font-black px-6 py-2 rounded-full uppercase bg-yellow-50 text-yellow-600 mt-2">{o.status}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
        {selectedProduct && <CheckoutModal product={selectedProduct} lang={lang} onClose={() => setSelectedProduct(null)} onComplete={handleCompletePurchase} />}
      </div>
    </HashRouter>
  );
};
export default App;
