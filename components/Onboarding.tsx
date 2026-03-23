'use client';

import React, { useState } from 'react';
import { useProfile, Profile } from './ProfileProvider';
import { useLanguage } from './LanguageProvider';
import { motion } from 'motion/react';
import { ChevronRight, ChevronLeft, CheckCircle2, X } from 'lucide-react';
import { hapticLight, hapticMedium, hapticSuccess } from '../lib/haptics';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const NEPAL_DISTRICTS = [
  "Achham", "Arghakhanchi", "Baglung", "Baitadi", "Bajhang", "Bajura", "Banke", "Bara", "Bardiya", "Bhaktapur",
  "Bhojpur", "Chitwan", "Dadeldhura", "Dailekh", "Dang", "Darchula", "Dhading", "Dhankuta", "Dhanusa", "Dolakha",
  "Dolpa", "Doti", "Gorkha", "Gulmi", "Humla", "Ilam", "Jajarkot", "Jhapa", "Jumla", "Kailali", "Kalikot",
  "Kanchanpur", "Kapilvastu", "Kaski", "Kathmandu", "Kavrepalanchok", "Khotang", "Lalitpur", "Lamjung", "Mahottari",
  "Makwanpur", "Manang", "Mustang", "Mugu", "Myagdi", "Nawalpur", "Nuwakot", "Okhaldhunga", "Palpa", "Panchthar",
  "Parbat", "Parsa", "Pyuthan", "Ramechhap", "Rasuwa", "Rautahat", "Rolpa", "Rukum East", "Rukum West", "Rupandehi",
  "Salyan", "Sankhuwasabha", "Saptari", "Sarlahi", "Sindhuli", "Sindhupalchok", "Siraha", "Solukhumbu", "Sunsari",
  "Surkhet", "Syangja", "Tanahu", "Taplejung", "Terhathum", "Udayapur"
];

