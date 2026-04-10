'use client';

import React, { useState } from 'react';
import { useProfile } from './ProfileProvider';
import { modules } from '../lib/modules';
import { motion } from 'motion/react';
import { LogOut, User, Moon, Sun, Edit, MessageSquare } from 'lucide-react';
import dynamic from 'next/dynamic';
import ModuleView from './ModuleView';
import { useTheme } from './ThemeProvider';
import { useLanguage } from './LanguageProvider';
import Onboarding from './Onboarding';
import Image from 'next/image';
import { hapticLight, hapticMedium } from '../lib/haptics';

import ChatCompanion from './ChatCompanion';

export default function Dashboard() {
  const { profile, logout } = useProfile();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [activeView, setActiveView] = useState<'home' | 'module' | 'chat'>('home');
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const heightInMeters = Number(profile?.height) / 100;
  const weightInKg = Number(profile?.weight);
  const bmi = heightInMeters > 0 ? (weightInKg / (heightInMeters * heightInMeters)).toFixed(1) : null;
  
  let bmiCategory = '';
  let bmiColor = '';
  let bmiBg = '';
  if (bmi) {
    const bmiNum = Number(bmi);
    if (bmiNum < 18.5) {
      bmiCategory = 'Underweight';
      bmiColor = 'text-blue-600 dark:text-blue-400';
      bmiBg = 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    } else if (bmiNum >= 18.5 && bmiNum < 24.9) {
      bmiCategory = 'Normal weight';
      bmiColor = 'text-emerald-600 dark:text-emerald-400';
      bmiBg = 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
    } else if (bmiNum >= 25 && bmiNum < 29.9) {
      bmiCategory = 'Overweight';
      bmiColor = 'text-amber-600 dark:text-amber-400';
      bmiBg = 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
    } else {
      bmiCategory = 'Obese';
      bmiColor = 'text-rose-600 dark:text-rose-400';
      bmiBg = 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800';
    }
  }

  React.useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isEditing) {
        setIsEditing(false);
      } else if (activeView === 'chat') {
        setActiveView('home');
      } else if (activeModule) {
        setActiveModule(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isEditing, activeView, activeModule]);

  const openModule = (moduleId: string) => {
    window.history.pushState({ view: 'module', id: moduleId }, '');
    setActiveModule(moduleId);
  };

  const openEdit = () => {
    window.history.pushState({ view: 'edit' }, '');
    setIsEditing(true);
  };

  const openChat = () => {
    window.history.pushState({ view: 'chat' }, '');
    setActiveView('chat');
  };

  const closeView = () => {
    if (window.history.state) {
      window.history.back();
    } else {
      setIsEditing(false);
      setActiveView('home');
      setActiveModule(null);
    }
  };

  if (isEditing) {
    return <Onboarding isEditing onCancel={closeView} />;
  }

  if (activeView === 'chat') {
    return <ChatCompanion onBack={closeView} />;
  }

  if (activeModule) {
    return <ModuleView moduleId={activeModule} onBack={closeView} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 transition-colors relative overflow-x-hidden">
      {/* Blurred Background Accents - Refined for Light Mode */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-emerald-500/10 dark:bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-amber-500/10 dark:bg-amber-900/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[40%] right-[-5%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] bg-rose-500/10 dark:bg-rose-900/10 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDelay: '4s' }} />

      {/* Header - More elegant in light mode */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-white/70 dark:bg-stone-900/80 backdrop-blur-2xl border-b border-stone-200/60 dark:border-stone-800 sticky top-0 z-20 transition-colors shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div 
              className="w-14 h-14 sm:w-16 sm:h-16 relative flex items-center justify-center shrink-0"
            >
              <Image 
                src="/logo.png" 
                alt="Poshan Saathi Logo" 
                fill
                priority
                sizes="(max-width: 640px) 56px, 64px"
                className="object-contain drop-shadow-xl scale-125" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0 py-1">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 font-display uppercase leading-tight">{t('app.name')}</h1>
              <p className={`text-[8px] sm:text-[9px] font-bold mt-0.5 text-emerald-700 dark:text-emerald-400 ${language === 'en' ? 'uppercase tracking-[0.2em]' : ''}`}>{t('app.tagline')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-4 shrink-0">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { hapticLight(); openChat(); }}
              className="text-stone-600 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all p-2.5 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              title={t('nav.chat')}
            >
              <MessageSquare className="w-6 h-6" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.3 }}
              onClick={() => { hapticLight(); toggleTheme(); }}
              className="text-stone-600 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all p-2.5 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              title={t('nav.theme')}
            >
              {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </motion.button>
            <div className="hidden md:flex flex-col items-end justify-center">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 text-xs text-stone-800 dark:text-stone-200 bg-stone-200/50 dark:bg-stone-800 px-4 py-2 rounded-full transition-all border border-stone-200 dark:border-stone-700 font-black uppercase tracking-widest shadow-inner"
              >
                <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                <span>{profile?.name}</span>
              </motion.div>
            </div>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { hapticLight(); openEdit(); }}
              className="text-stone-600 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all p-2.5 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              title={t('nav.edit')}
            >
              <Edit className="w-6 h-6" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { hapticMedium(); logout(); }}
              className="text-stone-600 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all p-2.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 focus:outline-none focus:ring-2 focus:ring-rose-500/10"
              title={t('nav.logout')}
            >
              <LogOut className="w-6 h-6" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-12 sm:mb-24 text-center flex flex-col items-center"
        >
          {bmi && (
            <div className={`mb-6 px-5 py-2 rounded-full border backdrop-blur-sm shadow-sm flex items-center gap-3 ${bmiBg}`}>
              <span className="text-sm font-semibold text-stone-500 dark:text-stone-400">BMI</span>
              <span className={`text-base font-black ${bmiColor}`}>{bmi}</span>
              <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor" className={bmiColor} xmlns="http://www.w3.org/2000/svg">
                <circle cx="3" cy="3" r="3" />
              </svg>
              <span className={`text-sm font-bold uppercase tracking-wider ${bmiColor}`}>{bmiCategory}</span>
            </div>
          )}
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 mb-3 sm:mb-6 uppercase leading-snug sm:leading-tight py-2">
            {t('hero.namaste')}, <span className="text-emerald-600 dark:text-emerald-500 mx-1 sm:mx-2">{profile?.name?.split(' ')[0] || 'FRIEND'}</span>!
          </h2>
          <p className="text-stone-500 dark:text-stone-400 text-lg sm:text-2xl md:text-3xl font-medium opacity-60">
            {t('hero.subtitle')} <span className="text-emerald-500 font-bold">{t('hero.companion')}</span> {t('hero.ready')}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 sm:mb-12"
        >
          <div className="bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm p-1.5 rounded-2xl border border-stone-200/60 dark:border-stone-800 shadow-sm flex items-center gap-2">
            <button 
              onClick={() => { hapticLight(); setLanguage('en'); }}
              lang="en"
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all ${language === 'en' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none' : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'}`}
            >
              English
            </button>
            <button 
              onClick={() => { hapticLight(); setLanguage('ne'); }}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs font-black transition-all ${language === 'ne' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none' : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'}`}
            >
              नेपाली
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -8 }}
                transition={{ duration: 0.5, delay: index * 0.05, ease: "circOut" }}
                onClick={() => { hapticMedium(); openModule(module.id); }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
                  e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
                }}
                className={`bg-white/90 dark:bg-stone-900/40 rounded-[2.5rem] p-10 border-2 ${module.borderColor} shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none hover:shadow-2xl ${module.glowColor} transition-colors duration-500 cursor-pointer group flex flex-col h-full relative overflow-hidden corner-pattern min-h-[400px]`}
              >
                {/* Subtle background glow on hover */}
                <div className={`absolute -inset-20 bg-gradient-to-br from-transparent via-transparent to-stone-100/50 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className={`w-14 h-14 rounded-2xl ${module.color} flex items-center justify-center mb-10 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 shadow-lg border border-stone-200/50 dark:border-stone-700`}>
                    <Icon className="w-9 h-9" />
                  </div>
                  <h3 className="text-2xl font-black text-stone-900 dark:text-stone-100 mb-4 font-display uppercase leading-tight">{t(`module.${module.id}.title`)}</h3>
                  <p className="text-stone-700 dark:text-stone-400 text-base leading-relaxed flex-grow font-medium opacity-70 group-hover:opacity-100 transition-opacity duration-500">{t(`module.${module.id}.description`)}</p>
                  
                  <div className="mt-10 flex items-center justify-between">
                    <div className={`flex items-center gap-2 ${module.accentColor} font-black uppercase tracking-widest text-[9px] transition-all group-hover:gap-3`}>
                      <span>{t('dashboard.explore')}</span>
                      <Edit className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
      
      {/* Floating Chat Companion */}
      {activeView === 'home' && <ChatCompanion />}

      {/* Subtle UID at the bottom */}
      {profile?.uid && (
        <div className="fixed bottom-2 left-4 pointer-events-none z-0">
          <span className="text-[11px] font-mono text-stone-400/60 dark:text-stone-600/60 font-bold uppercase tracking-widest">
            UID: {profile.uid.substring(0, 8)}
          </span>
        </div>
      )}
    </div>
  );
}
