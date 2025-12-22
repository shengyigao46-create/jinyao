import { GoogleGenAI, Chat } from "@google/genai";
import { PROMPTS, DIARY_TITLE_PROMPT, DIARY_BODY_PROMPT } from "../constants";
import { PhilosopherID, ChatMessage, DiaryEntry, WeatherMode } from "../types";

let ai: GoogleGenAI | null = null;
let chatSession: Chat | null = null;
let currentPhilosopherId: PhilosopherID | null = null;

const getAI = () => {
  if (!ai && process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

export const startChatSession = (philosopherId: PhilosopherID) => {
  const client = getAI();
  if (!client) throw new Error("API Key missing");

  currentPhilosopherId = philosopherId;
  const systemInstruction = PROMPTS[philosopherId];

  chatSession = client.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction,
      temperature: 0.7,
    },
  });
};

export const sendMessage = async (text: string): Promise<string> => {
  if (!chatSession) throw new Error("Chat session not initialized");

  const response = await chatSession.sendMessage({ message: text });
  return response.text || "...";
};

export const generateDiary = async (
  messages: ChatMessage[], 
  weatherMode: WeatherMode
): Promise<DiaryEntry> => {
  const client = getAI();
  if (!client) throw new Error("API Key missing");

  // Construct conversation transcript
  const transcript = messages
    .map(m => `[${m.role === 'user' ? 'Me' : 'Philosopher'}]: ${m.text}`)
    .join('\n');

  // Parallel requests for Title and Body
  const titlePromise = client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `${DIARY_TITLE_PROMPT}\n\nDialogue:\n${transcript}`,
  });

  const bodyPromise = client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `${DIARY_BODY_PROMPT}\n\nDialogue:\n${transcript}`,
  });

  const [titleRes, bodyRes] = await Promise.all([titlePromise, bodyPromise]);

  const title = titleRes.text?.trim() || "无题";
  const content = bodyRes.text?.trim() || "内容缺失...";

  const timestamp = new Date().toISOString();
  
  return {
    id: `diary-${Date.now()}`,
    timestamp,
    title,
    content,
    weatherMode
  };
};