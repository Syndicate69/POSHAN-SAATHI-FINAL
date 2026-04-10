'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useProfile } from './ProfileProvider';
import { useLanguage } from './LanguageProvider';
import { modules } from '../lib/modules';
import { ArrowLeft, Loader2, Send, Camera, MessageSquare, ChevronDown, AlertTriangle, RefreshCw } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleGenAI, Type } from '@google/genai';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { nepaliFoodDatabase } from '../lib/food-db';
import { calculateNutriScore } from '../lib/nutriScore';
import { hapticLight, hapticMedium, hapticSuccess } from '../lib/haptics';
import { motion, AnimatePresence } from 'motion/react';

import ChatCompanion from './ChatCompanion';
import BarcodeScanner from './BarcodeScanner';

const renderNutriScore = (jsonString: string, onUploadRequest?: () => void) => {
  if (!jsonString || jsonString.trim() === '') {
    return (
      <div className="bg-white dark:bg-stone-900 rounded-[2rem] p-8 text-center border border-stone-200 dark:border-stone-800">
        <p className="text-stone-500 dark:text-stone-400">No analysis results available. Please try again.</p>
      </div>
    );
  }

  try {
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    const cleanedString = jsonMatch ? jsonMatch[0] : jsonString;
    const data = JSON.parse(cleanedString);
    
    if (data.error && data.error.trim() !== '') {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-8 rounded-[2rem] border border-red-200 dark:border-red-800 text-center shadow-sm">
          <AlertTriangle className="w-16 h-16 mx-auto mb-6 opacity-80" />
          <h3 className="text-xl font-black uppercase font-display mb-4">Analysis Error</h3>
          <p className="text-base font-medium leading-relaxed mb-8">{data.error}</p>
          {onUploadRequest && (
            <button
              onClick={onUploadRequest}
              className="bg-red-600 text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm hover:bg-red-700 transition-all shadow-lg hover:-translate-y-1 active:translate-y-0 flex items-center justify-center mx-auto gap-3"
            >
              <Camera className="w-5 h-5" />
              Upload Picture
            </button>
          )}
        </div>
      );
    }
    
    // Ensure score is valid uppercase A-E
    const rawScore = data.score ? String(data.score).toUpperCase().trim() : 'C';
    const score = (['A', 'B', 'C', 'D', 'E'].includes(rawScore) ? rawScore : 'C') as 'A' | 'B' | 'C' | 'D' | 'E';
    
    const scores = ['A', 'B', 'C', 'D', 'E'];
    const colors = {
      A: 'bg-[#038141]',
      B: 'bg-[#85BB2F]',
      C: 'bg-[#FECB02]',
      D: 'bg-[#EE8100]',
      E: 'bg-[#E63E11]'
    };
    const shadowColors = {
      A: 'shadow-[#038141]/40',
      B: 'shadow-[#85BB2F]/40',
      C: 'shadow-[#FECB02]/40',
      D: 'shadow-[#EE8100]/40',
      E: 'shadow-[#E63E11]/40'
    };
    const explanations = {
      A: 'Healthy',
      B: 'Good',
      C: 'Fair',
      D: 'Poor',
      E: 'Bad'
    };

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-stone-900 rounded-[2rem] p-6 sm:p-8 shadow-sm border border-stone-200 dark:border-stone-800 relative overflow-hidden">
          {/* Subtle background glow based on score */}
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-md ${colors[score]} opacity-5 blur-[100px] pointer-events-none`} />
          
          <h3 className="text-xl font-black uppercase font-display mb-8 text-center text-stone-900 dark:text-stone-100 relative z-10">Poshan Score</h3>
          
          <div className="flex items-end justify-center gap-1 sm:gap-2 mb-10 relative z-10 h-40">
            {scores.map((s, index) => {
              const isActive = s === score;
              return (
                <motion.div 
                  key={s}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ 
                    opacity: isActive ? 1 : 0.35, 
                    y: 0,
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{ 
                    duration: 0.5,
                    ease: "easeOut",
                    delay: index * 0.08 
                  }}
                  className={`flex flex-col items-center justify-center font-black text-white rounded-xl sm:rounded-2xl origin-bottom ${colors[s as keyof typeof colors]} ${isActive ? `w-16 h-28 sm:w-24 sm:h-36 shadow-2xl ${shadowColors[s as keyof typeof shadowColors]} z-20 border-2 border-white/20 dark:border-white/10` : 'w-12 h-20 sm:w-16 sm:h-24 z-10'}`}
                >
                  <span className="text-2xl sm:text-4xl">{s}</span>
                  <span className={`text-[7px] sm:text-[9px] uppercase tracking-tighter mt-1 font-bold ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                    {explanations[s as keyof typeof explanations]}
                  </span>
                </motion.div>
              );
            })}
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="prose prose-stone dark:prose-invert max-w-none relative z-10 bg-stone-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-stone-100 dark:border-stone-800"
          >
            <h4 className="uppercase font-bold tracking-widest text-sm text-stone-500 mb-2 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${colors[score]}`} />
              Why this score?
            </h4>
            <p className="text-stone-900 dark:text-stone-100 m-0 leading-relaxed font-medium">{data.reasoning}</p>
            {data.disclaimer && (
              <p className="text-stone-500 dark:text-stone-400 mt-4 text-sm italic border-t border-stone-200 dark:border-stone-700 pt-4">
                {data.disclaimer}
              </p>
            )}
          </motion.div>
        </div>

        {data.badIngredients && (
          <motion.details 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="group bg-white dark:bg-stone-900 rounded-[2rem] shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden mb-6"
          >
            <summary className="p-6 sm:p-8 font-black uppercase font-display cursor-pointer list-none flex justify-between items-center hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors text-stone-900 dark:text-stone-100">
              <span className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
                  <ChevronDown className="w-5 h-5 -rotate-90 group-open:rotate-0 transition-transform" />
                </span>
                Bad Ingredients
              </span>
            </summary>
            <div className="p-6 sm:p-8 pt-0 border-t border-stone-100 dark:border-stone-800 prose prose-stone dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:mb-6 prose-li:mb-2 prose-ul:mb-6 prose-ol:mb-6 prose-headings:font-display prose-headings:uppercase prose-a:text-rose-600 dark:prose-a:text-rose-400 prose-strong:text-rose-700 dark:prose-strong:text-rose-400 prose-strong:font-black prose-em:text-stone-500 dark:prose-em:text-stone-400">
              <Markdown remarkPlugins={[remarkGfm]}>{data.badIngredients}</Markdown>
            </div>
          </motion.details>
        )}

        {data.alternatives && (
          <motion.details 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="group bg-white dark:bg-stone-900 rounded-[2rem] shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden"
          >
            <summary className="p-6 sm:p-8 font-black uppercase font-display cursor-pointer list-none flex justify-between items-center hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors text-stone-900 dark:text-stone-100">
              <span className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                  <ChevronDown className="w-5 h-5 -rotate-90 group-open:rotate-0 transition-transform" />
                </span>
                Healthier Alternatives
              </span>
            </summary>
            <div className="p-6 sm:p-8 pt-0 border-t border-stone-100 dark:border-stone-800 prose prose-stone dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:mb-6 prose-li:mb-2 prose-ul:mb-6 prose-ol:mb-6 prose-headings:font-display prose-headings:uppercase prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-strong:text-emerald-700 dark:prose-strong:text-emerald-400 prose-strong:font-black prose-em:text-stone-500 dark:prose-em:text-stone-400">
              <Markdown remarkPlugins={[remarkGfm]}>{data.alternatives}</Markdown>
            </div>
          </motion.details>
        )}
      </div>
    );
  } catch (e) {
    return (
      <div className="bg-white dark:bg-stone-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-stone-200 dark:border-stone-800 p-6 sm:p-8 md:p-12 prose prose-stone dark:prose-invert max-w-none">
        <Markdown remarkPlugins={[remarkGfm]}>{jsonString}</Markdown>
      </div>
    );
  }
};

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise.then(value => {
      clearTimeout(timer);
      resolve(value);
    }).catch(reason => {
      clearTimeout(timer);
      reject(reason);
    });
  });
};

