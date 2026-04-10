'use client';

import { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';
import { useLanguage } from './LanguageProvider';
import { motion, AnimatePresence } from 'motion/react';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function OfflineIndicator() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isOffline = !isOnline;
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div 
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-4 left-1/2 z-50"
        >
          <div className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">
              {t('offline.message') || 'No internet connection'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
