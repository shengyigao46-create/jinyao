import { PROMPTS, DIARY_TITLE_PROMPT, DIARY_BODY_PROMPT } from "../constants";
import { PhilosopherID, ChatMessage, DiaryEntry, WeatherMode } from "../types";

const API_URL = "/api/deepseek";
const DEFAULT_TEMPERATURE = 1.1;

// --- State Management ---
// DeepSeek 接口是无状态的 REST API，我们需要自己维护上下文
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

let chatHistory: Message[] = [];

const requestCompletion = async (messages: Message[], temperature = DEFAULT_TEMPERATURE) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages,
      temperature
    })
  });

  if (!response.ok) {
    let detail = "";
    try {
      const errData = await response.json();
      detail = errData?.error || "";
    } catch {
      detail = "";
    }
    const suffix = detail ? `: ${detail}` : "";
    throw new Error(`DeepSeek proxy error (${response.status})${suffix}`);
  }

  const data = await response.json();
  return data?.content?.trim() || "";
};

/**
 * Initialize a new chat session.
 * Resets history and sets the system prompt.
 */
export const startChatSession = (philosopherId: PhilosopherID) => {
  const systemPrompt = PROMPTS[philosopherId];
  chatHistory = [
    { role: 'system', content: systemPrompt }
  ];
  console.log(`DeepSeek Session Started: ${philosopherId}`);
};

/**
 * Send a message to DeepSeek and get the response.
 */
export const sendMessage = async (text: string): Promise<string> => {
  // Add user message to history
  chatHistory.push({ role: 'user', content: text });

  try {
    const reply = await requestCompletion(chatHistory, 1.3);

    if (!reply) {
      throw new Error("DeepSeek returned empty response.");
    }

    // Add assistant reply to history
    chatHistory.push({ role: 'assistant', content: reply });

    return reply;

  } catch (error) {
    console.error("DeepSeek Chat Error:", error);
    // Remove the last user message so they can try again if it failed network-wise
    chatHistory.pop();
    throw error;
  }
};

/**
 * Generate a diary entry (Title + Body) using DeepSeek.
 */
export const generateDiary = async (
  messages: ChatMessage[],
  weatherMode: WeatherMode
): Promise<DiaryEntry> => {
  // Format the conversation for the context
  const transcript = messages
    .map(m => `[${m.role === 'user' ? 'Me' : 'Philosopher'}]: ${m.text}`)
    .join('\n');

  try {
    // Execute Title and Body generation in parallel
    const [title, content] = await Promise.all([
      requestCompletion([
        { role: 'system', content: DIARY_TITLE_PROMPT },
        { role: 'user', content: `Dialogue Transcript:\n${transcript}` }
      ], 1.2),
      requestCompletion([
        { role: 'system', content: DIARY_BODY_PROMPT },
        { role: 'user', content: `Dialogue Transcript:\n${transcript}` }
      ], 1.1)
    ]);

    return {
      id: `diary-${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: title.trim().replace(/^["'《]+|["'》]+$/g, '') || "无题",
      content: content.trim(),
      weatherMode
    };
  } catch (error) {
    console.error("Diary Generation Error:", error);
    throw error;
  }
};
