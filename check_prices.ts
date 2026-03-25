import { GoogleGenAI } from "@google/genai";

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: "Search the web for the latest 2025/2026 retail prices in Nepal (in NPR) for: 1. Wai Wai noodles (standard packet) 2. Current Noodles 3. A plate of Momo (local eatery) 4. 1kg Rice (Sona Mansuli) 5. 1kg Dal (Musuro) 6. Kurkure (standard packet) 7. Lays (standard packet) 8. Chatpate (street food). Provide a concise list of the prices.",
      config: { tools: [{ googleSearch: {} }] }
    });
    console.log(response.text);
  } catch (e) {
    console.error(e);
  }
}
run();
