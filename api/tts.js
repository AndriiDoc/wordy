export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { text, lang } = req.body;
  if (!text) return res.status(400).json({ error: "No text" });

  const OPENAI_KEY = process.env.VITE_OPENAI_KEY;
  if (!OPENAI_KEY) return res.status(500).json({ error: "No API key" });

  const VOICE_MAP = { en: "nova", es: "nova", pt: "nova", fr: "nova", de: "alloy", uk: "alloy", ru: "alloy" };

  try {
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: "tts-1", input: text, voice: VOICE_MAP[lang] || "alloy", speed: 0.9 }),
    });
    if (!r.ok) throw new Error("TTS failed");
    const buf = await r.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(buf));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