export default function ModuleView({ moduleId, onBack }: { moduleId: string; onBack: () => void }) {
  const { profile } = useProfile();
  const { language, t } = useLanguage();
  const moduleInfo = modules.find((m) => m.id === moduleId);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [scanMode, setScanMode] = useState<'camera' | 'gallery'>('camera');

  const heightInMeters = Number(profile?.height || 0) / 100;
  const weightInKg = Number(profile?.weight || 0);
  const bmi = heightInMeters > 0 ? (weightInKg / (heightInMeters * heightInMeters)).toFixed(1) : 'N/A';
  
  let bmiCategory = 'N/A';
  if (bmi !== 'N/A') {
    const bmiNum = Number(bmi);
    if (bmiNum < 18.5) bmiCategory = 'Underweight';
    else if (bmiNum < 24.9) bmiCategory = 'Normal weight';
    else if (bmiNum < 29.9) bmiCategory = 'Overweight';
    else bmiCategory = 'Obese';
  }

  const systemInstruction = `You are Poshan Saathi, an expert Nepali nutritionist.
CRITICAL INSTRUCTION: You MUST strictly personalize your analysis and recommendations based on the user's specific profile (age, weight, budget, disease history, symptoms). You already have their profile information (age, weight, budget, medical history, etc.). You are STRICTLY FORBIDDEN from asking the user for these details again. Use the provided data immediately to personalize your response.
- MEDICAL BOUNDARIES: Use your expert medical reasoning to identify when a symptom or disease is likely NOT primarily nutrition-related. This includes but is not limited to congenital, hereditary, traumatic (accidents), infectious, environmental, or idiopathic causes (e.g., AVM, DVT, viral infections, structural issues). If a condition is likely non-nutritional, explicitly explain your reasoning for this conclusion based on medical facts. You MUST provide evidence-based, factual information and avoid any hallucinations or speculative claims. Focus your advice on how nutrition can support overall resilience or recovery, rather than suggesting it as the root cause or a primary cure. 
- MANDATORY DISCLAIMER: Whenever you discuss medical conditions or symptoms, you MUST include a brief, clear disclaimer: "*Disclaimer: Poshan Saathi provides nutritional guidance based on evidence-based data. It is not a substitute for professional medical diagnosis or treatment. Always consult a healthcare provider for medical concerns.*"
CRITICAL REQUIREMENT: The user has explicitly selected ${language === 'ne' ? 'Nepali' : 'English'} as their preferred language. You MUST write your ENTIRE response in ${language === 'ne' ? 'highly natural, fluent, and idiomatic Nepali (Devanagari script). Avoid stiff, robotic, or literal translations from English. Use everyday Nepali phrasing that a local expert would naturally speak' : 'English'}. Do NOT reply in any other language. Translate all medical and nutritional terms to ${language === 'ne' ? 'Nepali' : 'English'} where possible.
- Never give generic advice. 
- If they have a low budget, only suggest affordable local foods.
- If they have a medical condition, explicitly state how your food recommendation affects that condition.
- If the user is pregnant or breastfeeding, you MUST prioritize nutritional advice that supports maternal and fetal/infant health (e.g., increased iron, folate, calcium, protein, and hydration) and explicitly mention how your recommendations help during this stage.
- NOTE ON PRICES: Provide the most accurate and up-to-date retail prices for Nepal (NPR) based on the 'Reference Nepali Food Data' and your internal knowledge. Always mention that prices are estimates and may vary by location and market conditions. Accuracy is critical.
- CRITICAL INSTRUCTION ON MACROS: You MUST strictly use the exact macronutrient values (calories, protein, carbs, fat, iron, etc.) provided in the 'Reference Nepali Food Data'. If a food is not in the database, you are strictly forbidden from making up numbers. You must provide reliable, evidence-based nutritional data specific to Nepali cuisine and standard preparation methods. DO NOT mention that the item is "not in the primary database" or missing from the list. Instead, simply provide the factual data and add a brief disclaimer: "*Note: Nutritional values for this item are evidence-based estimates based on standard Nepali recipes.*"
- FORMATTING: When providing lists (like ingredients, steps, or alternatives), YOU MUST USE A NEW LINE FOR EACH POINT. Make the main item/ingredient **bold**, followed by a non-bold explanation (e.g., \\n1. **Item Name:** Explanation...). Do not put multiple numbered points on the same line.
- COMPLEX INGREDIENTS & MSG: When discussing packaged foods, mention complex ingredients, artificial food colors, and preservatives, and explicitly explain their potential health effects. Note: For MSG (E621) and similar flavor enhancers, clarify that they occur naturally in some foods but can cause symptoms in sensitive individuals or when consumed in high amounts.
- CULTURALLY RELEVANT MEASUREMENTS: Use common Nepali household measurements like "kachaura" or "katori" (bowl), "muthi" (handful), and "mana" alongside metric values (grams/ml) in brackets, e.g., "1 mana (approx. 500g)". Be realistic with portion sizes (e.g., 1 mana of buckwheat is too much for one meal, 1 kachaura of mustard is too much). Ensure portions are practical for a single meal.
- PLATE BALANCE FOCUS: Emphasize the traditional Nepali plate balance. Specifically suggest reducing the amount of white rice (Bhat) in daily meals and replacing it with more vegetables (Saag/Tarkari), lentils (Dal/Gahat), or whole grains (like Dhindo, Phapar, or Millet) to improve the glycemic index and overall nutrient density.
- INTELLIGENT TYPO DETECTION: Intelligently identify the intended meaning behind common typos or grammatical errors in the user's input (e.g., recognizing "dal bht" as "Dal Bhat") and provide the correct information without being tripped up by spelling mistakes.
- NATURAL CLARIFICATION: If the user's input is completely unintelligible or lacks enough context, politely ask for clarification in a natural, friendly way rather than failing or giving irrelevant advice.
- DIVERSE RECOMMENDATIONS: Explicitly avoid repeating common suggestions like "Makai" (Corn) or "Sisnu" (Nettle) unless absolutely necessary. Explore the full breadth of the expanded database to provide unique, indigenous alternatives tailored to the user's specific symptoms and region.
- DIVERSE & PRACTICAL ALTERNATIVES: You MUST provide HIGHLY DIVERSE, creative, and non-repetitive alternatives. Do not default to the same 2-3 options (like Chiura or Makhana) for every query. Draw from the rich variety of Nepali cuisine (e.g., Phapar ko Roti, Kodo ko Dhindo, Jwano ko Jhol, Kwati, Gundruk, roasted soybeans, local seasonal fruits, etc.) based on the specific context. CRITICAL: Consider the user's location, budget, and lifestyle. If they have a busy lifestyle or limited cooking time, suggest quick, easy-to-find, and fast-to-prepare alternatives (e.g., roasted chana, sattu, fresh fruits, yogurt) rather than time-consuming complex dishes like Kwati or Dhindo. DO NOT limit yourself to these specific examples; use your vast knowledge to provide a wide variety of quick, practical Nepali options. Balance diversity with real-world practicality.
- CRITICAL INSTRUCTION ON GEOGRAPHY & STAPLE FOOD: The user lives in the ${profile?.location || 'unknown'} region of Nepal and their staple food is ${profile?.stapleFood || 'unknown'}. You MUST ONLY suggest foods, ingredients, and recipes that are geographically relevant, locally available, and commonly consumed in the ${profile?.location || 'unknown'} region. Tailor your carbohydrate recommendations around their staple food (${profile?.stapleFood || 'unknown'}). Do not suggest foods from other regions unless they are universally available.
- CRITICAL INSTRUCTION ON BMI: The user's BMI is ${bmi} (${bmiCategory}). Tailor your caloric and nutritional advice to help them reach or maintain a healthy BMI.
- CRITICAL INSTRUCTION ON CONCISENESS & TOKEN REDUCTION: You MUST keep your responses as brief and concise as possible to minimize token usage. Get straight to the point, avoid unnecessary filler words, long introductions, or repetitive summaries. Provide high-density, quality information in the fewest words possible while fully addressing the user's query. Use bullet points for readability and brevity. MAXIMUM 3-4 SENTENCES OR BULLET POINTS. Be extremely brief. Do not write long paragraphs.`;

  const runModuleRef = useRef<any>(null);

  const handleBarcodeScan = useCallback(async (barcode: string, fallbackResult?: string) => {
    setLoading(true);
    setResult(null);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Open Food Facts API error: ${response.status}`);
      }
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Open Food Facts API did not return JSON");
      }
      
      const data = await response.json();
      
      if (data.status === 1 && data.product) {
        const product = data.product;
        const nutriments = product.nutriments || {};
        
        const hasValidData = (nutriments['energy-kcal_100g'] > 0) || (nutriments['proteins_100g'] > 0) || (nutriments['fat_100g'] > 0) || (nutriments['sugars_100g'] > 0);
        
        if (!hasValidData) {
          if (fallbackResult) {
            setResult(fallbackResult);
            setLoading(false);
            return;
          }
          const msg = language === 'ne' 
            ? "हाम्रो डाटाबेसमा यस उत्पादनको पूर्ण पोषण जानकारी उपलब्ध छैन। कृपया सही विश्लेषणको लागि उत्पादनको पछाडि रहेको 'पोषण तथ्य (Nutrition Facts)' र 'सामग्री (Ingredients)' को स्पष्ट फोटो खिचेर अपलोड गर्नुहोस्।"
            : "We couldn't find complete nutritional data for this product in the public database. For an accurate analysis, please take a clear picture of the 'Nutrition Facts' label and 'Ingredients' list on the back of the package.";
          
          setResult(JSON.stringify({
            score: "?",
            reasoning: "",
            badIngredients: "",
            disclaimer: "",
            alternatives: "",
            error: msg
          }));
          setLoading(false);
          return;
        }
        
        const calculatedScore = calculateNutriScore({
          energyKcal: nutriments['energy-kcal_100g'] || 0,
          sugars: nutriments['sugars_100g'] || 0,
          saturatedFat: nutriments['saturated-fat_100g'] || 0,
          sodium: (nutriments['sodium_100g'] || (nutriments['salt_100g'] ? nutriments['salt_100g'] / 2.5 : 0)) * 1000, // convert g to mg
          fruitsVegetablesNuts: nutriments['fruits-vegetables-nuts_100g'] || 0,
          fiber: nutriments['fiber_100g'] || 0,
          proteins: nutriments['proteins_100g'] || 0,
          isBeverage: product.categories_tags?.includes('en:beverages') || false,
          isCheese: product.categories_tags?.includes('en:cheeses') || false,
          isAddedFat: product.categories_tags?.includes('en:fats') || false,
        });
        
        const prompt = `You are a nutrition expert. I have calculated the official European Nutri-Score for the following packaged food based on its exact nutritional values from its barcode.
        
        Product Name: ${product.product_name || 'Unknown Product'}
        Ingredients: ${product.ingredients_text || 'Not provided'}
        Nutritional Values (per 100g from database):
        - Energy: ${nutriments['energy-kcal_100g'] || 0} kcal
        - Fat: ${nutriments['fat_100g'] || 0} g
        - Saturated Fat: ${nutriments['saturated-fat_100g'] || 0} g
        - Sugars: ${nutriments['sugars_100g'] || 0} g
        - Proteins: ${nutriments['proteins_100g'] || 0} g
        - Fiber: ${nutriments['fiber_100g'] || 0} g
        - Sodium: ${nutriments['sodium_100g'] || (nutriments['salt_100g'] ? nutriments['salt_100g'] / 2.5 : 0)} g
        
        The calculated official Nutri-Score is: ${calculatedScore}
        
        ${profile ? `User Profile: Age ${profile.age}, Weight ${profile.weight}kg, Height ${profile.height}cm, BMI ${bmi} (${bmiCategory}), Location ${profile.location}, Staple Food ${profile.stapleFood}, Symptoms: ${profile.symptoms}` : ''}
        
        You MUST write your ENTIRE response in highly natural, fluent, and idiomatic Nepali. Avoid stiff, robotic, or literal translations from English. Use everyday Nepali phrasing that a local expert would naturally speak.
        
        You MUST return your response as a valid JSON object with the following structure:
        {
          "score": "${calculatedScore}",
          "reasoning": "A brief explanation in Nepali of why this score was given based on the positive (fiber, protein) and negative (sugar, sodium, saturated fat) values.",
          "badIngredients": "A markdown formatted string in Nepali listing the harmful or unhealthy ingredients found in this product using a numbered list. YOU MUST USE A NEW LINE FOR EACH POINT (e.g., \\n1. **Ingredient Name:** Explanation...). Make the ingredient name **bold** and the explanation non-bold. Mention complex ingredients, artificial food colors, and preservatives, and explicitly explain their potential health effects. Note: For MSG (E621) and similar flavor enhancers, clarify that they occur naturally in some foods but can cause symptoms in sensitive individuals or when consumed in high amounts. If there are no bad ingredients, this can be an empty string.",
          "disclaimer": "A short disclaimer in Nepali stating that this is an AI-estimated score and may not be 100% accurate, and any other relevant medical disclaimers.",
          "alternatives": "A markdown formatted string in Nepali suggesting 2-3 healthier, culturally relevant Nepali alternatives using a numbered list. YOU MUST USE A NEW LINE FOR EACH POINT (e.g., \\n1. **Alternative Name:** Explanation...). Make the alternative name **bold** and the explanation non-bold. (only if score is C, D, or E). If score is A or B, this can be an empty string. IMPORTANT: Suggest complete, balanced meals or snacks (e.g., 'Chiura with Dahi and fruits', 'Roasted Makhana with nuts'). DO NOT suggest isolated generic ingredients like just 'Chiura' or 'Bhatmaas' alone. Provide HIGHLY DIVERSE, creative, and non-repetitive alternatives.",
          "error": ""
        }
        
        Do not provide any extra tips. Keep it strictly to the score, the reasoning, the bad ingredients, alternatives, and error. Do not include any other text outside the JSON object. Do not use markdown code blocks for the JSON. Just output the raw JSON string.`;

        const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
        let aiResponse;
        try {
          aiResponse = await withTimeout(ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: prompt,
            config: { 
              temperature: 0,
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.STRING, description: "A, B, C, D, or E" },
                  reasoning: { type: Type.STRING, description: "A brief explanation of why this score was given." },
                  badIngredients: { type: Type.STRING, description: "A markdown formatted string explaining the harmful or unhealthy ingredients." },
                  disclaimer: { type: Type.STRING, description: "A short disclaimer stating that this is an AI-estimated score." },
                  alternatives: { type: Type.STRING, description: "A markdown formatted string suggesting 2-3 healthier alternatives." },
                  error: { type: Type.STRING, description: "Error message if the image is invalid (not a barcode/label). Empty if valid." }
                },
                required: ['score', 'reasoning', 'badIngredients', 'disclaimer', 'alternatives', 'error']
              }
            }
          }), 60000);
        } catch (e) {
          console.warn("First Gemini attempt failed in handleBarcodeScan, retrying...", e);
          aiResponse = await withTimeout(ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: prompt,
            config: { 
              temperature: 0,
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.STRING, description: "A, B, C, D, or E" },
                  reasoning: { type: Type.STRING, description: "A brief explanation of why this score was given." },
                  badIngredients: { type: Type.STRING, description: "A markdown formatted string explaining the harmful or unhealthy ingredients." },
                  disclaimer: { type: Type.STRING, description: "A short disclaimer stating that this is an AI-estimated score." },
                  alternatives: { type: Type.STRING, description: "A markdown formatted string suggesting 2-3 healthier alternatives." },
                  error: { type: Type.STRING, description: "Error message if the image is invalid (not a barcode/label). Empty if valid." }
                },
                required: ['score', 'reasoning', 'badIngredients', 'disclaimer', 'alternatives', 'error']
              }
            }
          }), 60000);
        }
        
        if (aiResponse) {
          setResult(aiResponse.text || 'Error: AI returned an empty response.');
        } else {
          throw new Error('AI response was undefined after retries.');
        }
        hapticSuccess();
      } else {
        if (fallbackResult) {
          setResult(fallbackResult);
          setLoading(false);
          return;
        }
        const msg = language === 'ne' 
          ? "यो बारकोड हाम्रो डाटाबेसमा फेला परेन। कृपया सही विश्लेषणको लागि उत्पादनको पछाडि रहेको 'पोषण तथ्य (Nutrition Facts)' र 'सामग्री (Ingredients)' को स्पष्ट फोटो खिचेर अपलोड गर्नुहोस्।"
          : "This barcode was not found in the public database. For an accurate analysis, please take a clear picture of the 'Nutrition Facts' label and 'Ingredients' list on the back of the package.";
        
        setResult(JSON.stringify({
          score: "?",
          reasoning: "",
          badIngredients: "",
          disclaimer: "",
          alternatives: "",
          error: msg
        }));
        setLoading(false);
        return;
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.message === 'TIMEOUT') {
        console.warn('Barcode scan timed out.');
      } else {
        console.error('Barcode scan error:', error.message || error);
      }
      
      if (fallbackResult) {
        setResult(fallbackResult);
        setLoading(false);
        return;
      }
      
      const msg = language === 'ne' 
        ? "बारकोड स्क्यान गर्दा समस्या भयो वा डाटाबेसमा फेला परेन। कृपया सही विश्लेषणको लागि उत्पादनको पछाडि रहेको 'पोषण तथ्य (Nutrition Facts)' र 'सामग्री (Ingredients)' को स्पष्ट फोटो खिचेर अपलोड गर्नुहोस्।"
        : "There was an issue scanning the barcode or it was not found in the database. For an accurate analysis, please take a clear picture of the 'Nutrition Facts' label and 'Ingredients' list on the back of the package.";
      
      setResult(JSON.stringify({
        score: "?",
        reasoning: "",
        badIngredients: "",
        disclaimer: "",
        alternatives: "",
        error: msg
      }));
    } finally {
      setLoading(false);
    }
  }, [profile, systemInstruction, bmi, bmiCategory, language]);

  const runModule = useCallback(async (customInput?: string, skipBarcodeIntercept = false) => {
    if (loading && !skipBarcodeIntercept) return;
    hapticLight();
    const isFollowUp = (!!customInput && !skipBarcodeIntercept) || (!!input && !!result);
    const currentInput = customInput || input;
    
    if (moduleId === 'nutri-score' && !image && !skipBarcodeIntercept && /^\d{8,14}$/.test(currentInput.trim())) {
      handleBarcodeScan(currentInput.trim());
      return;
    }
    
    if (isFollowUp) {
      setMessages(prev => [...prev, { role: 'user', text: currentInput }]);
      setInput('');
    }
    
    setLoading(true);
    if (!isFollowUp) setResult(null);

    try {
      const foodDbContext = `Reference Nepali Food Data:
${nepaliFoodDatabase.map(f => `- ${f.name} (${f.localName}): ${f.calories}kcal, ${f.protein}g pro, ${f.carbs}g carb, ${f.fat}g fat, ${f.iron}mg iron, Rs.${f.price}`).join('\n')}`;

      const profileContext = `User Profile:
Name: ${profile?.name}
Age: ${profile?.age}
Sex: ${profile?.sex}
Height: ${profile?.height} cm
Weight: ${profile?.weight} kg
BMI: ${bmi} (${bmiCategory})
Location (Region/District): ${profile?.location}
Staple Food (Main Cereal): ${profile?.stapleFood}
Pregnancy/Breastfeeding: ${profile?.pregnancyStatus}
Disease History: ${profile?.diseaseHistory}
Substance Abuse: ${profile?.substanceAbuse?.join(', ')}
Diet Type: ${profile?.dietType}
Diet Frequency: ${profile?.dietFrequency}
Cooking Utensil: ${profile?.cookingUtensil}
Symptoms: ${profile?.symptoms}
Budget: ${profile?.budget} NPR/month for a household of ${profile?.familySize || 1} people (approx ${Math.round(Number(profile?.budget) / Number(profile?.familySize || 1))} NPR/person/month)
Income: ${profile?.income}`;

      if (moduleId === 'plate-recognition' && !image && !isFollowUp) {
        setResult("Please upload an image first.");
        setLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });
      let prompt = '';
      let parts: any[] = [];
      const fullProfileContext = `${profileContext}\n\n${foodDbContext}`;

      if (isFollowUp) {
        const history = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
        prompt = `This is a follow-up question in the "${moduleInfo?.title}" module.
        
        Context:
        ${fullProfileContext}
        
        Previous Conversation:
        ${history}
        ${result ? `Assistant's Initial Advice: ${result}` : ''}
        
        User's Follow-up: "${currentInput}"
        
        Provide a helpful, personalized response maintaining the persona of Poshan Saathi. Keep it concise but informative.`;
        parts = [{ text: prompt }];
      } else {
        switch (moduleId) {
          case 'deficiency':
            prompt = `Analyze the user's symptoms and profile to identify potential micronutrient deficiencies (Iron, Vit A, Iodine, Zinc, B12, Calcium, etc.).
            
            ${fullProfileContext}
            
            Provide a highly personalized, unique, and in-depth analysis. DO NOT use a generic template or give similar responses to every user. Tailor every sentence to their specific profile (age, sex, location, symptoms, budget).
            
            1. **Potential Deficiencies & Detailed Clinical Reasoning**: List likely gaps based on their specific symptoms ("${profile?.symptoms}"), diet type, and location. Provide DETAILED clinical reasoning explaining the physiological link between their specific symptoms and the suspected deficiencies. Explain why their current diet or location in Nepal might be causing this (e.g., lack of iodized salt in remote areas, phytate-heavy diets blocking iron, specific regional dietary habits).
            2. **Diverse Food-Based Solutions**: Recommend 3-5 specific, highly diverse Nepali foods spanning different regions (Terai, Hills, Mountains) and ethnic groups (Newari, Tharu, Sherpa, etc.). 
               - IMPORTANT: Suggest complete, balanced meals or combinations (e.g., 'Chiura with Dahi and fruits', 'Bhatmaas sadheko with mixed salad'). DO NOT suggest isolated generic ingredients like just 'Chiura' or 'Bhatmaas' alone.
               - You MUST provide the EXACT, factually correct macronutrient and micronutrient values for these foods based ONLY on the provided 'Reference Nepali Food Data'. 
               - If a food is not in the database, you are strictly forbidden from making up numbers. You must provide reliable, evidence-based nutritional data specific to Nepali cuisine and standard preparation methods. DO NOT mention that the item is "not in the primary database" or missing from the list. Instead, simply provide the factual data and add a brief disclaimer: "*Note: Nutritional values for this item are evidence-based estimates based on standard Nepali recipes.*"
               - For prices, provide the latest price from the database and explicitly mention: "*Note: Prices are estimates and may vary based on location and market conditions.*" Provide the most accurate prices possible.
            3. **Practical Nepali Fixes**: Actionable advice for their specific cooking setup (${profile?.cookingUtensil}) and budget (${profile?.budget} NPR/month).
            Format as Markdown with bold headers. ALWAYS include any medical disclaimers at the very end of your response, formatted in *italics*.`;
            parts = [{ text: prompt }];
            break;
          case 'meal-planner':
            prompt = `Create a 3-day budget-friendly meal plan.
            
            ${fullProfileContext}
            
            Constraints:
            - Budget: ${profile?.budget} NPR/month for a household of ${profile?.familySize || 1} people (approx ${Math.round(Number(profile?.budget) / Number(profile?.familySize || 1))} NPR/person/month).
            - Location: ${profile?.location}.
            - Diet: ${profile?.dietType}.
            
            Include:
            - Breakfast, Lunch, Snack, Dinner.
            - Use highly diverse local names and dishes from various Nepali ethnic groups and regions.
            - IMPORTANT: Suggest complete, balanced meals. DO NOT suggest isolated generic ingredients like just 'Chiura' or 'Bhatmaas' alone. Combine them into proper dishes.
            - Use common Nepali household measurements like "kachaura" or "katori" (bowl), "muthi" (handful), and "mana" alongside metric values.
            - Focus on nutrient density to address symptoms: "${profile?.symptoms}".
            - Provide exact, factually correct macronutrient values for each meal.
            - Use Google Search to find the latest 2025/2026 retail prices in Nepal for the items mentioned to ensure the plan is truly within the user's budget. Accuracy is critical.
            
            Format as a Markdown table. ALWAYS include any medical disclaimers at the very end of your response, formatted in *italics*.`;
            parts = [{ text: prompt }];
            break;
          case 'food-lookup':
            prompt = `The user is looking up: "${currentInput}".
            
            ${foodDbContext}
            
            Provide:
            1. **Nutritional Profile**: Exact, factually correct macros, micronutrients, and sodium (in teaspoons of salt). Do not use approximate values.
            2. **NCD Risk Assessment**: How this food impacts long-term health (Diabetes, Hypertension).
            3. **Healthy Nepali Alternatives**: Suggest 3 better, highly diverse local options from various regions. IMPORTANT: Suggest complete, balanced meals or combinations (e.g., 'Chiura with Dahi and fruits'). DO NOT suggest isolated generic ingredients like just 'Chiura' or 'Bhatmaas' alone.
            Format as Markdown. ALWAYS include any medical disclaimers at the very end of your response, formatted in *italics*.`;
            parts = [{ text: prompt }];
            break;
          case 'absorption':
            prompt = `The user is eating: "${currentInput}".
            
            ${fullProfileContext}
            
            Identify:
            1. **Nutrient Synergies**: What works well together (e.g., Vit C + Iron).
            2. **Nutrient Inhibitors**: What blocks absorption (e.g., Tannins in tea, Phytates in grains).
            3. **The "Nepali Fix"**: Simple traditional methods to improve absorption (e.g., fermentation, adding lemon).
            Format as Markdown. ALWAYS include any medical disclaimers at the very end of your response, formatted in *italics*.`;
            parts = [{ text: prompt }];
            break;
          case 'superfoods':
            prompt = `
            ${fullProfileContext}
            
            Recommend 5 highly diverse indigenous Nepali superfoods (e.g., Sisnu, Kinema, Gundruk, Phapar, Kaguno, Chhurpi) specifically tailored to the user's symptoms: "${profile?.symptoms}". Ensure choices span different regions and ethnic groups.
            Explain the modern science behind these traditional foods, including exact, factually correct nutritional values.
            Format as Markdown. ALWAYS include any medical disclaimers at the very end of your response, formatted in *italics*.`;
            parts = [{ text: prompt }];
            break;
          case 'budget-meals':
            prompt = `The user consumes: "${currentInput}".
            
            ${fullProfileContext}
            
            1. **Cost-Benefit Analysis**: Compare the cost vs. exact nutritional value of their current choice vs. diverse local staples.
            2. **The "Remittance Trap"**: Explain if they are falling into the trap of expensive processed foods.
            3. **Quantified Alternatives**: Show 3 highly diverse local meals that are cheaper AND healthier, providing exact macronutrient breakdowns. IMPORTANT: Suggest complete, balanced meals. DO NOT suggest isolated generic ingredients like just 'Chiura' or 'Bhatmaas' alone.
            4. **Price Accuracy**: Use Google Search to find the latest 2025/2026 retail prices in Nepal for the items mentioned to provide a more accurate cost analysis.
            
            Format as Markdown. ALWAYS include any medical disclaimers at the very end of your response, formatted in *italics*.`;
            parts = [{ text: prompt }];
            break;
          case 'plate-recognition':
            prompt = `Identify the Nepali dishes in this image.
            
            ${fullProfileContext}
            
            1. **Dish Identification**: (e.g., Dal Bhat, Tarkari, Achar).
            2. **Portion Estimation**: Are the ratios correct for a balanced Nepali plate? Emphasize the traditional Nepali plate balance, specifically analyzing the ratio of rice (Bhat) to vegetables (Saag/Tarkari) and protein (Dal/Gahat). Use measurements like "kachaura", "katori", or "muthi".
            3. **Macro/Micro Analysis**: Provide exact, factually correct macronutrient and micronutrient values. Do not use approximations.
            4. **Improvement**: One simple addition to make this plate perfect, suggesting diverse regional ingredients.
            Format as Markdown. ALWAYS include any medical disclaimers at the very end of your response, formatted in *italics*.`;
            parts = [
              { inlineData: { data: image!.split(',')[1], mimeType: image!.split(';')[0].split(':')[1] } },
              { text: prompt }
            ];
            break;
          case 'seasonal':
            const currentMonth = new Date().toLocaleString('default', { month: 'long' });
            prompt = `Current month: ${currentMonth}.
            
            ${fullProfileContext}
            
            1. **Seasonal Availability**: What's fresh and highly diverse in Nepali markets right now across different regions? Provide all information in English.
            2. **The Hungry Season (Loo/Aausi)**: Is a food shortage period approaching?
            3. **Preservation Tips**: How to store current surplus for later (e.g., Sukuti, Masaura).
            Format as Markdown. ALWAYS include any medical disclaimers at the very end of your response, formatted in *italics*.`;
            parts = [{ text: prompt }];
            break;
          case 'recipes':
            prompt = `Ingredients: "${currentInput}".
            
            ${fullProfileContext}
            
            Suggest 3 unique, highly diverse healthy Nepali recipes spanning different ethnic groups.
            IMPORTANT: Ensure these are complete, balanced recipes. DO NOT suggest isolated generic ingredients like just 'Chiura' or 'Bhatmaas' alone. Combine them into proper dishes.
            For each:
            - Name (Local & English).
            - Nutritional "Why": Why it helps with "${profile?.symptoms}", including exact, factually correct macronutrient values.
            - Instructions: Simple steps.
            Format as Markdown. ALWAYS include any medical disclaimers at the very end of your response, formatted in *italics*.`;
            parts = [{ text: prompt }];
            break;
          case 'nutri-score':
            if (image) {
              prompt = `Analyze the provided image.
              
              ${fullProfileContext}
              
              CRITICAL RESTRICTION: You must ONLY process images that contain EITHER a product barcode OR a nutritional information label (facts table) OR a clear picture of a packaged food product. If the image is completely unrelated (e.g., a person, a car), you MUST reject it.
              
              If the image is REJECTED (completely unrelated):
              Set the "error" field to: "Please upload a clear picture of a barcode, a nutritional information label, or a packaged food product."
              Set "score" to "C" (as a default to satisfy the schema), and leave other fields empty.
              
              If the image is ACCEPTED:
              1. Extract the nutritional values (energy, sugars, saturated fat, sodium/salt, fiber, protein, fruits/veg/nuts) if visible, and calculate the official European Nutri-Score (A to E) based on these values.
              2. If the image contains a barcode, identify the product, estimate its nutritional values (per 100g) based on standard data, and calculate the Nutri-Score.
              3. If it's just a picture of a packaged food, estimate its nutritional values and calculate the Nutri-Score.
              4. IMPORTANT: If you can clearly read the barcode number from the image, you MUST include it in the "barcode" field. If no barcode is visible, leave it empty.
              5. Set the "error" field to an empty string "".
              
              You MUST return your response as a valid JSON object with the following structure:
              {
                "barcode": "The barcode number if visible, otherwise an empty string",
                "score": "A" | "B" | "C" | "D" | "E",
                "reasoning": "A brief explanation of why this score was given based on the positive (fiber, protein) and negative (sugar, sodium, saturated fat) values found or estimated.",
                "badIngredients": "A markdown formatted string in Nepali listing the harmful or unhealthy ingredients found in this product using a numbered list. YOU MUST USE A NEW LINE FOR EACH POINT (e.g., \\n1. **Ingredient Name:** Explanation...). Make the ingredient name **bold** and the explanation non-bold. Mention complex ingredients, artificial food colors, and preservatives, and explicitly explain their potential health effects. Note: For MSG (E621) and similar flavor enhancers, clarify that they occur naturally in some foods but can cause symptoms in sensitive individuals or when consumed in high amounts. If there are no bad ingredients, this can be an empty string.",
                "disclaimer": "A short disclaimer stating that this is an AI-estimated score and may not be 100% accurate, and any other relevant medical disclaimers.",
                "alternatives": "A markdown formatted string suggesting 2-3 healthier, culturally relevant Nepali alternatives using a numbered list. YOU MUST USE A NEW LINE FOR EACH POINT (e.g., \\n1. **Alternative Name:** Explanation...). Make the alternative name **bold** and the explanation non-bold. (only if score is C, D, or E). If score is A or B, this can be an empty string. IMPORTANT: Suggest complete, balanced meals or snacks (e.g., 'Chiura with Dahi and fruits', 'Roasted Makhana with nuts'). DO NOT suggest isolated generic ingredients like just 'Chiura' or 'Bhatmaas' alone. Provide HIGHLY DIVERSE, creative, and non-repetitive alternatives.",
                "error": "Error message if the image is invalid (not a barcode/label). Empty if valid."
              }
              
              Do not provide any extra tips. Keep it strictly to the score, the reasoning, the bad ingredients, alternatives, and error. Do not include any other text outside the JSON object. Do not use markdown code blocks for the JSON. Just output the raw JSON string.`;
              parts = [
                { inlineData: { data: image!.split(',')[1], mimeType: image!.split(';')[0].split(':')[1] } },
                { text: prompt }
              ];
            } else {
              prompt = `Calculate the Nutri-Score (A to E) for the following food: "${currentInput}".
              
              ${foodDbContext}
              ${fullProfileContext}
              
              Estimate the nutritional values (per 100g or standard serving) based on standard recipes or the provided reference data.
              
              You MUST return your response as a valid JSON object with the following structure:
              {
                "barcode": "",
                "score": "A" | "B" | "C" | "D" | "E",
                "reasoning": "A brief explanation of why this score was given based on the estimated positive (fiber, protein) and negative (sugar, sodium, saturated fat) values.",
                "badIngredients": "A markdown formatted string in Nepali listing the harmful or unhealthy ingredients found in this product using a numbered list. YOU MUST USE A NEW LINE FOR EACH POINT (e.g., \\n1. **Ingredient Name:** Explanation...). Make the ingredient name **bold** and the explanation non-bold. Mention complex ingredients, artificial food colors, and preservatives, and explicitly explain their potential health effects. Note: For MSG (E621) and similar flavor enhancers, clarify that they occur naturally in some foods but can cause symptoms in sensitive individuals or when consumed in high amounts. If there are no bad ingredients, this can be an empty string.",
                "disclaimer": "A short disclaimer stating that this is an AI-estimated score and may not be 100% accurate, and any other relevant medical disclaimers.",
                "alternatives": "A markdown formatted string suggesting 2-3 healthier, culturally relevant Nepali alternatives using a numbered list. YOU MUST USE A NEW LINE FOR EACH POINT (e.g., \\n1. **Alternative Name:** Explanation...). Make the alternative name **bold** and the explanation non-bold. (only if score is C, D, or E). If score is A or B, this can be an empty string. Provide HIGHLY DIVERSE, creative, and non-repetitive alternatives.",
                "error": ""
              }
              
              Do not provide any extra tips. Keep it strictly to the score, the reasoning, the bad ingredients, alternatives, and error. Do not include any other text outside the JSON object. Do not use markdown code blocks for the JSON. Just output the raw JSON string.`;
              parts = [{ text: prompt }];
            }
            break;
          default:
            throw new Error('Unknown module');
        }
      }

      const modelName = moduleId === 'nutri-score' ? 'gemini-3.1-pro-preview' : 'gemini-3-flash-preview';
      const config: any = {
        temperature: 0,
        systemInstruction
      };

      if (moduleId === 'nutri-score' && !isFollowUp) {
        config.responseMimeType = 'application/json';
        config.responseSchema = {
          type: Type.OBJECT,
          properties: {
            barcode: { type: Type.STRING, description: "The barcode number if visible, otherwise an empty string." },
            score: { type: Type.STRING, description: "A, B, C, D, or E" },
            reasoning: { type: Type.STRING, description: "A brief explanation of why this score was given." },
            badIngredients: { type: Type.STRING, description: "A markdown formatted string explaining the harmful or unhealthy ingredients." },
            disclaimer: { type: Type.STRING, description: "A short disclaimer stating that this is an AI-estimated score." },
            alternatives: { type: Type.STRING, description: "A markdown formatted string suggesting 2-3 healthier alternatives." },
            error: { type: Type.STRING, description: "Error message if the image is invalid (not a barcode/label). Empty if valid." }
          },
          required: ['barcode', 'score', 'reasoning', 'badIngredients', 'disclaimer', 'alternatives', 'error']
        };
      }

      let fullText = '';

      if (moduleId === 'nutri-score' && !isFollowUp) {
        let response;
        try {
          response = await withTimeout(ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config
          }), 60000);
        } catch (e) {
          console.warn("First Gemini attempt failed in runModule (nutri-score), retrying...", e);
          response = await withTimeout(ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config
          }), 60000);
        }
        if (!response) {
          throw new Error('AI response was undefined after retries.');
        }
        fullText = response.text || '';
        
        try {
          const parsed = JSON.parse(fullText.replace(/```json/g, '').replace(/```/g, '').trim());
          if (parsed.barcode && parsed.barcode.trim() !== '') {
            // We found a barcode! Let's use Open Food Facts instead of the AI's guess.
            // We don't set loading to false here because handleBarcodeScan will manage it.
            await handleBarcodeScan(parsed.barcode.trim(), fullText);
            return;
          }
        } catch (e) {
          // Ignore parse errors here, it will be handled by renderNutriScore
        }
        
        setResult(fullText);
      } else {
        let responseStream;
        try {
          responseStream = await withTimeout(ai.models.generateContentStream({
            model: modelName,
            contents: { parts },
            config
          }), 60000);
        } catch (e) {
          console.warn("First Gemini stream attempt failed in runModule, retrying...", e);
          responseStream = await withTimeout(ai.models.generateContentStream({
            model: modelName,
            contents: { parts },
            config
          }), 60000);
        }

        if (!responseStream) {
          throw new Error('AI response stream was undefined after retries.');
        }

        let isFirstChunk = true;
        
        for await (const chunk of responseStream) {
          if (chunk.text) {
            if (isFirstChunk) {
              if (isFollowUp) {
                setMessages(prev => [...prev, { role: 'model', text: '' }]);
              }
              isFirstChunk = false;
            }
            fullText += chunk.text;
            
            if (isFollowUp) {
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { role: 'model', text: fullText };
                return newMessages;
              });
            } else {
              setResult(fullText);
            }
          }
        }
      }

      if (!fullText) {
        throw new Error('The AI returned an empty response. This might be due to safety filters.');
      }
    } catch (error: any) {
      if (error.message === 'TIMEOUT') {
        console.warn('Module analysis timed out.');
      } else {
        console.error('Module analysis error:', error.message || error);
      }
      
      let userFriendlyMsg = 'I encountered a technical glitch. Please try again in a moment.';
      let showKeySelector = false;
      
      if (error.message?.includes('API key')) {
        userFriendlyMsg = 'AI configuration issue. Please contact support.';
      } else if (error.message?.includes('quota') || error.message?.includes('429')) {
        userFriendlyMsg = 'You have exceeded the free tier quota for the Gemini API. To continue using the app without limits, please select your own paid API key.';
        showKeySelector = true;
      } else if (error.message?.includes('safety') || error.message?.includes('blocked')) {
        userFriendlyMsg = 'Analysis blocked due to safety guidelines.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        userFriendlyMsg = 'Connection issue. Please check your internet.';
      } else if (error.message === 'TIMEOUT') {
        userFriendlyMsg = 'The AI analysis timed out. Please try again with a smaller image or shorter text.';
      }

      const errorContent = (
        <div className="space-y-4">
          <p>{userFriendlyMsg}</p>
          {showKeySelector && (
            <button 
              onClick={async () => {
                if ((window as any).aistudio?.openSelectKey) {
                  await (window as any).aistudio.openSelectKey();
                  toast.success('API Key selection opened. Please select a key and try again.');
                }
              }}
              className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all"
            >
              Select Personal API Key
            </button>
          )}
        </div>
      );

      if (isFollowUp) {
        setMessages(prev => [...prev, { role: 'model', text: `**Analysis Failed**\n\n${userFriendlyMsg}${showKeySelector ? '\n\n*Please use the "Select Personal API Key" button if available.*' : ''}` }]);
      } else {
        setResult(userFriendlyMsg);
      }
      toast.error(userFriendlyMsg);
    } finally {
      setLoading(false);
    }
  }, [moduleId, input, result, messages, image, profile, moduleInfo?.title, loading, handleBarcodeScan, systemInstruction, bmi, bmiCategory]);

  useEffect(() => {
    runModuleRef.current = runModule;
  }, [runModule]);

  // Auto-run for some modules
  useEffect(() => {
    if (['deficiency', 'meal-planner', 'superfoods', 'seasonal'].includes(moduleId)) {
      runModule();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  const handleUploadRequest = () => {
    setResult(null);
    setImage(null);
    setScanMode('gallery');
    document.getElementById('nutri-score-file-upload')?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setImage(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
    // Clear the input so the same file can be selected again
    e.target.value = '';
  };

  const needsInput = ['food-lookup', 'absorption', 'budget-meals', 'recipes', 'nutri-score'].includes(moduleId);
  const needsImage = ['plate-recognition', 'nutri-score'].includes(moduleId);

  const handleReset = () => {
    setResult(null);
    setImage(null);
    setInput('');
    setMessages([]);
    hapticLight();
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col transition-colors relative overflow-x-hidden">
      {/* Blurred Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-emerald-400/10 dark:bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-amber-400/10 dark:bg-amber-900/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }} />

      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-white/70 dark:bg-stone-900/80 backdrop-blur-2xl border-b border-stone-200/60 dark:border-stone-800 sticky top-0 z-20 transition-colors shadow-sm"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center gap-3 sm:gap-6">
          <motion.button 
            whileHover={{ scale: 1.1, x: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { hapticLight(); onBack(); }} 
            className="p-2.5 -ml-3 rounded-xl hover:bg-stone-200/50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/10" 
            title={t('module.back')}
          >
            <ArrowLeft className="w-6 h-6" />
          </motion.button>
          <motion.div 
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl ${moduleInfo?.color} flex items-center justify-center shadow-sm border border-stone-200/50 dark:border-stone-700 shrink-0`}
          >
            {moduleInfo && <moduleInfo.icon className="w-5 h-5 sm:w-6 sm:h-6" />}
          </motion.div>
          <div className="min-w-0 py-1">
            <h1 className="text-lg sm:text-2xl font-black text-stone-900 dark:text-stone-100 font-display uppercase leading-snug">{t(`module.${moduleId}.title`)}</h1>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">{t('module.analysis')}</p>
          </div>
        </div>
      </motion.header>

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 flex flex-col z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div 
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
              e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
            }}
            className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-stone-100 dark:border-stone-800 p-6 sm:p-10 mb-8 sm:mb-10 transition-all hover:shadow-xl group corner-pattern relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 relative z-10">
              <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl ${moduleInfo?.color} flex items-center justify-center shadow-lg shadow-stone-100/50 dark:shadow-none flex-shrink-0 group-hover:scale-110 transition-transform border border-stone-200/50 dark:border-stone-700`}>
                {moduleInfo && <moduleInfo.icon className="w-6 h-6 sm:w-8 sm:h-8" />}
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 mb-2 sm:mb-3 font-display uppercase leading-snug">{t(`module.${moduleId}.title`)}</h2>
                <p className="text-base sm:text-xl text-stone-600 dark:text-stone-400 leading-relaxed font-medium opacity-90">{t(`module.${moduleId}.description`)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {needsInput && !result && (
          <div className="flex flex-col gap-4 mb-8 sm:mb-10">
            <div className="flex gap-2 sm:gap-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  moduleId === 'food-lookup' ? "e.g., Wai Wai noodles, Dal Bhat..." :
                  moduleId === 'absorption' ? "e.g., Spinach and black tea..." :
                  moduleId === 'recipes' ? "e.g., Rice, lentils, potatoes, spinach..." :
                  moduleId === 'nutri-score' ? "e.g., Noodles, Pasta, Biscuit..." :
                  "e.g., 2 packets of instant noodles daily..."
                }
                className="flex-grow p-4 sm:p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 rounded-[1.5rem] sm:rounded-[2rem] focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all text-base sm:text-xl shadow-sm hover:border-stone-300 dark:hover:border-stone-700"
                onKeyDown={(e) => e.key === 'Enter' && runModule()}
              />
              <button
                onClick={() => runModule()}
                disabled={loading || !input.trim()}
                className="bg-emerald-600 text-white px-6 sm:px-10 rounded-[1.5rem] sm:rounded-[2rem] hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center shadow-2xl shadow-emerald-200 dark:shadow-none hover:-translate-y-1 active:translate-y-0 shrink-0"
              >
                {loading ? <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" /> : <Send className="w-6 h-6 sm:w-8 sm:h-8" />}
              </button>
            </div>
          </div>
        )}

        {/* Hidden file input always in DOM for programmatic clicks */}
        <input id="nutri-score-file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />

        {needsImage && !result && (
          <div className="mb-10 space-y-8">
            {moduleId === 'nutri-score' && (
              <div className="flex justify-center gap-4 mb-4">
                <button
                  onClick={() => setScanMode('camera')}
                  className={`px-6 py-3 rounded-full font-bold text-sm transition-all ${scanMode === 'camera' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'}`}
                >
                  Live Scanner
                </button>
                <button
                  onClick={() => setScanMode('gallery')}
                  className={`px-6 py-3 rounded-full font-bold text-sm transition-all ${scanMode === 'gallery' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'}`}
                >
                  Upload Image
                </button>
              </div>
            )}

            {moduleId === 'nutri-score' && scanMode === 'camera' ? (
              <div className="flex flex-col items-center justify-center w-full">
                <BarcodeScanner onScan={handleBarcodeScan} />
                <p className="mt-4 text-sm text-stone-500 text-center">Point your camera at a product barcode to scan it instantly.</p>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <label htmlFor="nutri-score-file-upload" className="flex flex-col items-center justify-center w-full h-96 border-2 border-stone-200 dark:border-stone-800 border-dashed rounded-[3rem] cursor-pointer bg-white dark:bg-stone-900/50 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all group overflow-hidden relative">
                  {image ? (
                    <div className="absolute inset-0 w-full h-full">
                      <Image 
                        src={image} 
                        alt="Uploaded plate" 
                        fill
                        className="object-cover" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <Camera className="w-16 h-16 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div className="w-24 h-24 bg-stone-50 dark:bg-stone-800 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                        <Camera className="w-12 h-12 text-stone-400 dark:text-stone-500" />
                      </div>
                      <p className="mb-2 text-2xl text-stone-900 dark:text-stone-100 font-black uppercase font-display text-center">Upload Barcode or Label</p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 dark:text-stone-600">PNG, JPG or JPEG (MAX. 5MB)</p>
                    </div>
                  )}
                </label>
              </div>
            )}
            
            {!(moduleId === 'nutri-score' && scanMode === 'camera') && (
              <button
                onClick={() => runModule()}
                disabled={loading || !image}
                className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] hover:bg-emerald-700 disabled:opacity-50 transition-all font-black uppercase tracking-widest text-sm flex items-center justify-center shadow-2xl shadow-emerald-200 dark:shadow-none hover:-translate-y-1 active:translate-y-0"
              >
                {loading ? <><Loader2 className="w-8 h-8 animate-spin mr-4" /> {moduleId === 'nutri-score' ? 'Analyzing Image...' : 'Analyzing Plate...'}</> : (moduleId === 'nutri-score' ? 'Analyze Image' : 'Analyze Plate')}
              </button>
            )}
          </div>
        )}

        {loading && !result && !needsInput && !needsImage && (
          <div className="flex flex-col items-center justify-center py-20 sm:py-32 text-stone-400 dark:text-stone-600 px-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 relative flex items-center justify-center mb-6 sm:mb-8">
              <Image 
                src="/logo.png" 
                alt="Poshan Saathi Logo" 
                fill
                priority
                sizes="(max-width: 640px) 80px, 96px"
                className="object-contain animate-pulse" 
                referrerPolicy="no-referrer"
              />
            </div>
            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-emerald-600 mb-4 sm:mb-6" />
            <p className="text-lg sm:text-xl font-bold uppercase font-display text-center">AI is analyzing your profile...</p>
          </div>
        )}

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="space-y-10"
          >
            {moduleId === 'nutri-score' ? (
              renderNutriScore(result, handleUploadRequest)
            ) : (
              <div className="bg-white dark:bg-stone-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-stone-200 dark:border-stone-800 p-6 sm:p-8 md:p-12 prose prose-stone dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:mb-6 prose-li:mb-2 prose-ul:mb-6 prose-ol:mb-6 prose-headings:font-display prose-headings:uppercase prose-headings:text-stone-900 dark:prose-headings:text-stone-100 prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-strong:text-emerald-700 dark:prose-strong:text-emerald-400 prose-strong:font-black prose-em:text-stone-500 dark:prose-em:text-stone-400 transition-all text-sm sm:text-base">
                <Markdown remarkPlugins={[remarkGfm]}>{result}</Markdown>
              </div>
            )}

            {/* Follow-up Chat History */}
            {messages.length > 0 && (
              <div className="space-y-6">
                <AnimatePresence initial={false}>
                  {messages.map((msg, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] p-6 rounded-[2rem] ${
                        msg.role === 'user' 
                          ? 'bg-emerald-600 text-white rounded-tr-sm' 
                          : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 rounded-tl-sm prose prose-stone dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:mb-6 prose-li:mb-2 prose-ul:mb-6 prose-ol:mb-6 prose-headings:font-display prose-headings:uppercase prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-strong:text-emerald-700 dark:prose-strong:text-emerald-400 prose-strong:font-black prose-em:text-stone-500 dark:prose-em:text-stone-400'
                      } shadow-sm`}>
                        <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Follow-up Input */}
            <div className="bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-3 sm:gap-4 mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 shrink-0">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 font-display uppercase">Ask a follow-up question</h3>
              </div>
              <div className="flex gap-2 sm:gap-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask for more details, alternatives, or clarifications..."
                  className="flex-grow p-4 sm:p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all shadow-sm text-sm sm:text-base"
                  onKeyDown={(e) => e.key === 'Enter' && runModule()}
                />
                <button
                  onClick={() => runModule()}
                  disabled={loading || !input.trim()}
                  className="bg-emerald-600 text-white px-6 sm:px-8 rounded-2xl hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center shadow-lg shrink-0"
                >
                  {loading ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : <Send className="w-5 h-5 sm:w-6 sm:h-6" />}
                </button>
              </div>
            </div>

            {/* Reset Button */}
            <div className="flex justify-center mt-8">
              <button
                onClick={handleReset}
                className="bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-6 py-3 rounded-full font-bold text-sm hover:bg-stone-300 dark:hover:bg-stone-700 transition-all flex items-center gap-2 shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                {moduleId === 'nutri-score' ? 'Analyze Another Product' : 'Start New Analysis'}
              </button>
            </div>
          </motion.div>
        )}

        {!loading && !result && !needsInput && !needsImage && (
          <div className="flex flex-col items-center justify-center py-20 text-stone-400 dark:text-stone-600">
            <p className="text-lg font-bold uppercase font-display">No results to display</p>
            <p className="text-xs uppercase tracking-widest mt-2">Try scanning a barcode or uploading an image</p>
          </div>
        )}
      </main>
      
      <ChatCompanion />
    </div>
  );
}
