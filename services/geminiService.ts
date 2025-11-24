
import { GoogleGenAI, Type } from "@google/genai";
import { LetterQuestion, NikkudQuestion, SentenceQuestion } from "../types";

// Note: In a real app, we would cache these responses or use a backend.
// Here we generate on the fly for the "Infinite" learning experience.

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = 'gemini-2.5-flash';

export const generateLetterQuestion = async (level: number): Promise<LetterQuestion> => {
  let prompt = "";
  if (level === 1) prompt = "Generate a quiz for a child to identify a Hebrew word STARTING with a specific letter.";
  else if (level === 2) prompt = "Generate a quiz for a child to identify a Hebrew word ENDING with a specific letter.";
  else prompt = "Generate a quiz for a child to identify a Hebrew word CONTAINING a specific letter.";

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `${prompt} Use CONCRETE NOUNS (animals, objects, food) that are easy to visualize. Output valid JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          targetLetter: { type: Type.STRING, description: "The single Hebrew letter to identify" },
          questionText: { type: Type.STRING, description: "The question to ask the child in Hebrew (e.g., 'איזו מילה מתחילה באות...')" },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING, description: "The Hebrew word (Concrete Noun)" },
                isCorrect: { type: Type.BOOLEAN },
                imagePrompt: { type: Type.STRING, description: "Simple English visual description of the object (e.g. 'a red apple', 'a blue car')" }
              },
              required: ["word", "isCorrect", "imagePrompt"]
            }
          }
        },
        required: ["targetLetter", "questionText", "options"]
      }
    }
  });

  return JSON.parse(response.text || "{}") as LetterQuestion;
};

export const generateNikkudQuestion = async (level: number): Promise<NikkudQuestion> => {
  // Level mapping logic in prompt
  const levelsDesc = [
    "Simple: Patach, Kamatz, Hirik",
    "Medium: Hatafim",
    "Advanced: Tzeire, Holam, Shuruk",
    "Expert: Dagesh, Mapiq"
  ];
  const currentDesc = levelsDesc[Math.min(level - 1, 3)];

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Generate a 'Complete the Nikkud' question for Hebrew level: ${currentDesc}. Use a CONCRETE NOUN (animal, object) that is easy to visualize.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          wordWithoutNikkud: { type: Type.STRING, description: "The Hebrew word where the missing Nikkud is represented by an underscore '_' placed immediately AFTER the letter it modifies (e.g., 'ש_לום')." },
          fullWord: { type: Type.STRING, description: "The complete word correctly punctuated" },
          missingNikkudName: { type: Type.STRING },
          missingNikkudSymbol: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 options of Nikkud symbols, one is correct" },
          imageDescription: { type: Type.STRING, description: "Simple English visual description of the word object" }
        },
        required: ["wordWithoutNikkud", "fullWord", "missingNikkudSymbol", "options", "imageDescription"]
      }
    }
  });

  return JSON.parse(response.text || "{}") as NikkudQuestion;
};

export const generateSentenceQuestion = async (level: number): Promise<SentenceQuestion> => {
  let complexity = "simple 3 word sentence, fully vocalized (Nikkud).";
  if (level === 2) complexity = "longer 5+ word sentence, fully vocalized.";
  if (level >= 3) complexity = "sentence with NO Nikkud.";

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Generate a Hebrew sentence completion question for a 6 year old. ${complexity} The context should be visual.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sentenceParts: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "The sentence segments SURROUNDING the missing word. MUST return exactly 2 strings: [text_before, text_after]. Include spaces at boundaries if needed (e.g. ['The dog ', ' the food']). Do NOT include the missing word."
          },
          missingWord: { type: Type.STRING, description: "The correct word that fits in the gap" },
          options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 options including the correct word and 3 distractors" },
          imageDescription: { type: Type.STRING, description: "A scene description in English that illustrates the sentence context." }
        },
        required: ["sentenceParts", "missingWord", "options", "imageDescription"]
      }
    }
  });

  return JSON.parse(response.text || "{}") as SentenceQuestion;
};
