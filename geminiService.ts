import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "./types.ts";

/**
 * Generates a short marketing pitch for a product.
 * Uses 'gemini-3-flash-preview' for basic text tasks.
 */
export const getAIPitch = async (productName: string, location: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [{
          text: `Write a 2-sentence marketing pitch in Somali language for selling ${productName} from the ${location} region of Somalia. Make it sound fresh and authentic.`
        }]
      }
    });
    return response.text || "Dalag cusub oo beerta laga keenay.";
  } catch (error) {
    console.error("AI Pitch Error:", error);
    return "Fresh organic produce from our farm.";
  }
};

/**
 * Finds matching products based on user natural language needs.
 * Uses 'gemini-3-pro-preview' for complex semantic matching tasks.
 */
export const findProductsForNeeds = async (userInput: string, products: Product[]): Promise<string[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

    const text = (response.text || "[]").trim();
    try {
      const result = JSON.parse(text);
      return Array.isArray(result) ? result : [];
    } catch (e) {
      console.warn("AI returned invalid JSON, falling back to empty array.");
      return [];
    }
  } catch (error) {
    console.error("AI Match Error:", error);
    return [];
  }
};