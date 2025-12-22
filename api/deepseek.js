const API_URL = "https://api.deepseek.com/chat/completions";
const MODEL_NAME = "deepseek-chat";
const DEFAULT_TEMPERATURE = 0.9;
const ALLOWED_ROLES = new Set(["system", "user", "assistant"]);

const parseBody = (req) => {
  if (req.body) return req.body;
  return null;
};

const validateMessages = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const normalized = [];
  for (const msg of messages) {
    if (!msg || typeof msg !== "object") return null;
    const role = msg.role;
    const content = msg.content;
    if (!ALLOWED_ROLES.has(role) || typeof content !== "string" || !content.trim()) {
      return null;
    }
    normalized.push({ role, content });
  }
  return normalized;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing DEEPSEEK_API_KEY" });
    return;
  }

  let body = parseBody(req);
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }

  const messages = validateMessages(body?.messages);
  if (!messages) {
    res.status(400).json({ error: "Invalid messages payload" });
    return;
  }

  const temperature =
    typeof body?.temperature === "number" ? body.temperature : DEFAULT_TEMPERATURE;

  const upstream = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages,
      temperature,
      stream: false
    })
  });

  if (!upstream.ok) {
    let detail = "";
    try {
      const errData = await upstream.json();
      detail = errData?.error?.message || errData?.message || "";
    } catch {
      detail = "";
    }
    const message = detail || `DeepSeek error (${upstream.status})`;
    res.status(upstream.status).json({ error: message });
    return;
  }

  const data = await upstream.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    res.status(502).json({ error: "Empty response from DeepSeek" });
    return;
  }

  res.status(200).json({ content });
}
