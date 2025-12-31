import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "./types.ts";

// In-memory cache to reduce redundant API calls
const pitchCache: Record<string, string> = {};

// Static fallback pitches for common products to save quota
const staticPitches: Record<string, string> = {
  "Moos": "Mooskan macaan ee Jannaale waa mid dabiici ah oo aad u bisil. Waa dooq ku habboon qoyskaaga.",
  "Tamaandho": "Tamaandhadan guduudan ee Afgooye waxay saladkaaga ka dhigaysaa mid dhadhan gaar ah leh.",
  "Basal": "Basashan waa mid cusub o beerta si toos ah looga keenay, waxayna udgoon u tay cuntadaada.",
  "Galley": "Galleyda Lower Shabelle waa mid tayo sare leh oo aad u macaan, ku tijaabi cashadaada.",
  "Karooto": "Karooto cusub oo Afgooye laga soo guray, waxtar u leh caafimaadkaaga iyo quruxda cuntada.",
  "Baradho": "Baradhoda Baidoa waa kuwa ugu wanaagsan ee aad ku darsan karto suugada ama shiilidda.",
  "Bamiye": "Bamiyahan yar-yar ee curdinka ah waxay u fiican yihiin caafimaadka caloosha iyo dhadhan fiican.",
  "Girin": "Girintan (Wheat) waa mid lagu soo dhex saaray carada barwaaqada ah ee Jowhar, waa mid dabiici ah.",
  "Digir": "Digirta Baidoa waa mid aad u karsanta, protein badanna laga helo. Waa cuntada dhabta ah ee dhulkeena.",
  "Khayaar": "Khayaarkan cusub ee Afgooye waa mid qaboow oo ku habboon xilliyada kuleylka ee saladka.",
  "Toon": "Toontan urta iyo dhadhanka badan ee Jowhar waa mid dabiici ah oo caafimaadka u fiican.",
  "Liin Dhanaan": "Liin dhanaantan Jannaale waa mid biyo badan oo u roon cabitaannada iyo cuntada.",
  "Liin Macaan": "Liin macaantan Afgooye waa mid aad u macaan o fitamiin C badan laga helo.",
  "Sisin": "Sisidda tayada leh ee laga soo guray Middle Shabelle waa mid saliid badan oo caafimaad leh.",
  "Canab": "Canabkan macaan ee ka yimid gobolka Sool waa mid aad u macaan oo cusub.",
  "Xabxab": "Xabxabkan macaan oo biyo badan ee Lower Shabelle waa midka ugu wanaagsan xilliga kuleylka.",
  "Canbe": "Canbehan macaanka badan ee Afgooye waa mid dabiici ah oo fitamiinno badan laga helo. Waa dooq dhab ah!",
  "Tufaax": "Tufaaxan cas ee macaanka badan waa mid aad u caafimaad badan, kana yimid dhul barwaaqo ah. Ku raaxayso dhadhanka!",
};

/**
 * Generates a short marketing pitch for a product.
 */
export const getAIPitch = async (productName: string, location: string): Promise<string> => {
  const cacheKey = `${productName}-${location}`;
  
  if (pitchCache[cacheKey]) return pitchCache[cacheKey];

  if (staticPitches[productName]) {
    pitchCache[cacheKey] = staticPitches[productName];
    return staticPitches[productName];
  }

  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [{
          text: `Write a 2-sentence marketing pitch in Somali language for selling ${productName} from the ${location} region of Somalia. Make it sound fresh and authentic. Focus on quality and local heritage.`
        }]
      }
    });
    
    const result = response.text || "Dalag cusub oo beerta laga keenay, tayo sare leh.";
    pitchCache[cacheKey] = result;
    return result;
  } catch (error: any) {
    console.warn("AI Pitch generation failed:", error?.message);
    return `Dalaggan ${productName} ee ka yimid ${location} waa mid aad u tayo sarreeya oo caafimaad leh.`;
  }
};

/**
 * Finds matching products based on user natural language needs.
 */
export const findProductsForNeeds = async (userInput: string, products: Product[]): Promise<string[]> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    const productListString = products.map(p => `${p.id}: ${p.name} (${p.category})`).join(', ');
    
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [{
          text: `User needs: "${userInput}". 
          Available products: [${productListString}]. 
          Task: Return a JSON array of strings containing ONLY the product IDs that best match the user's request. If none match, return an empty array [].`
        }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    let text = (response.text || "[]").trim();
    
    // Clean potential markdown wrappers
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try {
      const result = JSON.parse(text);
      return Array.isArray(result) ? result : [];
    } catch (e) {
      console.warn("AI returned invalid JSON, falling back to empty array. Response was:", text);
      return [];
    }
  } catch (error) {
    console.error("AI Match Error:", error);
    const query = userInput.toLowerCase();
    return products
      .filter(p => p.name.toLowerCase().includes(query) || p.nameEn.toLowerCase().includes(query) || p.category.toLowerCase().includes(query))
      .map(p => p.id);
  }
};