// Simple suggestions using OpenAI
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { prefix, lang } = req.body;
  if (!prefix || prefix.length < 2) return res.json({ suggestions: [] });

  const OPENAI_KEY = process.env.VITE_OPENAI_KEY;
  if (!OPENAI_KEY) return res.json({ suggestions: [] });

  const LANG_NAMES = { en: "English", es: "Spanish", pt: "Portuguese", de: "German", fr: "French", uk: "Ukrainian", ru: "Russian" };

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `Give me 6 common ${LANG_NAMES[lang] || "English"} words that start with "${prefix}". Return ONLY a JSON array of strings. No explanation.` }],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });
    const d = await r.json();
    const content = d.choices?.[0]?.message?.content || "[]";
    const suggestions = JSON.parse(content.replace(/```json|```/g, "").trim());
    res.json({ suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 6) : [] });
  } catch {
    res.json({ suggestions: [] });
  }
}
