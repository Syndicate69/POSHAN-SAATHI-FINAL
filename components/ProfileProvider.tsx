'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import { useLanguage } from './LanguageProvider';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { toast } from 'sonner';

export type Profile = {
  uid?: string;
  name: string;
  age: string;
  sex: string;
  diseaseHistory: string;
  substanceAbuse: string[];
  location: string;
  pregnancyStatus: string;
  weight: string;
  weightHistory?: { date: string; weight: number }[];
  cookingUtensil: string;
  dietFrequency: string;
  dietType: string;
  symptoms: string;
  budget: string;
  income: string;
};

type ProfileContextType = {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => Promise<void>;
  isLoaded: boolean;
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  isOnline: boolean;
  user: User | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentOnline = navigator.onLine;
      setIsOnline(currentOnline);
      
      const handleOnline = () => {
        setIsOnline(true);
        toast.success(t('toast.online'));
      };
      const handleOffline = () => {
        setIsOnline(false);
        toast.error(t('toast.offline'));
      };
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [t]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    if (!isFirebaseConfigured || !auth) {
      // Guest mode: check localStorage
      const savedProfile = localStorage.getItem('poshan_saathi_profile');
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          setTimeout(() => setProfileState(parsed), 0);
        } catch (e) {
          setTimeout(() => setProfileState(null), 0);
        }
      } else {
        setTimeout(() => setProfileState(null), 0);
      }
      setTimeout(() => setIsLoaded(true), 0);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setIsAuthenticated(!!user);
      
      if (user) {
        // Use onSnapshot for real-time updates and better offline handling
        unsubscribeProfile = onSnapshot(doc(db, 'profiles', user.uid), 
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data() as Profile;
              
              // Ensure uid is set
              if (!data.uid) {
                data.uid = user.uid;
                setDoc(doc(db, 'profiles', user.uid), data, { merge: true });
              }
              
              setProfileState(data);
              localStorage.setItem('poshan_saathi_profile', JSON.stringify(data));
            } else {
              // Check localStorage for migration if no doc exists in Firestore
              const savedProfile = localStorage.getItem('poshan_saathi_profile');
              if (savedProfile) {
                try {
                  const parsed = JSON.parse(savedProfile);
                  setDoc(doc(db, 'profiles', user.uid), parsed);
                  setProfileState(parsed);
                  toast.success(t('toast.synced'));
                } catch (e) {
                  console.error('Migration error:', e);
                }
              }
            }
            setIsLoaded(true);
          },
          (error) => {
            console.error('Profile snapshot error:', error);
            // Fallback to localStorage on error (e.g. offline and not in cache)
            const savedProfile = localStorage.getItem('poshan_saathi_profile');
            if (savedProfile) {
              setProfileState(JSON.parse(savedProfile));
            }
            setIsLoaded(true);
          }
        );
      } else {
        // Guest mode: check localStorage
        const savedProfile = localStorage.getItem('poshan_saathi_profile');
        if (savedProfile) {
          try {
            setProfileState(JSON.parse(savedProfile));
          } catch (e) {
            setProfileState(null);
          }
        } else {
          setProfileState(null);
        }
        setIsLoaded(true);
      }
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [t]);

  const loginWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth) {
      toast.error('Firebase is not configured. Please add your Firebase API keys to the environment variables.');
      return;
    }
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      toast.success(t('toast.login.success'));
    } catch (e: any) {
      if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') {
        console.warn('Login popup was closed or cancelled.');
        return;
      }
      console.error('Failed to login with Google', e);
      let errorMsg = `Login failed: ${e.message || 'Unknown error'}`;
      
      if (e.code === 'auth/unauthorized-domain') {
        errorMsg = 'This domain is not authorized for Firebase Authentication. Please add the current URL to your Firebase Console under Authentication > Settings > Authorized Domains.';
      }
      
      toast.error(errorMsg, { duration: 6000 });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      setProfileState(null);
      localStorage.removeItem('poshan_saathi_profile');
      localStorage.removeItem('poshan_saathi_auth');
      localStorage.removeItem('poshan_saathi_meals');
      localStorage.removeItem('poshan_saathi_activities');
      localStorage.removeItem('poshan_saathi_chat');
      toast.success(t('toast.logout.success'));
    } catch (e: any) {
      console.error('Failed to logout', e);
      toast.error(`Logout failed: ${e.message || 'Unknown error'}`);
    }
  };

  const setProfile = async (newProfile: Profile | null) => {
    if (newProfile) {
      const ageNum = Number(newProfile.age);
      const weightNum = Number(newProfile.weight);
      
      if (isNaN(ageNum) || ageNum <= 0 || ageNum > 150) {
        toast.error(t('onboarding.error.age'));
        return;
      }
      
      if (isNaN(weightNum) || weightNum <= 0 || weightNum > 500) {
        toast.error(t('onboarding.error.weight'));
        return;
      }

      if (user) {
        newProfile.uid = user.uid;
      }
      
      if (!newProfile.uid && user) {
        newProfile.uid = user.uid;
      }

      const today = new Date().toISOString().split('T')[0];
      const weight = parseFloat(newProfile.weight);
      const history = newProfile.weightHistory || [];
      if (history.length === 0 || history[history.length - 1].date !== today) {
        newProfile.weightHistory = [...history, { date: today, weight }];
      }
      
      // Update local state immediately for snappy UI
      setProfileState(newProfile);
      localStorage.setItem('poshan_saathi_profile', JSON.stringify(newProfile));

      try {
        if (user && db) {
          // Firestore handles offline queueing automatically when persistence is enabled
          await setDoc(doc(db, 'profiles', user.uid), newProfile);
          toast.success(t('toast.profile.updated'));
        } else {
          toast.success(t('toast.profile.saved'));
        }
      } catch (e: any) {
        console.error('Profile save error:', e);
        // If it's just a network error, we don't need to show a scary error because Firestore will sync later
        if (e.code === 'unavailable' || !navigator.onLine) {
          toast.info(t('toast.offline.saved'));
        } else {
          toast.error(t('toast.sync.error'));
        }
      }
    } else {
      setProfileState(null);
      localStorage.removeItem('poshan_saathi_profile');
    }
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfile, isLoaded, isAuthenticated, isLoggingIn, isOnline, user, loginWithGoogle, logout }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
