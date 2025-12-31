import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { Language, UserRole, Product, Order, User, ViewType } from './types.ts';
import { translations } from './translations.ts';
import { getAIPitch, findProductsForNeeds } from './geminiService.ts';
import { subscribeToProducts, subscribeToOrders, addProductToDB, placeOrderInDB, registerUserLocal, loginUserLocal, updatePasswordLocal } from './firebaseService.ts';

// External declaration for EmailJS (loaded in index.html)
declare var emailjs: any;

type AuthMode = 'login' | 'register' | 'forgot';
type ForgotStep = 'email' | 'code' | 'reset' | 'success';

// Component for Authentication
const AuthScreen: React.FC<{ lang: Language, onLogin: (u: User) => void, onCancel: () => void }> = ({ lang, onLogin, onCancel }) => {
  const t = translations[lang];
  const [mode, setMode] = useState<AuthMode>('login');
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');
  const [role, setRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [generatedCode, setGeneratedCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [useManualMethod, setUseManualMethod] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: 'Somalia',
    city: '',
    verificationCode: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  
  const [error, setError] = useState<string | null>(null);

  const handleSendRealEmail = async (email: string, code: string) => {
    setIsSending(true);
    setError(null);
    try {
      const serviceId = "YOUR_SERVICE_ID";
      const templateId = "YOUR_TEMPLATE_ID";

      // Safety check for global emailjs object
      if (typeof emailjs === 'undefined' || serviceId === "YOUR_SERVICE_ID" || templateId === "YOUR_TEMPLATE_ID") {
        throw new Error("Placeholder configuration or script missing");
      }

      await emailjs.send(serviceId, templateId, {
        to_email: email,
        otp_code: code,
        app_name: t.appName
      });
      setForgotStep('code');
      setUseManualMethod(false);
    } catch (err) {
      console.info("Auth: Switching to manual email fallback.");
      setUseManualMethod(true);
      setForgotStep('code');
    } finally {
      setIsSending(false);
    }
  };

  const handleMailtoFallback = () => {
    const subject = encodeURIComponent(`${t.appName}: ${t.verifyCodeTitle} - ${generatedCode}`);
    const body = encodeURIComponent(`Ka: ${t.appName}\n\nKoodhkaaga xaqiijinta waa: ${generatedCode}\n\nFadlan isticmaal koodhkan si aad u beddesho furahaaga sirta ah.`);
    window.location.href = `mailto:${formData.email}?subject=${subject}&body=${body}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (!formData.password || formData.password !== formData.confirmPassword) {
        setError(t.passwordMismatch);
        return;
      }
      const newUser: User & { password?: string } = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        email: formData.email,
        role: role,
        location: `${formData.city}, ${formData.country}`,
        password: formData.password
      };
      await registerUserLocal(newUser);
      const { password, ...safeUser } = newUser;
      onLogin(safeUser);
    } else if (mode === 'login') {
      const user = await loginUserLocal(formData.email, formData.password);
      if (user) {
        onLogin(user);
      } else {
        setError(t.authError);
      }
    } else if (mode === 'forgot') {
      if (forgotStep === 'email') {
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        setGeneratedCode(code);
        await handleSendRealEmail(formData.email, code);
      } else if (forgotStep === 'code') {
        if (formData.verificationCode === generatedCode) {
          setForgotStep('reset');
        } else {
          setError(t.invalidCode);
        }
      } else if (forgotStep === 'reset') {
        if (formData.newPassword !== formData.confirmNewPassword) {
          setError(t.passwordMismatch);
          return;
        }
        const success = await updatePasswordLocal(formData.email, formData.newPassword);
        if (success) {
          setForgotStep('success');
        } else {
          setError(t.authError);
        }
      }
    }
  };

  const updateForm = (field: string, val: string) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const getTitle = () => {
    if (mode === 'register') return t.registerTitle;
    if (mode === 'forgot') {
      if (forgotStep === 'code') return t.verifyCodeTitle;
      if (forgotStep === 'reset') return t.changePasswordTitle;
      if (forgotStep === 'success') return t.passwordChanged;
      return t.resetTitle;
    }
    return t.loginTitle;
  };

  return (
    <div className="fixed inset-0 bg-white z-[60] flex items-center justify-center p-6 fade-in overflow-y-auto">
      <div className="max-w-md w-full py-12">
        <button onClick={onCancel} className="mb-8 text-green-600 font-bold flex items-center gap-2 hover:translate-x-[-4px] transition-transform">← {t.backToLogin}</button>
        
        {forgotStep === 'success' && mode === 'forgot' ? (
          <div className="text-center py-12 px-6 bg-green-50 rounded-[3rem] border-2 border-green-100 scale-in shadow-sm">
            <div className="text-7xl mb-6">✅</div>
            <h2 className="text-3xl font-black text-green-900 mb-4 tracking-tighter">{t.passwordChanged}</h2>
            <button onClick={() => { setMode('login'); setForgotStep('email'); }} className="mt-6 text-green-600 font-black underline">{t.backToLogin}</button>
          </div>
        ) : (
          <div className="scale-in">
            <h2 className="text-5xl font-black mb-3 tracking-tighter leading-none">{getTitle()}</h2>
            <p className="text-gray-400 mb-8 font-medium text-lg leading-tight">
              {mode === 'forgot' && forgotStep === 'code' ? t.verifyCodeSubtitle : mode === 'forgot' && forgotStep === 'reset' ? t.changePasswordSubtitle : mode === 'register' ? t.registerSubtitle : t.loginSubtitle}
            </p>

            {error && <div className="mb-6 p-5 bg-red-50 text-red-600 rounded-2xl font-black border border-red-100 shake flex items-center gap-3"><span>⚠️</span> {error}</div>}

            {mode !== 'forgot' && (
              <div className="flex gap-4 mb-8 bg-gray-100 p-1 rounded-2xl">
                <button type="button" onClick={() => setRole(UserRole.CUSTOMER)} className={`flex-1 py-3.5 rounded-xl font-black transition-all ${role === UserRole.CUSTOMER ? 'bg-white shadow-md text-green-600' : 'text-gray-400 hover:text-gray-600'}`}>{t.customerLogin}</button>
                <button type="button" onClick={() => setRole(UserRole.FARMER)} className={`flex-1 py-3.5 rounded-xl font-black transition-all ${role === UserRole.FARMER ? 'bg-white shadow-md text-green-600' : 'text-gray-400 hover:text-gray-600'}`}>{t.farmerLogin}</button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 px-1">{t.nameLabel}</label>
                    <input id="reg-name" name="name" required value={formData.name} onChange={e => updateForm('name', e.target.value)} type="text" autoComplete="name" className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-green-500 outline-none transition font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 px-1">{t.countryLabel}</label>
                      <input id="reg-country" name="country" readOnly value={formData.country} className="w-full p-5 bg-gray-100 border-2 border-gray-100 rounded-3xl text-gray-500 cursor-not-allowed outline-none font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 px-1">{t.cityLabel}</label>
                      <input id="reg-city" name="city" required value={formData.city} onChange={e => updateForm('city', e.target.value)} type="text" autoComplete="address-level2" className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-green-500 outline-none transition font-bold" />
                    </div>
                  </div>
                </>
              )}

              {(mode !== 'forgot' || forgotStep === 'email') && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 px-1">{t.emailLabel}</label>
                  <input id="auth-email" name="email" required value={formData.email} onChange={e => updateForm('email', e.target.value)} type="email" autoComplete="email" placeholder="example@gmail.com" className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-green-500 outline-none transition font-bold text-lg" />
                </div>
              )}

              {mode === 'forgot' && forgotStep === 'code' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 px-1">{t.verificationCodeLabel}</label>
                    <input id="otp-code" name="verificationCode" required value={formData.verificationCode} onChange={e => updateForm('verificationCode', e.target.value)} type="text" maxLength={4} placeholder="0000" className="w-full p-6 bg-gray-50 border-4 border-gray-100 rounded-[2rem] focus:border-green-500 outline-none transition text-center text-4xl font-black tracking-[1.5rem] shadow-inner" />
                  </div>
                  
                  {useManualMethod && (
                    <div className="p-6 bg-yellow-50 border-2 border-yellow-100 rounded-[2rem] space-y-4">
                      <p className="text-sm font-bold text-yellow-800 leading-tight">{t.emailInstruction}</p>
                      <button type="button" onClick={handleMailtoFallback} className="w-full py-4 bg-white border-2 border-yellow-500 text-yellow-700 rounded-2xl font-black text-sm hover:bg-yellow-600 hover:text-white transition-all flex items-center justify-center gap-2">
                        <span>📧</span> {t.sendViaApp}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {mode === 'forgot' && forgotStep === 'reset' && (
                <>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 px-1">{t.newPasswordLabel}</label>
                    <input id="forgot-new-pass" name="newPassword" required value={formData.newPassword} onChange={e => updateForm('newPassword', e.target.value)} type="password" autoComplete="new-password" placeholder="••••••••" className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-green-500 outline-none transition font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 px-1">{t.confirmNewPasswordLabel}</label>
                    <input id="forgot-confirm-pass" name="confirmNewPassword" required value={formData.confirmNewPassword} onChange={e => updateForm('confirmNewPassword', e.target.value)} type="password" autoComplete="new-password" placeholder="••••••••" className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-green-500 outline-none transition font-bold" />
                  </div>
                </>
              )}

              {mode !== 'forgot' && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 px-1">{t.passwordLabel}</label>
                  <input 
                    id="auth-password" 
                    name="password" 
                    required 
                    value={formData.password} 
                    onChange={e => updateForm('password', e.target.value)} 
                    type="password" 
                    autoComplete={mode === 'register' ? "new-password" : "current-password"} 
                    placeholder="••••••••" 
                    className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-green-500 outline-none transition font-bold" 
                  />
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 px-1">{t.confirmPasswordLabel}</label>
                  <input 
                    id="reg-confirm-password" 
                    name="confirmPassword" 
                    required 
                    value={formData.confirmPassword} 
                    onChange={e => updateForm('confirmPassword', e.target.value)} 
                    type="password" 
                    autoComplete="new-password" 
                    placeholder="••••••••" 
                    className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-green-500 outline-none transition font-bold" 
                  />
                </div>
              )}

              {mode === 'login' && (
                <div className="text-right">
                  <button type="button" onClick={() => { setMode('forgot'); setForgotStep('email'); setError(null); }} className="text-xs font-black text-green-600 hover:underline uppercase tracking-widest">
                    {t.forgotPassword}
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSending}
                className={`w-full py-6 bg-green-600 text-white rounded-[2.5rem] font-black text-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${isSending ? 'opacity-70 cursor-wait' : 'hover:bg-green-700 hover:-translate-y-1'}`}
              >
                {isSending ? (
                  <>
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-lg">{t.sendingEmail}</span>
                  </>
                ) : (
                  mode === 'register' 
                    ? t.registerButton 
                    : mode === 'forgot' 
                      ? (forgotStep === 'email' ? t.sendResetLink : forgotStep === 'code' ? t.verifyButton : t.savePasswordButton) 
                      : t.loginButton
                )}
              </button>
            </form>

            <div className="mt-12 text-center">
              {mode === 'login' ? (
                <button type="button" onClick={() => { setMode('register'); setError(null); }} className="text-green-600 font-black hover:underline text-lg">
                  {t.noAccount}
                </button>
              ) : (
                <button type="button" onClick={() => { setMode('login'); setForgotStep('email'); setError(null); setUseManualMethod(false); }} className="text-green-600 font-black hover:underline text-lg">
                  {t.haveAccount}
                </button>
              )}
            </div>
          </div>
        )}
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

const Marketplace: React.FC<{ lang: Language, products: Product[], onBuy: (p: Product) => void }> = ({ lang, products, onBuy }) => {
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

  const displayedProducts = filteredIds 
    ? products.filter(p => filteredIds.includes(p.id)) 
    : products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.nameEn.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto p-6 pt-12 pb-32 fade-in">
      <div className="mb-16 text-center">
        <h2 className="text-6xl font-black text-gray-900 tracking-tighter mb-4">{t.marketplace}</h2>
        <p className="text-gray-400 font-bold text-lg">{t.tagline}</p>
      </div>
      <div className="mb-12 bg-green-50/50 p-8 rounded-[3rem] border-2 border-green-100/50">
        <form onSubmit={handleAISearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative"><span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl">✨</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.aiPlaceholder} className="w-full pl-16 pr-6 py-5 bg-white border-2 border-green-100 rounded-3xl focus:border-green-500 outline-none font-bold text-lg transition shadow-sm" /></div>
          <button type="submit" disabled={aiLoading} className="px-10 py-5 bg-green-600 text-white rounded-3xl font-black text-lg hover:bg-green-700 transition shadow-lg disabled:opacity-50">{aiLoading ? t.aiThinking : t.aiFind}</button>
        </form>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayedProducts.map(p => (<ProductCard key={p.id} product={p} lang={lang} onBuy={onBuy} />))}
      </div>
    </div>
  );
};

const FarmerDashboard: React.FC<{ lang: Language, products: Product[], user: User | null, onAddProduct: (d: any) => void, onTriggerLogin: () => void }> = ({ lang, products, user, onAddProduct, onTriggerLogin }) => {
  const t = translations[lang];
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '', quantity: '', unit: 'kg', location: '' });

  useEffect(() => {
    if (user && !formData.location) {
      setFormData(prev => ({ ...prev, location: user.location || 'Mogadishu' }));
    }
  }, [user]);

  if (!user || user.role !== UserRole.FARMER) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-12 text-center fade-in">
        <div className="max-w-md">
          <div className="text-8xl mb-8 opacity-20">👩‍🌾</div>
          <h2 className="text-3xl font-black mb-4">{t.farmerOnly}</h2>
          <button onClick={onTriggerLogin} className="px-8 py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg hover:bg-green-700 transition">Login as Farmer</button>
        </div>
      </div>
    );
  }

  const farmerProducts = products.filter(p => p.farmerId === user.id);
  const handleSubmit = (e: React.FormEvent) => { 
    e.preventDefault(); 
    onAddProduct(formData); 
    setShowAdd(false); 
    setFormData({ name: '', price: '', quantity: '', unit: 'kg', location: user.location || 'Mogadishu' }); 
  };

  return (
    <div className="max-w-6xl mx-auto p-6 pt-12 pb-32 fade-in">
      <div className="flex justify-between items-end mb-16">
        <div><h2 className="text-6xl font-black text-gray-900 tracking-tighter mb-4">{t.myDashboard}</h2><p className="text-gray-400 font-bold text-lg">Manage your farm crops and inventory.</p></div>
        <button onClick={() => setShowAdd(!showAdd)} className="px-8 py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg hover:bg-green-700 transition flex items-center gap-2">{showAdd ? 'Cancel' : `+ ${t.addProduct}`}</button>
      </div>
      {showAdd && (
        <form onSubmit={handleSubmit} className="mb-16 bg-white p-10 rounded-[3rem] border-4 border-green-50 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6 scale-in">
          <div className="md:col-span-2"><label className="block text-xs font-black uppercase text-gray-400 mb-2">Crop Name</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-green-500 outline-none font-bold" /></div>
          <div><label className="block text-xs font-black uppercase text-gray-400 mb-2">{t.price} ($)</label><input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-green-500 outline-none font-bold" /></div>
          <div><label className="block text-xs font-black uppercase text-gray-400 mb-2">{t.quantity}</label><input required type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-green-500 outline-none font-bold" /></div>
          <button type="submit" className="md:col-span-2 py-5 bg-green-600 text-white rounded-2xl font-black text-xl shadow-lg hover:bg-green-700 transition">Save Crop</button>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {farmerProducts.length === 0 ? (<div className="md:col-span-3 py-20 text-center border-4 border-dashed border-gray-100 rounded-[3rem]"><p className="text-gray-300 font-black text-2xl">No crops added yet.</p></div>) : farmerProducts.map(p => (
          <div key={p.id} className="bg-white p-8 rounded-[2.5rem] border border-green-50 shadow-sm flex items-center gap-6"><div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center text-4xl">🥬</div><div><h3 className="text-xl font-black text-gray-900">{p.name}</h3><p className="text-sm font-bold text-green-600 mt-1">{p.quantity} {p.unit} remaining</p><div className="text-xs font-black text-gray-300 uppercase mt-2">${p.price} / {p.unit}</div></div></div>
        ))}
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
        <div className="bg-green-600 p-12 text-white"><button onClick={onClose} className="mb-8 text-white/60 hover:text-white transition font-black">← ESC</button><h2 className="text-5xl font-black tracking-tighter mb-4">{t.checkout}</h2><div className="flex justify-between items-center bg-white/10 p-4 rounded-2xl border border-white/20"><span className="font-bold">{lang === Language.SOMALI ? product.name : product.nameEn}</span><span className="font-black text-2xl">${product.price}</span></div></div>
        <div className="p-12 space-y-8">
          <div><label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Phone Number</label><input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 061XXXXXXX" className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-green-500 outline-none font-black text-2xl transition" /></div>
          <div className="space-y-4"><label className="block text-xs font-black uppercase tracking-widest text-gray-400">Payment Method</label><div className="grid grid-cols-2 gap-4"><button onClick={() => setMethod('evc')} className={`p-6 rounded-3xl border-4 font-black transition ${method === 'evc' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-400'}`}><div className="text-2xl mb-1">📱</div> {t.paymentEVC}</button><button onClick={() => setMethod('cash')} className={`p-6 rounded-3xl border-4 font-black transition ${method === 'cash' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-400'}`}><div className="text-2xl mb-1">💵</div> {t.paymentCash}</button></div></div>
          <button onClick={() => onComplete({product, phone, method})} className="w-full py-6 bg-green-600 text-white rounded-[2rem] font-black text-2xl shadow-xl hover:bg-green-700 transition-all hover:scale-105 active:scale-95">{t.buyNow}</button>
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
          {!isLanding && (<button onClick={onBack} className="p-2 hover:bg-green-700 rounded-full transition-all group text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>)}
          <button onClick={() => setView(user ? 'market' : 'landing')} className="text-2xl font-black flex items-center gap-2 hover:opacity-80 transition text-white"><span className="text-3xl">🌾</span><span className="hidden md:inline">{t.appName}</span></button>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3"><div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-green-700/50 border border-green-500/30 rounded-full text-[11px] font-black uppercase tracking-wider text-green-50"><span>{user.name}</span></div><button onClick={onLogout} className="p-2 hover:bg-red-500/20 rounded-full transition text-green-200 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg></button></div>
          ) : (<button onClick={() => setView('login')} className="px-6 py-2.5 rounded-full text-sm font-black transition-all bg-white text-green-600 hover:bg-green-50 shadow-md">{t.loginButton}</button>)}
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
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [view, setView] = useState<ViewType>('landing');
  const t = translations[lang];

  useEffect(() => { 
    const unsubscribeProducts = subscribeToProducts((data) => setProducts(data)); 
    const unsubscribeOrders = subscribeToOrders((data) => setOrders(data)); 
    return () => { unsubscribeProducts(); unsubscribeOrders(); }; 
  }, []);

  const handleLogin = (newUser: User) => { setUser(newUser); setView(newUser.role === UserRole.FARMER ? 'dashboard' : 'market'); };
  const handleLogout = () => { setUser(null); setView('landing'); };
  
  const handleAddProduct = async (data: any) => { 
    if (!user) return; 
    const newP = { 
      name: data.name, 
      nameEn: data.name, 
      category: 'General', 
      price: parseFloat(data.price), 
      unit: data.unit, 
      quantity: parseInt(data.quantity), 
      farmerId: user.id, 
      farmerName: user.name, 
      location: data.location, 
      image: `https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80`, 
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

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-white selection:bg-green-100">
        <Navbar lang={lang} setLang={setLang} user={user} onLogout={handleLogout} view={view} setView={setView} onBack={() => setView('landing')} />
        <main className="flex-grow">
          {view === 'login' && <AuthScreen lang={lang} onLogin={handleLogin} onCancel={() => setView('landing')} />}
          {(view === 'landing' && !user) && (
            <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 text-center fade-in bg-white">
              <div className="relative mb-20 scale-125"><div className="absolute -inset-16 bg-green-50 blur-[100px] rounded-full"></div><div className="relative p-14 bg-white rounded-full shadow-2xl border-[10px] border-white ring-2 ring-green-50"><span className="text-9xl">🚜</span></div></div>
              <h1 className="text-6xl md:text-8xl font-black mb-8 text-gray-900 tracking-tighter">{t.appName}</h1>
              <p className="text-green-800/40 mb-16 max-w-sm font-bold text-2xl leading-relaxed">{t.tagline}</p>
              <div className="flex flex-col gap-8 w-full max-w-sm">
                <button onClick={() => setView('market')} className="group relative w-full py-7 bg-green-600 text-white rounded-[3rem] font-black text-2xl shadow-2xl hover:bg-green-700 transition-all hover:-translate-y-2 active:scale-95"><span className="relative flex items-center justify-center gap-5">{t.customerLogin}</span></button>
                <button onClick={() => setView('dashboard')} className="w-full py-7 bg-white text-green-700 border-4 border-green-100 rounded-[3rem] font-black text-2xl hover:bg-green-50 transition-all shadow-lg">I'm a Farmer</button>
              </div>
            </div>
          )}
          {view === 'market' && <Marketplace lang={lang} products={products} onBuy={p => { if(!user) setView('login'); else setSelectedProduct(p); }} />}
          {view === 'dashboard' && <FarmerDashboard lang={lang} products={products} user={user} onAddProduct={handleAddProduct} onTriggerLogin={() => setView('login')} />}
          {view === 'orders' && (
            <div className="p-6 max-w-3xl mx-auto fade-in pt-16 bg-white pb-32">
              <h2 className="text-5xl font-black text-gray-900 tracking-tighter mb-8">{t.myOrders}</h2>
              <div className="space-y-8">
                {orders.length === 0 ? <p className="text-center py-40 border-4 border-dashed border-green-50 rounded-[4rem] text-green-800/20 font-black text-2xl">No orders found.</p> : orders.map(o => (
                  <div key={o.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-green-50 flex items-center gap-8 group hover:shadow-xl transition-all"><div className="w-20 h-20 bg-green-50 rounded-[2rem] flex items-center justify-center text-4xl group-hover:scale-110 transition">📦</div><div className="flex-grow flex justify-between"><div><div className="font-black text-gray-900 text-2xl">{o.productName}</div></div><div className="text-right"><div className="font-black text-green-600 text-3xl">${o.totalPrice}</div><div className="text-[10px] font-black px-6 py-2 rounded-full uppercase bg-yellow-50 text-yellow-600 mt-2">{o.status}</div></div></div></div>
                ))}
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