export default function Onboarding({ isEditing, onCancel }: { isEditing?: boolean; onCancel?: () => void }) {
  const { profile, setProfile, isAuthenticated, isLoggingIn, loginWithGoogle } = useProfile();
  const { language, setLanguage, t } = useLanguage();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const steps = [
    { id: 'basic', title: t('onboarding.basic.title') },
    { id: 'health', title: t('onboarding.health.title') },
    { id: 'diet', title: t('onboarding.diet.title') },
    { id: 'socioeconomic', title: t('onboarding.socio.title') },
  ];

  const [currentStep, setCurrentStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [formData, setFormData] = useState<Partial<Profile>>(profile || {
    substanceAbuse: [],
    dietFrequency: '',
    dietType: '',
    cookingUtensil: '',
    sex: '',
    pregnancyStatus: '',
    income: '',
  });

  const handleLogin = async () => {
    if (executeRecaptcha && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      try {
        const token = await executeRecaptcha('login');
        console.log('reCAPTCHA token for login:', token);
      } catch (e) {
        console.error('reCAPTCHA execution failed', e);
      }
    }
    await loginWithGoogle();
  };

  const handleCancelClick = () => {
    const isDirty = JSON.stringify(formData) !== JSON.stringify(profile || {
      substanceAbuse: [],
      dietFrequency: '',
      dietType: '',
      cookingUtensil: '',
      sex: '',
      pregnancyStatus: '',
      income: '',
    });
    
    if (isDirty) {
      setShowCancelConfirm(true);
    } else if (onCancel) {
      onCancel();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const moveX = (clientX - window.innerWidth / 2) / 50;
    const moveY = (clientY - window.innerHeight / 2) / 50;
    setMousePos({ x: moveX, y: moveY });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    if (name === 'substanceAbuse') {
      setFormData((prev) => {
        const current = prev.substanceAbuse || [];
        if (checked) {
          return { ...prev, substanceAbuse: [...current, value] };
        } else {
          return { ...prev, substanceAbuse: current.filter((item) => item !== value) };
        }
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (currentStep === 0) {
      if (!formData.name) newErrors.name = t('onboarding.error.name');
      if (!formData.age || Number(formData.age) <= 0 || Number(formData.age) > 150) newErrors.age = t('onboarding.error.age');
      if (!formData.weight || Number(formData.weight) <= 0 || Number(formData.weight) > 500) newErrors.weight = t('onboarding.error.weight');
      if (!formData.location || !NEPAL_DISTRICTS.includes(formData.location)) newErrors.location = t('onboarding.error.location');
      if (!formData.sex) newErrors.sex = t('onboarding.error.sex');
    }
    if (currentStep === 1) {
      if (!formData.symptoms) newErrors.symptoms = t('onboarding.error.symptoms');
    }
    if (currentStep === 2) {
      if (!formData.dietType) newErrors.dietType = t('onboarding.error.dietType');
      if (!formData.dietFrequency) newErrors.dietFrequency = t('onboarding.error.dietFrequency');
      if (!formData.cookingUtensil) newErrors.cookingUtensil = t('onboarding.error.cookingUtensil');
    }
    if (currentStep === 3) {
      if (!formData.budget || Number(formData.budget) < 0) newErrors.budget = t('onboarding.error.budget');
      if (!formData.income) newErrors.income = t('onboarding.error.income');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getFieldClass = (fieldName: string, value: any) => {
    const baseClass = "w-full px-5 py-4 bg-[#FDFBF7] dark:bg-[#221F1D] border text-[#4A362D] dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-[#9C3D36]/20 focus:border-[#9C3D36] outline-none transition-all duration-200 text-base font-medium font-sans placeholder:text-[#A1887F]";
    if (errors[fieldName]) {
      return `${baseClass} border-red-500/50 bg-red-50/50 dark:bg-red-900/10`;
    }
    if (value) {
      return `${baseClass} border-[#9C3D36]/30 bg-[#9C3D36]/5 dark:bg-[#9C3D36]/10`;
    }
    return `${baseClass} border-[#EFEBE1] dark:border-stone-800 hover:border-[#D7CCC8] dark:hover:border-stone-700`;
  };

  const canProceed = () => {
    if (currentStep === 0) {
      return !!(formData.name && formData.age && formData.weight && formData.location && formData.sex);
    }
    if (currentStep === 1) {
      return !!formData.symptoms;
    }
    if (currentStep === 2) {
      return !!(formData.dietType && formData.dietFrequency && formData.cookingUtensil);
    }
    if (currentStep === 3) {
      return !!(formData.budget && formData.income);
    }
    return true;
  };

  const handleNext = async () => {
    if (!validate()) return;

    hapticLight();
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      if (executeRecaptcha && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
        try {
          const token = await executeRecaptcha('onboarding_complete');
          console.log('reCAPTCHA token:', token);
          // In a real app, you would send this token to your backend for verification
        } catch (e) {
          console.error('reCAPTCHA execution failed', e);
        }
      }
      
      hapticSuccess();
      setProfile(formData as Profile);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (isEditing && onCancel) onCancel();
      }, 2000);
    }
  };

  const handleBack = () => {
    hapticLight();
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="min-h-screen bg-[#FDF8F5] dark:bg-[#12100E] flex flex-col items-center justify-center p-4 sm:p-8 transition-colors relative overflow-x-hidden font-sans"
    >
      {/* Minimal Modern Background Accents */}
      <motion.div 
        animate={{ x: mousePos.x * 0.5, y: mousePos.y * 0.5 }}
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-rose-400/20 dark:bg-rose-900/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-screen animate-pulse" 
      />
      <motion.div 
        animate={{ x: -mousePos.x * 0.5, y: -mousePos.y * 0.5 }}
        className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-amber-400/20 dark:bg-amber-900/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }} 
      />

      {/* Floating Decorative Elements - Minimalist & Interactive */}
      <motion.div 
        animate={{ 
          x: [mousePos.x * 2 - 5, mousePos.x * 2 + 5, mousePos.x * 2 - 5],
          y: [mousePos.y * 2 - 10, mousePos.y * 2 + 10, mousePos.y * 2 - 10],
          rotate: mousePos.x * 0.5 
        }}
        transition={{ 
          x: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 5, repeat: Infinity, ease: "easeInOut" }
        }}
        className="absolute top-20 left-[15%] w-12 h-12 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 backdrop-blur-sm hidden lg:block hover:bg-emerald-500/20 transition-colors duration-500 cursor-default"
      />
      <motion.div 
        animate={{ 
          x: [-mousePos.x * 1.5 - 8, -mousePos.x * 1.5 + 8, -mousePos.x * 1.5 - 8],
          y: [-mousePos.y * 1.5 - 12, -mousePos.y * 1.5 + 12, -mousePos.y * 1.5 - 12],
          rotate: -mousePos.y * 0.5 
        }}
        transition={{ 
          x: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 7, repeat: Infinity, ease: "easeInOut" }
        }}
        className="absolute bottom-40 right-[15%] w-16 h-16 bg-rose-500/5 rounded-full border border-rose-500/10 backdrop-blur-sm hidden lg:block hover:bg-rose-500/20 transition-colors duration-500 cursor-default"
      />
      <motion.div 
        animate={{ 
          x: mousePos.x * 3, 
          y: -mousePos.y * 2,
          scale: [1, 1.05, 1]
        }}
        transition={{ scale: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute top-[40%] right-[5%] w-8 h-8 bg-amber-500/5 rounded-lg border border-amber-500/10 backdrop-blur-sm hidden lg:block hover:bg-amber-500/20 transition-colors duration-500 cursor-default"
      />

      <div className="w-full max-w-3xl bg-white/90 dark:bg-[#1A1816]/90 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] overflow-hidden relative border border-[#EFEBE1]/60 dark:border-stone-800/60 z-10 backdrop-blur-xl">
        <div className="p-6 md:p-12">
          {/* Top Bar (Language & Close) */}
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl border border-stone-200 dark:border-stone-700">
              <button 
                onClick={() => setLanguage('en')}
                lang="en"
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${language === 'en' ? 'bg-white dark:bg-stone-700 text-emerald-600 shadow-sm' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
              >
                EN
              </button>
              <button 
                onClick={() => setLanguage('ne')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${language === 'ne' ? 'bg-white dark:bg-stone-700 text-emerald-600 shadow-sm' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
              >
                नेपाली
              </button>
            </div>
            
            {isEditing && (
              <button onClick={handleCancelClick} className="text-[#A1887F] hover:text-[#5D4037] dark:hover:text-stone-300 transition-colors p-2 bg-stone-100 dark:bg-stone-800 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8 md:mb-12 relative">
            <div className="w-56 h-56 md:w-72 md:h-72 mb-0 md:mb-2 relative flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Poshan Saathi Logo" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <div className="-mt-8 md:-mt-12 relative z-10">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#4A362D] dark:text-stone-50 uppercase font-display">
                {isEditing ? t('onboarding.edit') : t('app.name')}
              </h1>
              <p className="text-[#8D6E63] dark:text-[#A1887F] mt-3 md:mt-4 text-base sm:text-lg md:text-xl font-medium">
                {isEditing ? t('onboarding.update') : t('app.tagline')}
              </p>
            </div>
          </div>

          {!isAuthenticated && !isEditing && (
            <div className="flex flex-col items-center pb-8">
              <button 
                onClick={handleLogin}
                disabled={isLoggingIn}
                className={`w-full sm:w-auto min-w-[280px] max-w-xs flex items-center justify-center gap-4 bg-[#FFFCF8] dark:bg-[#221F1D] text-[#5D4037] dark:text-stone-200 px-8 py-4 rounded-full border border-[#EFEBE1] dark:border-stone-700 transition-all shadow-md font-bold text-base ${isLoggingIn ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#FDF8F5] dark:hover:bg-stone-800 hover:shadow-lg'}`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {isLoggingIn ? 'Connecting...' : t('onboarding.google')}
              </button>
            </div>
          )}

          {isAuthenticated && !isEditing && (
            <div className="flex justify-center mb-6 md:mb-8">
              <div className="text-[#9C3D36] dark:text-[#D95D54] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 bg-[#9C3D36]/10 px-4 py-1.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('onboarding.authenticated')}
              </div>
            </div>
          )}

          {showSuccess && (
            <div className="absolute inset-0 bg-white/95 dark:bg-[#1A1816]/95 z-50 flex flex-col items-center justify-center text-center p-8 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-[#9C3D36]/10 text-[#9C3D36] dark:text-[#D95D54] rounded-full flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="w-10 h-10" />
              </motion.div>
              <h2 className="text-2xl font-black text-[#4A362D] dark:text-stone-50 mb-2 font-display uppercase">{t('onboarding.success.title')}</h2>
              <p className="text-[#8D6E63] dark:text-[#A1887F] text-sm font-medium">{t('onboarding.success.desc')}</p>
            </div>
          )}

          <div className="mt-4">
            {/* Minimalist Progress Bar */}
            <div className="mb-10">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#9C3D36] dark:text-[#D95D54]">
                    {t('onboarding.step')} {currentStep + 1} {t('onboarding.of')} {steps.length}
                  </span>
                  <span className="text-[10px] font-bold text-[#A1887F] uppercase tracking-widest">
                    {steps[currentStep].title}
                  </span>
                </div>
                <div className="flex gap-2 h-1.5">
                  {steps.map((s, i) => (
                    <div 
                      key={s.id} 
                      className={`flex-1 rounded-full transition-colors duration-500 ${
                        i <= currentStep ? 'bg-[#9C3D36] dark:bg-[#B84A41]' : 'bg-[#EFEBE1] dark:bg-stone-800'
                      }`} 
                    />
                  ))}
                </div>
              </div>

              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {currentStep === 0 && (
                  <div className="space-y-6">
                    <div className="mb-8">
                      <h2 className="text-3xl md:text-4xl font-black text-[#4A362D] dark:text-stone-50 mb-2">{t('onboarding.basic.title')}</h2>
                      <p className="text-[#8D6E63] dark:text-[#A1887F] text-base md:text-lg">{t('onboarding.basic.desc')}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <motion.div whileHover={{ y: -2, x: 1 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                        <label className="block text-sm font-extrabold text-[#5D4037] dark:text-stone-200 mb-2 uppercase tracking-widest">{t('onboarding.name.label')}</label>
                        <input type="text" name="name" value={formData.name || ''} onChange={handleInputChange} className={getFieldClass('name', formData.name)} placeholder={t('onboarding.name.placeholder')} />
                        {errors.name && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wide">{errors.name}</p>}
                      </motion.div>
                      <motion.div whileHover={{ y: -2, x: -1 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                        <label className="block text-sm font-extrabold text-[#5D4037] dark:text-stone-200 mb-2 uppercase tracking-widest">{t('onboarding.age.label')}</label>
                        <input type="number" name="age" min="1" step="1" value={formData.age || ''} onChange={handleInputChange} className={getFieldClass('age', formData.age)} placeholder={t('onboarding.age.placeholder')} />
                        {errors.age && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wide">{errors.age}</p>}
                      </motion.div>
                      <motion.div whileHover={{ y: -2, x: 1 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                        <label className="block text-sm font-extrabold text-[#5D4037] dark:text-stone-200 mb-2 uppercase tracking-widest">{t('onboarding.sex.label')}</label>
                        <select name="sex" value={formData.sex || ''} onChange={handleInputChange} className={getFieldClass('sex', formData.sex)}>
                          <option value="" disabled>{t('onboarding.sex.select')}</option>
                          <option value="Male">{t('onboarding.sex.male')}</option>
                          <option value="Female">{t('onboarding.sex.female')}</option>
                          <option value="Other">{t('onboarding.sex.other')}</option>
                        </select>
                        {errors.sex && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wide">{errors.sex}</p>}
                      </motion.div>
                      <motion.div whileHover={{ y: -2, x: -1 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                        <label className="block text-sm font-extrabold text-[#5D4037] dark:text-stone-200 mb-2 uppercase tracking-widest">{t('onboarding.weight.label')}</label>
                        <input type="number" name="weight" min="1" step="0.1" value={formData.weight || ''} onChange={handleInputChange} className={getFieldClass('weight', formData.weight)} placeholder={t('onboarding.weight.placeholder')} />
                        {errors.weight && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wide">{errors.weight}</p>}
                      </motion.div>
                      <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className="md:col-span-2">
                        <label className="block text-sm font-extrabold text-[#5D4037] dark:text-stone-200 mb-2 uppercase tracking-widest">{t('onboarding.location.label')}</label>
                        <select name="location" value={formData.location || ''} onChange={handleInputChange} className={getFieldClass('location', formData.location)}>
                          <option value="">{t('onboarding.location.select')}</option>
                          {NEPAL_DISTRICTS.map(district => (
                            <option key={district} value={district}>{district}</option>
                          ))}
                        </select>
                        {errors.location && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wide">{errors.location}</p>}
                      </motion.div>
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="mb-8">
                      <h2 className="text-3xl md:text-4xl font-black text-[#4A362D] dark:text-stone-50 mb-2">{t('onboarding.health.title')}</h2>
                      <p className="text-[#8D6E63] dark:text-[#A1887F] text-base md:text-lg">{t('onboarding.health.desc')}</p>
                    </div>
                    
                    {formData.sex === 'Female' && (
                      <motion.div whileHover={{ y: -2, x: 1 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                        <label className="block text-sm font-extrabold text-[#5D4037] dark:text-stone-200 mb-2 uppercase tracking-widest">{t('onboarding.pregnancy.label')}</label>
                        <select name="pregnancyStatus" value={formData.pregnancyStatus || ''} onChange={handleInputChange} className={getFieldClass('pregnancyStatus', formData.pregnancyStatus)}>
                          <option value="" disabled>{t('onboarding.pregnancy.select')}</option>
                          <option value="N/A">{t('onboarding.pregnancy.na')}</option>
                          <option value="Pregnant">{t('onboarding.pregnancy.pregnant')}</option>
                          <option value="Breastfeeding">{t('onboarding.pregnancy.breastfeeding')}</option>
                        </select>
                      </motion.div>
                    )}

                    <motion.div whileHover={{ y: -2, x: -1 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                      <label className="block text-sm font-extrabold text-[#5D4037] dark:text-stone-200 mb-2 uppercase tracking-widest">{t('onboarding.disease.label')}</label>
                      <textarea name="diseaseHistory" value={formData.diseaseHistory || ''} onChange={handleInputChange} rows={2} className={getFieldClass('diseaseHistory', formData.diseaseHistory)} placeholder={t('onboarding.disease.placeholder')}></textarea>
                    </motion.div>

                    <motion.div whileHover={{ y: -2, x: 1 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                      <label className="block text-sm font-extrabold text-[#5D4037] dark:text-stone-200 mb-3 uppercase tracking-widest">{t('onboarding.substance.label')}</label>
                      <div className="flex flex-wrap gap-6">
                        {[
                          { key: 'Alcohol', label: t('onboarding.substance.alcohol') },
                          { key: 'Smoking', label: t('onboarding.substance.smoking') },
                          { key: 'Tobacco', label: t('onboarding.substance.tobacco') }
                        ].map(item => (
                          <label key={item.key} className="flex items-center gap-3 cursor-pointer text-[#5D4037] dark:text-stone-300 group">
                            <input type="checkbox" name="substanceAbuse" value={item.key} checked={formData.substanceAbuse?.includes(item.key)} onChange={handleCheckboxChange} className="w-5 h-5 accent-[#9C3D36] bg-[#FDFBF7] dark:bg-[#221F1D] border-[#EFEBE1] dark:border-stone-700 rounded cursor-pointer transition-all" />
                            <span className="text-base font-medium group-hover:text-[#9C3D36] transition-colors">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div whileHover={{ y: -2, x: -1 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                      <label className="block text-sm font-extrabold text-[#5D4037] dark:text-stone-200 mb-2 uppercase tracking-widest">{t('onboarding.symptoms.label')}</label>
                      <textarea name="symptoms" value={formData.symptoms || ''} onChange={handleInputChange} rows={3} className={getFieldClass('symptoms', formData.symptoms)} placeholder={t('onboarding.symptoms.placeholder')}></textarea>
                      {errors.symptoms && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wide">{errors.symptoms}</p>}
                      <p className="text-xs font-medium text-[#A1887F] mt-2">{t('onboarding.symptoms.desc')}</p>
                    </motion.div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="mb-8">
                      <h2 className="text-3xl md:text-4xl font-black text-[#4A362D] dark:text-stone-50 mb-2">{t('onboarding.diet.title')}</h2>
                      <p className="text-[#8D6E63] dark:text-[#A1887F] text-base md:text-lg">{t('onboarding.diet.desc')}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <motion.div whileHover={{ y: -2, x: 1 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                        <label className="block text-sm font-extrabold text-[#5D4037] dark:text-stone-200 mb-2 uppercase tracking-widest">{t('onboarding.dietType.label')}</label>
                        <select name="dietType" value={formData.dietType || ''} onChange={handleInputChange} className={getFieldClass('dietType', formData.dietType)}>
                          <option value="" disabled>{t('onboarding.dietType.select')}</option>
                          <option value="Vegetarian">{t('onboarding.dietType.veg')}</option>
                          <option value="Non-Vegetarian">{t('onboarding.dietType.nonveg')}</option>
                          <option value="Vegan">{t('onboarding.dietType.vegan')}</option>
                        </select>
                        {errors.dietType && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wide">{errors.dietType}</p>}
                      </motion.div>
                      
                      <motion.div whileHover={{ y: -2, x: -1 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                        <label className="block text-sm font-extrabold text-[#5D4037] dark:text-stone-200 mb-2 uppercase tracking-widest">{t('onboarding.frequency.label')}</label>
                        <select name="dietFrequency" value={formData.dietFrequency || ''} onChange={handleInputChange} className={getFieldClass('dietFrequency', formData.dietFrequency)}>
                          <option value="" disabled>{t('onboarding.frequency.select')}</option>
                          <option value="Daily">{t('onboarding.frequency.daily')}</option>
                          <option value="Few times a week">{t('onboarding.frequency.few')}</option>
                          <option value="Once a week">{t('onboarding.frequency.once')}</option>
                          <option value="Rarely">{t('onboarding.frequency.rarely')}</option>
                          <option value="Never">{t('onboarding.frequency.never')}</option>
                        </select>
                        {errors.dietFrequency && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wide">{errors.dietFrequency}</p>}
                      </motion.div>

                      <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className="md:col-span-2">
                        <label className="block text-sm font-extrabold text-[#5D4037] dark:text-stone-200 mb-2 uppercase tracking-widest">{t('onboarding.utensil.label')}</label>
                        <select name="cookingUtensil" value={formData.cookingUtensil || ''} onChange={handleInputChange} className={getFieldClass('cookingUtensil', formData.cookingUtensil)}>
                          <option value="" disabled>{t('onboarding.utensil.select')}</option>
                          <option value="Aluminum">{t('onboarding.utensil.aluminum')}</option>
                          <option value="Iron">{t('onboarding.utensil.iron')}</option>
                          <option value="Clay Pot">{t('onboarding.utensil.clay')}</option>
                          <option value="Stainless Steel">{t('onboarding.utensil.steel')}</option>
                          <option value="Non-stick">{t('onboarding.utensil.nonstick')}</option>
                        </select>
                        {errors.cookingUtensil && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wide">{errors.cookingUtensil}</p>}
                        <p className="text-xs font-medium text-[#A1887F] mt-2">{t('onboarding.utensil.desc')}</p>
                      </motion.div>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="mb-8">
                      <h2 className="text-3xl md:text-4xl font-black text-[#4A362D] dark:text-stone-50 mb-2">{t('onboarding.socio.title')}</h2>
                      <p className="text-[#8D6E63] dark:text-[#A1887F] text-base md:text-lg">{t('onboarding.socio.desc')}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                      <motion.div whileHover={{ y: -2, x: 1 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                        <label className="block text-sm font-extrabold text-[#5D4037] dark:text-stone-200 mb-2 uppercase tracking-widest">{t('onboarding.budget.label')}</label>
                        <input type="number" name="budget" min="0" step="100" value={formData.budget || ''} onChange={handleInputChange} className={getFieldClass('budget', formData.budget)} placeholder={t('onboarding.budget.placeholder')} />
                        {errors.budget && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wide">{errors.budget}</p>}
                      </motion.div>

                      <motion.div whileHover={{ y: -2, x: -1 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                        <label className="block text-sm font-extrabold text-[#5D4037] dark:text-stone-200 mb-2 uppercase tracking-widest">{t('onboarding.income.label')}</label>
                        <select name="income" value={formData.income || ''} onChange={handleInputChange} className={getFieldClass('income', formData.income)}>
                          <option value="" disabled>{t('onboarding.income.select')}</option>
                          <option value="Low">{t('onboarding.income.low')}</option>
                          <option value="Middle">{t('onboarding.income.middle')}</option>
                          <option value="High">{t('onboarding.income.high')}</option>
                        </select>
                        {errors.income && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wide">{errors.income}</p>}
                      </motion.div>
                    </div>
                  </div>
                )}
              </motion.div>

              <div className="mt-8 md:mt-10 flex justify-between items-center pt-6 border-t border-[#EFEBE1] dark:border-stone-800/50">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className={`flex items-center text-[11px] font-bold uppercase tracking-widest transition-all ${currentStep === 0 ? 'text-[#D7CCC8] dark:text-stone-700 cursor-not-allowed opacity-0' : 'text-[#8D6E63] hover:text-[#4A362D] dark:hover:text-stone-100 hover:-translate-x-1'}`}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> {t('onboarding.back')}
                </button>
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className={`flex items-center px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] sm:text-[11px] transition-all ${!canProceed() ? 'bg-[#EFEBE1] dark:bg-[#221F1D] text-[#A1887F] dark:text-stone-600 cursor-not-allowed' : 'bg-[#9C3D36] hover:bg-[#8A352F] text-white shadow-md shadow-[#9C3D36]/20 hover:-translate-y-0.5'}`}
                >
                  {currentStep === steps.length - 1 ? (isEditing ? t('onboarding.save') : t('onboarding.complete')) : t('onboarding.next')} <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      
      {/* UID Display Outside Card */}
      {profile?.uid && (
        <div className="fixed bottom-4 left-4 z-20 pointer-events-none">
          <span className="text-stone-400/60 dark:text-stone-600/60 text-[11px] font-mono font-bold uppercase tracking-widest">
            UID: {profile.uid.substring(0, 8)}
          </span>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-stone-200 dark:border-stone-800 animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-[#4A362D] dark:text-stone-100 font-display uppercase mb-2">Discard Changes?</h3>
            <p className="text-[#8D6E63] dark:text-[#A1887F] text-sm mb-6 font-medium">
              You have unsaved changes. Are you sure you want to discard them?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-3 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
              >
                Keep Editing
              </button>
              <button
                onClick={() => {
                  setShowCancelConfirm(false);
                  if (onCancel) onCancel();
                }}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md shadow-red-500/20 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
