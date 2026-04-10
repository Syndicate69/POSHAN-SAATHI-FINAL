'use client';

import { ProfileProvider, useProfile } from '../components/ProfileProvider';
import Onboarding from '../components/Onboarding';
import Dashboard from '../components/Dashboard';
import { WifiOff } from 'lucide-react';
import { useLanguage } from '../components/LanguageProvider';

import { motion, AnimatePresence } from 'motion/react';

function OfflineIndicator() {
  const { isOnline } = useProfile();
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-xs md:text-sm font-medium py-1.5 px-4 flex items-center justify-center gap-2 z-[100] shadow-md"
        >
          <WifiOff className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span>{t('toast.offline.saved') || 'Changes saved locally. They will sync when you are back online.'}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AppContent() {
  const { profile, isLoaded, isOnline, isAuthenticated, debugLog } = useProfile();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-4">
        <div className="text-xl font-bold mb-4">Loading...</div>
        <div className="text-xs text-stone-500 font-mono text-left bg-stone-100 dark:bg-stone-900 p-4 rounded-lg w-full max-w-md overflow-auto h-64">
          <p>isLoaded: {String(isLoaded)}</p>
          <p>isOnline: {String(isOnline)}</p>
          <p>isAuthenticated: {String(isAuthenticated)}</p>
          <p>profile: {profile ? 'Yes' : 'No'}</p>
          <hr className="my-2 border-stone-300 dark:border-stone-700" />
          {debugLog?.map((log, i) => (
            <p key={i}>{log}</p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <OfflineIndicator />
      {profile ? <Dashboard /> : <Onboarding />}
    </>
  );
}

export default function Home() {
  return (
    <ProfileProvider>
      <AppContent />
    </ProfileProvider>
  );
}
