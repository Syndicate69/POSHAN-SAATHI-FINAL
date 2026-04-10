'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import { safeStorage } from '@/lib/storage';
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
  height: string;
  stapleFood: string;
  weightHistory?: { date: string; weight: number }[];
  cookingUtensil: string;
  dietFrequency: string;
  dietType: string;
  symptoms: string;
  budget: string;
  familySize: string;
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
  debugLog?: string[];
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const isLoadedRef = useRef(false);
  const migrationAttemptedRef = useRef(false);

  // Sync ref with state
  useEffect(() => {
    isLoadedRef.current = isLoaded;
  }, [isLoaded]);

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

  const [debugLog, setDebugLog] = useState<string[]>([]);
  const addDebug = (msg: string) => setDebugLog(prev => [...prev, `${new Date().toISOString().split('T')[1]} - ${msg}`]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    
    addDebug('useEffect started');
    
    // Force load after 5 seconds if Firebase is stuck
    const fallbackTimeout = setTimeout(() => {
      addDebug('fallbackTimeout fired');
      if (isLoadedRef.current) {
        addDebug('isLoadedRef is true, returning');
        return;
      }
      
      console.warn('Firebase auth state timed out, forcing load');
      const savedProfile = safeStorage.getItem('poshan_saathi_profile');
      if (savedProfile) {
        try {
          setProfileState(JSON.parse(savedProfile));
          addDebug('Loaded profile from storage in fallback');
        } catch (e) {
          addDebug('Failed to parse profile in fallback');
        }
      }
      addDebug('Calling setIsLoaded(true) from fallback');
      setIsLoaded(true);
    }, 5000);

    if (!isFirebaseConfigured || !auth) {
      addDebug('Firebase not configured or auth is null');
      // Guest mode: check localStorage
      const savedProfile = safeStorage.getItem('poshan_saathi_profile');
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
      setTimeout(() => {
        clearTimeout(fallbackTimeout);
        setIsLoaded(true);
      }, 0);
      return;
    }

    addDebug('Calling onAuthStateChanged');
    try {
      const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        addDebug(`onAuthStateChanged fired. User: ${user ? user.uid : 'null'}`);
        setUser(user);
        setIsAuthenticated(!!user);
        
        if (user) {
          addDebug('Calling onSnapshot');
          try {
            unsubscribeProfile = onSnapshot(doc(db, 'profiles', user.uid), 
              (snapshot) => {
                addDebug(`onSnapshot fired. Exists: ${snapshot.exists()}`);
                if (snapshot.exists()) {
                  const data = snapshot.data() as Profile;
                  
                  // Ensure uid is set in state
                  if (!data.uid) {
                    data.uid = user.uid;
                  }
                  
                  setProfileState(data);
                  safeStorage.setItem('poshan_saathi_profile', JSON.stringify(data));
                } else {
                  // Check localStorage for migration if no doc exists in Firestore
                  const savedProfile = safeStorage.getItem('poshan_saathi_profile');
                  if (savedProfile && !migrationAttemptedRef.current) {
                    migrationAttemptedRef.current = true;
                    try {
                      const parsed = JSON.parse(savedProfile);
                      setDoc(doc(db, 'profiles', user.uid), parsed).catch(e => {
                        console.error('Failed to migrate profile to Firestore:', e);
                        addDebug(`Migration setDoc error: ${e.message}`);
                      });
                      setProfileState(parsed);
                      toast.success(t('toast.synced'));
                    } catch (e) {
                      console.error('Migration error:', e);
                      addDebug(`Migration error: ${e}`);
                    }
                  } else if (!savedProfile) {
                    setProfileState(null);
                  }
                }
                addDebug('Calling setIsLoaded(true) from onSnapshot');
                setIsLoaded(true);
              },
              (error) => {
                console.error('Profile snapshot error:', error);
                addDebug(`onSnapshot error: ${error.message}`);
                // Fallback to localStorage on error (e.g. offline and not in cache)
                const savedProfile = safeStorage.getItem('poshan_saathi_profile');
                if (savedProfile) {
                  setProfileState(JSON.parse(savedProfile));
                }
                setIsLoaded(true);
              }
            );
          } catch (e: any) {
            addDebug(`Error calling onSnapshot: ${e.message}`);
            setIsLoaded(true);
          }
        } else {
          addDebug('User is null, setting guest mode');
          // Guest mode: check localStorage
          const savedProfile = safeStorage.getItem('poshan_saathi_profile');
          if (savedProfile) {
            try {
              setProfileState(JSON.parse(savedProfile));
            } catch (e) {
              setProfileState(null);
            }
          } else {
            setProfileState(null);
          }
          addDebug('Calling setIsLoaded(true) from guest mode');
          setIsLoaded(true);
        }
      }, (error) => {
        console.error('Auth state error:', error);
        addDebug(`onAuthStateChanged error: ${error.message}`);
        // Fallback to localStorage on auth error
        const savedProfile = safeStorage.getItem('poshan_saathi_profile');
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
      });

      return () => {
        addDebug('useEffect cleanup');
        clearTimeout(fallbackTimeout);
        if (unsubscribeAuth) unsubscribeAuth();
        if (unsubscribeProfile) unsubscribeProfile();
      };
    } catch (e: any) {
      addDebug(`Error calling onAuthStateChanged: ${e.message}`);
      setIsLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove t from dependencies to prevent re-running auth logic

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
      safeStorage.removeItem('poshan_saathi_profile');
      safeStorage.removeItem('poshan_saathi_auth');
      safeStorage.removeItem('poshan_saathi_meals');
      safeStorage.removeItem('poshan_saathi_activities');
      safeStorage.removeItem('poshan_saathi_chat');
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
      const heightNum = Number(newProfile.height);
      
      if (isNaN(ageNum) || ageNum <= 0 || ageNum > 150) {
        toast.error(t('onboarding.error.age'));
        return;
      }
      
      if (isNaN(weightNum) || weightNum <= 0 || weightNum > 500) {
        toast.error(t('onboarding.error.weight'));
        return;
      }

      if (isNaN(heightNum) || heightNum <= 0 || heightNum > 300) {
        toast.error('Please enter a valid height in cm.');
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
      safeStorage.setItem('poshan_saathi_profile', JSON.stringify(newProfile));

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
      safeStorage.removeItem('poshan_saathi_profile');
    }
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfile, isLoaded, isAuthenticated, isLoggingIn, isOnline, user, loginWithGoogle, logout, debugLog }}>
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
