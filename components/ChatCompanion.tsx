'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, ArrowLeft, Trash2, Menu, Plus, MessageSquare, Edit2, Check } from 'lucide-react';
import { useProfile } from './ProfileProvider';
import { useLanguage } from './LanguageProvider';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleGenAI } from '@google/genai';
import { toast } from 'sonner';
import Image from 'next/image';
import { nepaliFoodDatabase } from '../lib/food-db';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { safeStorage } from '../lib/storage';
import { hapticLight, hapticMedium } from '../lib/haptics';
import { motion, AnimatePresence } from 'motion/react';

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt?: number;
};

type ChatSession = {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
};

export default function ChatCompanion({ onBack }: { onBack?: () => void }) {
  const { profile, user, isOnline } = useProfile();
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(onBack ? true : false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<{ id: string; text: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const foodDbContext = `Reference Nepali Food Data:
${nepaliFoodDatabase.map(f => `- ${f.name} (${f.localName}): ${f.calories}kcal, ${f.protein}g pro, ${f.carbs}g carb, ${f.fat}g fat, ${f.iron}mg iron, Rs.${f.price}`).join('\n')}`;

  const formatDateTime = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Intl.DateTimeFormat(language === 'ne' ? 'ne-NP' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(new Date(timestamp));
  };

  const getInitialMessage = (): Message => ({
    id: 'init',
    role: 'model',
    text: language === 'ne' 
      ? `नमस्ते ${profile?.name?.split(' ')[0] || ''}! म पोषण साथी हुँ, तपाईंको पोषण मित्र। आज तपाईंलाई कस्तो छ?`
      : `Namaste ${profile?.name?.split(' ')[0] || ''}! I'm Poshan Saathi, your nutrition friend. How are you doing today?`,
    createdAt: Date.now()
  });

  // Load history from local storage or initialize
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const loadLocal = () => {
      const savedSessions = safeStorage.getItem('poshan_saathi_chats');
      const legacyChat = safeStorage.getItem('poshan_saathi_chat');
      
      let loadedSessions: ChatSession[] = [];

      if (savedSessions) {
        try {
          loadedSessions = JSON.parse(savedSessions);
        } catch (e) {
          console.error('Failed to parse chat sessions', e);
        }
      }

      // Migrate legacy chat if it exists and no sessions exist
      if (loadedSessions.length === 0 && legacyChat) {
        try {
          const parsedLegacy = JSON.parse(legacyChat);
          if (parsedLegacy && parsedLegacy.length > 0) {
            loadedSessions = [{
              id: Date.now().toString(),
              title: 'Previous Chat',
              updatedAt: Date.now(),
              messages: parsedLegacy
            }];
            safeStorage.removeItem('poshan_saathi_chat');
          }
        } catch (e) {
          console.error('Failed to parse legacy chat', e);
        }
      }

      if (loadedSessions.length > 0) {
        setSessions(prev => {
          if (JSON.stringify(prev) === JSON.stringify(loadedSessions)) return prev;
          return loadedSessions;
        });
        setCurrentSessionId(prev => prev || loadedSessions[0].id);
      } else if (profile) {
        setSessions(prev => {
          if (prev.length > 0) return prev;
          const newSession: ChatSession = {
            id: Date.now().toString(),
            title: 'New Chat',
            updatedAt: Date.now(),
            messages: [getInitialMessage()]
          };
          setCurrentSessionId(newSession.id);
          return [newSession];
        });
      }
    };

    if (user && isFirebaseConfigured && db) {
      unsubscribe = onSnapshot(doc(db, 'chats', user.uid), 
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.sessions && data.sessions.length > 0) {
              // Prevent infinite loop by checking if the data actually changed
              setSessions((prevSessions) => {
                const currentJson = JSON.stringify(prevSessions);
                const newJson = JSON.stringify(data.sessions);
                if (currentJson !== newJson) {
                  safeStorage.setItem('poshan_saathi_chats', newJson);
                  return data.sessions;
                }
                return prevSessions;
              });
              
              setCurrentSessionId((prevId) => {
                if (!prevId) return data.sessions[0].id;
                return prevId;
              });
            } else {
              loadLocal();
            }
          } else {
            loadLocal();
          }
        },
        (error) => {
          console.error('Chat snapshot error:', error);
          loadLocal();
        }
      );
    } else {
      loadLocal();
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, user]);

  // Save history to local storage and Firestore (debounced)
  useEffect(() => {
    if (sessions.length === 0) return;

    const timeoutId = setTimeout(() => {
      safeStorage.setItem('poshan_saathi_chats', JSON.stringify(sessions));
      
      if (user && isFirebaseConfigured && db) {
        setDoc(doc(db, 'chats', user.uid), { sessions }, { merge: true }).catch(e => {
          console.error('Failed to sync chats to Firestore', e);
        });
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [sessions, user]);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = React.useMemo(() => currentSession?.messages || [], [currentSession]);

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      updatedAt: Date.now(),
      messages: [getInitialMessage()]
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
    setIsHistoryOpen(false);
  };

  const handleRenameSession = (id: string, newTitle: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!newTitle.trim()) {
      setEditingSessionId(null);
      setEditingTitle('');
      return;
    }
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle.trim() } : s));
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingDeleteId(id);
  };

  const performDeleteSession = (id: string) => {
    const newSessions = sessions.filter(s => s.id !== id);
    if (newSessions.length === 0) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: 'New Chat',
        updatedAt: Date.now(),
        messages: [getInitialMessage()]
      };
      setSessions([newSession]);
      setCurrentSessionId(newSession.id);
    } else {
      setSessions(newSessions);
      if (currentSessionId === id) {
        setCurrentSessionId(newSessions[0].id);
      }
    }
    toast.success(language === 'ne' ? 'च्याट सफलतापूर्वक मेटाइयो' : 'Chat deleted successfully');
    setConfirmingDeleteId(null);
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      
      if (isNearBottom || !isStreaming) {
        messagesEndRef.current?.scrollIntoView({ behavior: (isLoading || isStreaming) ? 'auto' : 'smooth' });
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: (isLoading || isStreaming) ? 'auto' : 'smooth' });
    }
  }, [isStreaming, isLoading]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isLoading, isStreaming, streamingMessage, scrollToBottom]);

  const updateCurrentSession = (updater: (session: ChatSession) => ChatSession) => {
    setSessions(prev => prev.map(s => s.id === currentSessionId ? updater(s) : s));
  };

  const handleSend = async () => {
    if (!input.trim() || !profile || !currentSessionId) return;

    hapticLight();
    const userText = input.trim();
    setInput('');
    
    const userMsgId = Date.now().toString();
    const newUserMessage: Message = { id: userMsgId, role: 'user', text: userText, createdAt: Date.now() };
    
    // Generate a title for the chat if it's the first user message
    let newTitle = currentSession?.title;
    if (currentSession?.messages.length === 1 && currentSession.messages[0].role === 'model') {
      newTitle = userText.slice(0, 30) + (userText.length > 30 ? '...' : '');
    }

    updateCurrentSession(s => ({
      ...s,
      title: newTitle || s.title,
      updatedAt: Date.now(),
      messages: [...s.messages, newUserMessage]
    }));
    
    setIsLoading(true);
    setIsStreaming(true);

    try {
      const modelMsgId = (Date.now() + 1).toString();
      setStreamingMessage({ id: modelMsgId, text: '' });

      const heightInMeters = Number(profile.height) / 100;
      const weightInKg = Number(profile.weight);
      const bmi = heightInMeters > 0 ? (weightInKg / (heightInMeters * heightInMeters)).toFixed(1) : 'N/A';
      
      let bmiCategory = 'N/A';
      if (bmi !== 'N/A') {
        const bmiNum = Number(bmi);
        if (bmiNum < 18.5) bmiCategory = 'Underweight';
        else if (bmiNum < 24.9) bmiCategory = 'Normal weight';
        else if (bmiNum < 29.9) bmiCategory = 'Overweight';
        else bmiCategory = 'Obese';
      }

      const profileContext = `User Profile:
Name: ${profile.name}
Age: ${profile.age}
Sex: ${profile.sex}
Height: ${profile.height} cm
Weight: ${profile.weight} kg
BMI: ${bmi} (${bmiCategory})
Location (Region/District): ${profile.location}
Staple Food (Main Cereal): ${profile.stapleFood}
Pregnancy/Breastfeeding: ${profile.pregnancyStatus}
Disease History: ${profile.diseaseHistory}
Substance Abuse: ${profile.substanceAbuse?.join(', ')}
Diet Type: ${profile.dietType}
Diet Frequency: ${profile.dietFrequency}
Cooking Utensil: ${profile.cookingUtensil}
Symptoms: ${profile.symptoms}
Budget: ${profile.budget} NPR/month for a household of ${profile.familySize || 1} people (approx ${Math.round(Number(profile.budget) / Number(profile.familySize || 1))} NPR/person/month)
Income: ${profile.income}`;

      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });
      
      const contents = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      contents.push({ role: 'user', parts: [{ text: userText }] });

      const systemInstructionText = `You are Poshan Saathi, a friendly, empathetic nutrition AI companion for Nepal.
Keep responses concise, conversational, and culturally relevant to Nepal.
CRITICAL REQUIREMENT: The user has explicitly selected ${language === 'ne' ? 'Nepali' : 'English'} as their preferred language. You MUST write your ENTIRE response in ${language === 'ne' ? 'highly natural, fluent, and idiomatic Nepali (Devanagari script). Avoid stiff, robotic, or literal translations from English. Use everyday Nepali phrasing that a local expert would naturally speak' : 'English'}. Do NOT reply in any other language. Translate all medical and nutritional terms to ${language === 'ne' ? 'Nepali' : 'English'} where possible.
- MEDICAL BOUNDARIES: Use your expert medical reasoning to identify when a symptom or disease is likely NOT primarily nutrition-related. This includes but is not limited to congenital, hereditary, traumatic (accidents), infectious, environmental, or idiopathic causes (e.g., AVM, DVT, viral infections, structural issues). If a condition is likely non-nutritional, explicitly explain your reasoning for this conclusion based on medical facts. You MUST provide evidence-based, factual information and avoid any hallucinations or speculative claims. Focus your advice on how nutrition can support overall resilience or recovery, rather than suggesting it as the root cause or a primary cure.
- MANDATORY DISCLAIMER: Whenever you discuss medical conditions or symptoms, you MUST include a brief, clear disclaimer: "*Disclaimer: Poshan Saathi provides nutritional guidance based on evidence-based data. It is not a substitute for professional medical diagnosis or treatment. Always consult a healthcare provider for medical concerns.*"
- CONVERSATIONAL GREETING: When the user says 'Hi', 'Hello', 'Namaste', or asks 'How are you?', you MUST ONLY respond warmly and ask how you can help them with their nutrition today. DO NOT provide any unsolicited health advice, tips, or mention their profile details during a simple greeting.
- MEMORY & CONTINUITY: You have access to the previous chat history. Always remember what the user has told you in previous messages. If they mention something they brought up earlier, acknowledge it to build a continuous, empathetic relationship. Connect your current advice to their past questions.
CRITICAL INSTRUCTION ON PERSONALIZATION: When providing nutritional advice or answering health questions, you MUST strictly personalize your response based on the User Profile provided below. You already have their profile information (age, weight, budget, medical history, etc.). You are STRICTLY FORBIDDEN from asking the user for these details again. Use the provided data immediately to personalize your response.
- If the user has a specific disease (e.g., Diabetes), you must mention how your advice relates to it.
- If the user is pregnant or breastfeeding, you MUST prioritize nutritional advice that supports maternal and fetal/infant health (e.g., increased iron, folate, calcium, protein, and hydration) and explicitly mention how your recommendations help during this stage.
- If the user has a low budget, you must suggest cheap, local alternatives.
- Do not give generic advice. Tailor your tone and recommendations to their exact age, weight, symptoms, and location.
- NOTE ON PRICES: Provide the most accurate and up-to-date retail prices for Nepal (NPR) based on the 'Reference Nepali Food Data' and your internal knowledge. Always mention that prices are estimates and may vary by location and market conditions. Accuracy is critical.
- CRITICAL INSTRUCTION ON MACROS: You MUST strictly use the exact macronutrient values (calories, protein, carbs, fat, iron, etc.) provided in the 'Reference Nepali Food Data' below. If a food is not in the database, you are strictly forbidden from making up numbers. You must provide reliable, evidence-based nutritional data specific to Nepali cuisine and standard preparation methods. DO NOT mention that the item is "not in the primary database" or missing from the list. Instead, simply provide the factual data and add a brief disclaimer: "*Note: Nutritional values for this item are evidence-based estimates based on standard Nepali recipes.*"
- FORMATTING: When providing lists (like ingredients, steps, or alternatives), YOU MUST USE A NEW LINE FOR EACH POINT. Make the main item/ingredient **bold**, followed by a non-bold explanation (e.g., \n1. **Item Name:** Explanation...). Do not put multiple numbered points on the same line.
- COMPLEX INGREDIENTS & MSG: When discussing packaged foods, mention complex ingredients, artificial food colors, and preservatives, and explicitly explain their potential health effects. Note: For MSG (E621) and similar flavor enhancers, clarify that they occur naturally in some foods but can cause symptoms in sensitive individuals or when consumed in high amounts.
- CULTURALLY RELEVANT MEASUREMENTS: Use common Nepali household measurements like "kachaura" or "katori" (bowl), "muthi" (handful), and "mana" alongside metric values (grams/ml) in brackets, e.g., "1 mana (approx. 500g)". Be realistic with portion sizes (e.g., 1 mana of buckwheat is too much for one meal, 1 kachaura of mustard is too much). Ensure portions are practical for a single meal.
- PLATE BALANCE FOCUS: Emphasize the traditional Nepali plate balance. Specifically suggest reducing the amount of white rice (Bhat) in daily meals and replacing it with more vegetables (Saag/Tarkari), lentils (Dal/Gahat), or whole grains (like Dhindo, Phapar, or Millet) to improve the glycemic index and overall nutrient density.
- INTELLIGENT TYPO DETECTION: Intelligently identify the intended meaning behind common typos or grammatical errors in the user's input (e.g., recognizing "dal bht" as "Dal Bhat") and provide the correct information without being tripped up by spelling mistakes.
- NATURAL CLARIFICATION: If the user's input is gibberish, random characters (e.g., "asdf", "hjkl"), or completely nonsensical/unintelligible, you MUST NOT provide any nutritional advice, tips, or profile-based recommendations. Instead, politely and warmly ask them to speak clearly or provide more context so you can help them properly.
- REPEATED QUERIES: If the user asks the exact same question multiple times, acknowledge that they are repeating the question and refer to your previous answer, or provide a slightly summarized version of it. Do not generate an entirely new, long-winded response.
- DIVERSE & PRACTICAL ALTERNATIVES: You MUST provide HIGHLY DIVERSE, creative, and non-repetitive alternatives. Do not default to the same 2-3 options (like Chiura or Makhana) for every query. Draw from the rich variety of Nepali cuisine (e.g., Phapar ko Roti, Kodo ko Dhindo, Jwano ko Jhol, Kwati, Gundruk, roasted soybeans, local seasonal fruits, etc.) based on the specific context. CRITICAL: Consider the user's location, budget, and lifestyle. If they have a busy lifestyle or limited cooking time, suggest quick, easy-to-find, and fast-to-prepare alternatives (e.g., roasted chana, sattu, fresh fruits, yogurt) rather than time-consuming complex dishes like Kwati or Dhindo. DO NOT limit yourself to these specific examples; use your vast knowledge to provide a wide variety of quick, practical Nepali options. Balance diversity with real-world practicality.
- CRITICAL INSTRUCTION ON GEOGRAPHY & STAPLE FOOD: The user lives in the ${profile.location} region of Nepal and their staple food is ${profile.stapleFood}. You MUST ONLY suggest foods, ingredients, and recipes that are geographically relevant, locally available, and commonly consumed in the ${profile.location} region. Tailor your carbohydrate recommendations around their staple food (${profile.stapleFood}). Do not suggest foods from other regions unless they are universally available.
- CRITICAL INSTRUCTION ON BMI: The user's BMI is ${bmi} (${bmiCategory}). Tailor your caloric and nutritional advice to help them reach or maintain a healthy BMI.
- CRITICAL INSTRUCTION ON CONCISENESS & TOKEN REDUCTION: You MUST keep your responses as brief and concise as possible to minimize token usage. Get straight to the point, avoid unnecessary filler words, long introductions, or repetitive summaries. Provide high-density, quality information in the fewest words possible while fully addressing the user's query. Use bullet points for readability and brevity. MAXIMUM 3-4 SENTENCES OR BULLET POINTS. Be extremely brief. Do not write long paragraphs.
Use Nepali words occasionally (like Namaste, Dal Bhat, etc.).

${profileContext}

${foodDbContext}`;

      let response;
      try {
        response = await ai.models.generateContentStream({
          model: 'gemini-3-flash-preview',
          contents,
          config: {
            temperature: 0.7,
            systemInstruction: systemInstructionText,
          }
        });
      } catch (e) {
        console.warn("First Gemini stream attempt failed in ChatCompanion, retrying...", e);
        response = await ai.models.generateContentStream({
          model: 'gemini-3-flash-preview',
          contents,
          config: {
            temperature: 0.7,
            systemInstruction: systemInstructionText,
          }
        });
      }

      let fullText = '';
      let isFirstChunk = true;
      for await (const chunk of response) {
        if (chunk.text) {
          if (isFirstChunk) {
            setIsLoading(false);
            isFirstChunk = false;
          }
          fullText += chunk.text;
          setStreamingMessage({ id: modelMsgId, text: fullText });
        }
      }

      if (!fullText) {
        throw new Error('The AI returned an empty response. This might be due to safety filters.');
      }

      updateCurrentSession(s => ({
        ...s,
        messages: [...s.messages, { id: modelMsgId, role: 'model', text: fullText, createdAt: Date.now() }]
      }));
      setStreamingMessage(null);
    } catch (error: any) {
      console.error('Chat error:', error);
      let userFriendlyMsg = 'I encountered a technical glitch. Please try again in a moment.';
      let showKeySelector = false;
      
      if (error.message?.includes('API key')) {
        userFriendlyMsg = 'There is an issue with the AI configuration. Please contact support.';
      } else if (error.message?.includes('quota') || error.message?.includes('429')) {
        userFriendlyMsg = 'The Gemini API quota has been exceeded. To continue chatting without limits, please select your own personal API key.';
        showKeySelector = true;
      } else if (error.message?.includes('safety') || error.message?.includes('blocked')) {
        userFriendlyMsg = "I cannot respond to this specific request due to safety guidelines. Let's talk about something else!";
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        userFriendlyMsg = 'I am having trouble connecting. Please check your internet.';
      }

      const finalMsg = showKeySelector 
        ? `${userFriendlyMsg}\n\n[Select Personal API Key](action:open_key_selector)` 
        : userFriendlyMsg;

      setStreamingMessage(null);
      updateCurrentSession(s => ({
        ...s,
        messages: [
          ...s.messages.filter(m => m.text !== ''), // Remove the empty model message if it exists
          { 
            id: Date.now().toString(), 
            role: 'model', 
            text: finalMsg 
          }
        ]
      }));

      if (showKeySelector) {
        toast.error(userFriendlyMsg, {
          action: {
            label: 'Select Key',
            onClick: async () => {
              if ((window as any).aistudio?.openSelectKey) {
                await (window as any).aistudio.openSelectKey();
              }
            }
          }
        });
      } else {
        toast.error(userFriendlyMsg);
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  if (!profile) return null;

  if (onBack) {
    return (
      <div className="h-[100dvh] bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-0 md:p-6 lg:p-10 transition-colors overflow-x-hidden relative">
        {/* Blurred Background Accents */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-emerald-400/10 dark:bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-amber-400/10 dark:bg-amber-900/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="w-full h-full max-w-7xl md:max-h-[850px] bg-white dark:bg-stone-900 md:rounded-[3rem] md:shadow-2xl md:border border-stone-200 dark:border-stone-800 flex flex-col md:flex-row overflow-x-hidden relative z-10">
          {/* Sidebar */}
          <div className={`fixed md:absolute inset-y-0 left-0 z-40 w-80 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 transform transition-transform duration-500 ease-in-out md:relative md:translate-x-0 flex flex-col shadow-2xl md:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <button onClick={handleNewChat} className="flex-grow flex items-center justify-center gap-3 bg-emerald-600 text-white px-5 py-4 rounded-2xl hover:bg-emerald-700 transition-all font-bold uppercase tracking-wider text-xs shadow-lg shadow-emerald-100 dark:shadow-none hover:-translate-y-0.5 active:translate-y-0">
              <Plus className="w-5 h-5" />
              {t('chat.new')}
            </button>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden ml-3 p-3 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-2xl transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-grow overflow-y-auto p-4 space-y-2">
            {sessions.sort((a, b) => b.updatedAt - a.updatedAt).map(session => (
              <div 
                key={session.id}
                onClick={() => {
                  if (editingSessionId === session.id) return;
                  setCurrentSessionId(session.id);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-200 ${
                  currentSessionId === session.id 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 shadow-sm' 
                    : 'hover:bg-stone-100 dark:hover:bg-stone-800/50 text-stone-700 dark:text-stone-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-4 overflow-hidden flex-grow">
                  <MessageSquare className={`w-5 h-5 flex-shrink-0 ${currentSessionId === session.id ? 'text-emerald-600' : 'opacity-40'}`} />
                  {editingSessionId === session.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSession(session.id, editingTitle);
                        if (e.key === 'Escape') {
                          setEditingSessionId(null);
                          setEditingTitle('');
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="flex-grow bg-white dark:bg-stone-950 border border-emerald-500 rounded px-2 py-1 text-sm text-stone-900 dark:text-stone-100 outline-none"
                    />
                  ) : (
                    <span className={`truncate text-sm ${currentSessionId === session.id ? 'font-bold' : 'font-medium'}`}>{session.title}</span>
                  )}
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {editingSessionId === session.id ? (
                    <button 
                      onClick={(e) => handleRenameSession(session.id, editingTitle, e)}
                      className="p-2 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-xl transition-all"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSessionId(session.id);
                          setEditingTitle(session.title);
                        }}
                        className="p-2 text-stone-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { hapticMedium(); handleDeleteSession(session.id, e); }}
                        className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-stone-900/40 z-30 md:hidden backdrop-blur-md transition-opacity duration-500"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Chat Area */}
        <div className="flex-grow flex flex-col h-full relative min-w-0 bg-white dark:bg-stone-950 z-10">
          <header className="bg-white/70 dark:bg-stone-900/80 backdrop-blur-2xl border-b border-stone-200/60 dark:border-stone-800 sticky top-0 z-20 transition-colors flex-shrink-0 shadow-sm">
            <div className="px-6 h-20 flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <button onClick={() => { hapticLight(); setIsSidebarOpen(true); }} className="p-2.5 -ml-2 rounded-xl hover:bg-stone-200/50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-all md:hidden active:scale-95 shrink-0">
                  <Menu className="w-7 h-7" />
                </button>
                {onBack && (
                  <button onClick={() => { hapticLight(); onBack(); }} className="p-2.5 rounded-xl hover:bg-stone-200/50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-all active:scale-95 hidden sm:block shrink-0">
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                )}
                <div className="w-14 h-14 sm:w-16 sm:h-16 relative flex items-center justify-center shrink-0">
                  <Image src="/logo.png" alt="Poshan Saathi Logo" fill priority sizes="(max-width: 640px) 56px, 64px" className="object-contain drop-shadow-xl scale-125" referrerPolicy="no-referrer" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 font-display leading-tight uppercase">{t('app.name')}</h1>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => { hapticLight(); handleNewChat(); }}
                  className="flex items-center gap-2 bg-stone-200/50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-3 sm:px-4 py-2.5 rounded-xl hover:bg-emerald-600 hover:text-white transition-all font-bold text-xs uppercase tracking-widest shadow-sm active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('chat.new')}</span>
                </button>
                {onBack && (
                  <button 
                    onClick={() => { hapticLight(); onBack(); }}
                    className="flex items-center gap-2 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-3 py-2.5 rounded-xl hover:bg-rose-600 hover:text-white transition-all font-bold text-xs uppercase tracking-widest shadow-sm active:scale-95 sm:hidden"
                  >
                    <X className="w-4 h-4" />
                    <span className="sr-only">Exit</span>
                  </button>
                )}
              </div>
            </div>
          </header>

          <main className="flex-grow flex flex-col relative overflow-hidden">
            <div ref={scrollContainerRef} className="flex-grow overflow-y-auto p-6 md:p-10 space-y-8 pb-40">
              <div className="max-w-4xl mx-auto space-y-8">
                <AnimatePresence initial={false}>
                  {messages.filter(m => m.text.trim() !== '').map((msg) => (
                    <motion.div 
                      key={msg.id} 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`max-w-[90%] md:max-w-[80%] p-6 rounded-[2rem] shadow-sm transition-all duration-300 ${
                        msg.role === 'user' 
                          ? 'bg-emerald-600 text-white rounded-tr-sm shadow-emerald-100/50 dark:shadow-none' 
                          : 'bg-stone-100 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-800 text-stone-900 dark:text-stone-100 rounded-tl-sm'
                      }`}>
                        {msg.role === 'model' ? (
                          <div className="prose prose-stone dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:mb-6 prose-li:mb-2 prose-ul:mb-6 prose-ol:mb-6 prose-a:text-emerald-700 dark:prose-a:text-emerald-400 prose-headings:font-display prose-headings:uppercase prose-strong:text-emerald-700 dark:prose-strong:text-emerald-400 prose-strong:font-black prose-em:text-stone-500 dark:prose-em:text-stone-400">
                            <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
                          </div>
                        ) : (
                          <p className="text-lg font-medium leading-relaxed">{msg.text}</p>
                        )}
                      </div>
                      {msg.createdAt && (
                        <span className={`text-[11px] text-stone-600 dark:text-stone-300 mt-2 px-3 font-bold ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                          {formatDateTime(msg.createdAt)}
                        </span>
                      )}
                    </motion.div>
                  ))}
                  {streamingMessage && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="flex flex-col items-start"
                    >
                      <div className="max-w-[90%] md:max-w-[80%] p-6 rounded-[2rem] shadow-sm transition-all duration-300 bg-stone-100 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-800 text-stone-900 dark:text-stone-100 rounded-tl-sm">
                        <div className="prose prose-stone dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:mb-6 prose-li:mb-2 prose-ul:mb-6 prose-ol:mb-6 prose-a:text-emerald-700 dark:prose-a:text-emerald-400 prose-headings:font-display prose-headings:uppercase prose-strong:text-emerald-700 dark:prose-strong:text-emerald-400 prose-strong:font-black prose-em:text-stone-500 dark:prose-em:text-stone-400">
                          <Markdown remarkPlugins={[remarkGfm]}>{streamingMessage.text}</Markdown>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {isLoading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                      className="flex justify-start"
                    >
                      <div className="bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800 p-5 rounded-[2rem] rounded-tl-sm shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 relative flex items-center justify-center flex-shrink-0">
                          <Image src="/logo.png" alt="Poshan Saathi Logo" fill sizes="48px" className="object-contain drop-shadow-md animate-pulse" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex items-center gap-1.5 px-2">
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-10 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-stone-950 dark:via-stone-950/90 z-20">
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-2 md:gap-3">
                  <div className="flex-grow bg-white dark:bg-stone-900 rounded-full shadow-2xl border border-stone-200 dark:border-stone-800 focus-within:border-emerald-500/50 transition-all duration-300 flex items-center px-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder={t('chat.placeholder')}
                      className="flex-grow px-4 py-3 md:px-6 md:py-4 bg-transparent border-transparent focus:ring-0 outline-none text-base md:text-lg text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading || isStreaming}
                    className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all flex-shrink-0 shadow-2xl ${
                      (isLoading || isStreaming) 
                        ? 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed border border-stone-200 dark:border-stone-800' 
                        : input.trim() 
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100 dark:shadow-none hover:-translate-y-0.5 active:translate-y-0' 
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed border border-stone-200 dark:border-stone-800'
                    }`}
                  >
                    {(isLoading || isStreaming) ? <Loader2 className="w-5 h-5 md:w-7 md:h-7 animate-spin" /> : <Send className="w-5 h-5 md:w-7 md:h-7" />}
                  </button>
                </div>
                <p className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-center text-stone-400 dark:text-stone-500 mt-3 md:mt-5 opacity-60">
                  {t('chat.disclaimer')}
                </p>
              </div>
            </div>

            {/* Confirmation Modals (Full Screen) */}
            {confirmingDeleteId && (
              <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-stone-900 rounded-[3rem] p-10 w-full max-w-md shadow-2xl border border-stone-200 dark:border-stone-800 animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-[2rem] flex items-center justify-center mb-8 mx-auto">
                    <Trash2 className="w-10 h-10" />
                  </div>
                  <h4 className="text-center text-2xl font-black text-stone-900 dark:text-stone-100 mb-4 uppercase tracking-tight">
                    {language === 'ne' ? 'यो च्याट मेटाउने?' : 'Delete this chat?'}
                  </h4>
                  <p className="text-center text-stone-500 dark:text-stone-400 mb-10 font-medium">
                    {language === 'ne' ? 'यो कार्य फिर्ता लिन सकिँदैन। के तपाईं पक्का हुनुहुन्छ?' : 'This action cannot be undone. Are you sure you want to proceed?'}
                  </p>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setConfirmingDeleteId(null)}
                      className="flex-grow py-5 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-bold uppercase tracking-widest hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
                    >
                      {language === 'ne' ? 'रद्द गर्नुहोस्' : 'Cancel'}
                    </button>
                    <button 
                      onClick={() => performDeleteSession(confirmingDeleteId)}
                      className="flex-grow py-5 rounded-2xl bg-red-600 text-white font-bold uppercase tracking-widest hover:bg-red-700 shadow-xl shadow-red-100 dark:shadow-none transition-all"
                    >
                      {language === 'ne' ? 'मेटाउनुहोस्' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
    );
  }

  // Floating Chat Widget (when not in full screen)
  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 w-24 h-24 flex items-center justify-center z-50 group transition-all duration-500 hover:scale-110"
          aria-label="Open Chat"
        >
          {/* Circular Background - slightly larger */}
          <div className="absolute w-20 h-20 bg-emerald-600 rounded-full shadow-2xl group-hover:bg-emerald-700 transition-colors duration-500" />
          
          {/* Logo - scaled and positioned to pop out */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            <Image 
              src="/logo.png" 
              alt="Poshan Saathi Logo" 
              fill
              priority
              sizes="112px"
              className="object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)] group-hover:rotate-12 group-hover:-translate-y-2 transition-all duration-500 scale-125" 
              referrerPolicy="no-referrer"
            />
          </div>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-8 right-8 w-[calc(100vw-4rem)] sm:w-[330px] h-[500px] max-h-[70vh] bg-white dark:bg-stone-900 rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden z-50 border border-stone-200 dark:border-stone-800 transition-all duration-500 animate-in fade-in zoom-in slide-in-from-bottom-10">
          {/* Header */}
          <div className="bg-emerald-600 p-3 text-white flex justify-between items-center shadow-lg z-10 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0 pr-1">
              <div className="w-12 h-12 relative flex items-center justify-center shrink-0">
                <Image src="/logo.png" alt="Poshan Saathi Logo" fill sizes="48px" className="object-contain drop-shadow-xl scale-125" referrerPolicy="no-referrer" />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-base leading-snug font-display uppercase">{t('app.name')}</h3>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button 
                onClick={() => setIsHistoryOpen(!isHistoryOpen)} 
                className={`transition-all p-2 rounded-full hover:bg-white/10 ${isHistoryOpen ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white'}`}
                title="Chat History"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-white hover:text-white transition-all p-2 rounded-full hover:bg-white/20 bg-white/10"
                title="Close Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area Wrapper */}
          <div className="flex-grow relative overflow-hidden flex flex-col">
            {/* Messages */}
            <div ref={scrollContainerRef} className="flex-grow overflow-y-auto p-5 space-y-5 bg-stone-50 dark:bg-stone-950 transition-colors relative">
              {/* Blurred Background Accents */}
              <div className="absolute top-[-10%] left-[-10%] w-full h-full bg-emerald-400/5 dark:bg-emerald-900/5 rounded-full blur-[80px] pointer-events-none z-0" />
              <div className="absolute bottom-[-10%] right-[-10%] w-full h-full bg-amber-400/5 dark:bg-amber-900/5 rounded-full blur-[80px] pointer-events-none z-0" />

              <AnimatePresence initial={false}>
              {messages.filter(m => m.text.trim() !== '').map((msg) => (
                <motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} relative z-10`}
                >
                  <div className={`max-w-[80%] p-2.5 rounded-xl shadow-sm transition-all duration-300 ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white rounded-tr-sm shadow-emerald-100 dark:shadow-none' 
                      : 'bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 text-stone-800 dark:text-stone-100 rounded-tl-sm'
                  }`}>
                    {msg.role === 'model' ? (
                      <div className="prose prose-sm prose-stone dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:my-0.5 prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-headings:font-display prose-headings:uppercase">
                        <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
                      </div>
                    ) : (
                      <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                    )}
                  </div>
                  {msg.createdAt && (
                    <span className={`text-[11px] text-stone-600 dark:text-stone-300 mt-1 px-1 font-bold ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {formatDateTime(msg.createdAt)}
                    </span>
                  )}
                </motion.div>
              ))}
              {streamingMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="flex flex-col items-start relative z-10"
                >
                  <div className="max-w-[80%] p-2.5 rounded-xl shadow-sm transition-all duration-300 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 text-stone-800 dark:text-stone-100 rounded-tl-sm">
                    <div className="prose prose-sm prose-stone dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:my-0.5 prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-headings:font-display prose-headings:uppercase">
                      <Markdown remarkPlugins={[remarkGfm]}>{streamingMessage.text}</Markdown>
                    </div>
                  </div>
                </motion.div>
              )}
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  className="flex justify-start relative z-10"
                >
                  <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 p-4 rounded-[1.75rem] rounded-tl-sm shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 relative flex items-center justify-center flex-shrink-0">
                      <Image src="/logo.png" alt="Poshan Saathi Logo" fill sizes="40px" className="object-contain drop-shadow-md animate-pulse" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex items-center gap-1.5 px-1.5">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* History Overlay */}
          {isHistoryOpen && (
            <div className="absolute inset-0 bg-white dark:bg-stone-900 z-30 flex flex-col animate-in slide-in-from-left duration-300">
              <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <h4 className="font-black text-xs uppercase tracking-widest text-stone-500">{t('chat.history')}</h4>
                <div className="flex items-center gap-1">
                  <button onClick={handleNewChat} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all" title="New Chat">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-grow overflow-y-auto p-3 space-y-1">
                {sessions.sort((a, b) => b.updatedAt - a.updatedAt).map(session => (
                  <div 
                    key={session.id}
                    onClick={() => {
                      if (editingSessionId === session.id) return;
                      setCurrentSessionId(session.id);
                      setIsHistoryOpen(false);
                    }}
                    className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                      currentSessionId === session.id 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' 
                        : 'hover:bg-stone-100 dark:hover:bg-stone-800/50 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-grow">
                      <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-50" />
                      {editingSessionId === session.id ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSession(session.id, editingTitle);
                            if (e.key === 'Escape') {
                              setEditingSessionId(null);
                              setEditingTitle('');
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="flex-grow bg-white dark:bg-stone-950 border border-emerald-500 rounded px-2 py-1 text-xs text-stone-900 dark:text-stone-100 outline-none"
                        />
                      ) : (
                        <span className="truncate text-xs font-bold">{session.title}</span>
                      )}
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingSessionId === session.id ? (
                        <button 
                          onClick={(e) => handleRenameSession(session.id, editingTitle, e)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-xl transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSessionId(session.id);
                              setEditingTitle(session.title);
                            }}
                            className="p-1.5 text-stone-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>

          {/* Input */}
          <div className="p-3 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex flex-col gap-2 transition-colors z-10">
            <div className="flex gap-2">
              <div className="flex-grow bg-stone-100 dark:bg-stone-800 p-1.5 rounded-full border border-transparent focus-within:border-emerald-500/50 focus-within:bg-stone-50 dark:focus-within:bg-stone-700 transition-all flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={t('chat.placeholder')}
                  className="flex-grow px-4 py-1.5 bg-transparent border-transparent focus:ring-0 outline-none text-sm text-stone-900 dark:text-stone-100"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || isStreaming}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0 shadow-sm ${
                  (isLoading || isStreaming) 
                    ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed' 
                    : input.trim() 
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 active:scale-95' 
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed'
                }`}
              >
                {(isLoading || isStreaming) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirmation Modals */}
          {confirmingDeleteId && (
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 w-full max-w-[280px] shadow-2xl border border-stone-200 dark:border-stone-800 animate-in zoom-in duration-300">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h4 className="text-center font-bold text-stone-900 dark:text-stone-100 mb-2">
                  {language === 'ne' ? 'यो च्याट मेटाउने?' : 'Delete this chat?'}
                </h4>
                <p className="text-center text-xs text-stone-500 dark:text-stone-400 mb-6">
                  {language === 'ne' ? 'यो कार्य फिर्ता लिन सकिँदैन।' : 'This action cannot be undone.'}
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmingDeleteId(null)}
                    className="flex-grow py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-bold text-xs uppercase tracking-widest hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
                  >
                    {language === 'ne' ? 'रद्द गर्नुहोस्' : 'Cancel'}
                  </button>
                  <button 
                    onClick={() => performDeleteSession(confirmingDeleteId)}
                    className="flex-grow py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-100 dark:shadow-none transition-all"
                  >
                    {language === 'ne' ? 'मेटाउनुहोस्' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
