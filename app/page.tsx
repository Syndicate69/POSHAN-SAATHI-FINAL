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
  const { profile, isLoaded } = useProfile();

  if (!isLoaded) {
    return <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">Loading...</div>;
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
