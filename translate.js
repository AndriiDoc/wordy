export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { text, fromLang, toLang } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "No text provided" });

  const DEEPL_KEY = process.env.DEEPL_API_KEY;
  const OPENAI_KEY = process.env.VITE_OPENAI_KEY;

  const LANG_MAP_DEEPL = { en: "EN", es: "ES", pt: "PT", de: "DE", fr: "FR", uk: "UK" };

  let mainTranslation = null;

  // Try DeepL first
  if (DEEPL_KEY) {
    try {
      const r = await fetch("https://api-free.deepl.com/v2/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `DeepL-Auth-Key ${DEEPL_KEY}` },
        body: JSON.stringify({ text: [text], source_lang: LANG_MAP_DEEPL[fromLang], target_lang: LANG_MAP_DEEPL[toLang] }),
      });
      const d = await r.json();
      if (d.translations?.[0]?.text) mainTranslation = d.translations[0].text;
    } catch (e) { console.error("DeepL error:", e); }
  }

  // OpenAI for full result (alternatives, meanings, examples, grammar)
  if (!OPENAI_KEY) return res.status(500).json({ error: "No API key configured" });

  const LANG_NAMES = { en: "English", es: "Spanish", pt: "Portuguese", de: "German", fr: "French", uk: "Ukrainian" };

  const prompt = `You are a professional linguist. Translate the word/phrase from ${LANG_NAMES[fromLang]} to ${LANG_NAMES[toLang]}.
${mainTranslation ? `DeepL translation: "${mainTranslation}" — use this as the main translation.` : ""}

Word: "${text}"

Respond ONLY with valid JSON (no markdown):
{
  "word": "original word",
  "main": "main translation",
  "alternatives": ["alt1", "alt2", "alt3"],
  "partOfSpeech": "verb|noun|adjective|adverb|phrase",
  "phonetic": "pronunciation if available",
  "meanings": [
    {
      "meaning": "meaning in ${LANG_NAMES[fromLang]}",
      "translation": "translation of this meaning",
      "example": "example sentence in ${LANG_NAMES[toLang]}",
      "exampleTranslation": "English translation of example"
    }
  ],
  "forms": {
    "tense_name": "form1 / form2 / form3 / form4 / form5 / form6"
  }
}

For forms, include all relevant tenses for ${LANG_NAMES[toLang]}. If not a verb, return empty forms {}.`;

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: prompt }], temperature: 0.3 }),
    });
    const d = await r.json();
    const content = d.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content");
    const result = JSON.parse(content.replace(/```json|```/g, "").trim());
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: "Translation failed: " + e.message });
  }
}
