// Vercel serverless proxy for Groq. Key lives in Vercel env var GROQ_API_KEY (or API_KEY).
export default async function handler(req, res) {
  const key = process.env.GROQ_API_KEY || process.env.API_KEY || req.headers["x-user-key"];
  if (!key) {
    return res.status(500).json({ error: { message: "Server has no GROQ_API_KEY set in Vercel env vars." } });
  }
  const base = "https://api.groq.com/openai/v1";
  try {
    // GET -> list models (used by "Test connection")
    if (req.method === "GET") {
      const m = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${key}` } });
      return res.status(m.status).json(await m.json());
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    r.headers.forEach((v, k) => { if (k.startsWith("x-ratelimit") || k === "content-type") res.setHeader(k, v); });
    res.status(r.status);
    if (!r.body) return res.end(await r.text());
    const reader = r.body.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (e) {
    res.status(500).json({ error: { message: String(e.message || e) } });
  }
}
