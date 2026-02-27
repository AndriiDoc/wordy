export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { word, translation, toLang } = req.body;
  if (!word || !toLang) return res.status(400).json({ error: "Missing fields" });

  const OPENAI_KEY = process.env.VITE_OPENAI_KEY;
  if (!OPENAI_KEY) return res.status(500).json({ error: "No API key" });

  const LANG_NAMES = { en: "English", es: "Spanish", pt: "Portuguese", de: "German", fr: "French", uk: "Ukrainian", ru: "Russian" };

  const TENSES = {
    en: ["Present Simple", "Present Continuous", "Past Simple", "Past Continuous", "Present Perfect", "Past Perfect", "Future Simple", "Future Continuous", "Conditional"],
    es: ["Presente", "Pretérito Perfecto", "Pretérito Indefinido", "Imperfecto", "Pluscuamperfecto", "Futuro Simple", "Condicional Simple", "Subjuntivo Presente"],
    pt: ["Presente", "Pretérito Perfeito", "Pretérito Imperfeito", "Mais-que-perfeito", "Futuro do Presente", "Futuro do Pretérito", "Subjuntivo Presente"],
    de: ["Präsens", "Präteritum", "Perfekt", "Plusquamperfekt", "Futur I", "Konjunktiv II", "Imperativ"],
    fr: ["Présent", "Passé Composé", "Imparfait", "Plus-que-parfait", "Futur Simple", "Conditionnel Présent", "Subjonctif Présent"],
    uk: ["Теперішній час", "Минулий час", "Майбутній час", "Наказовий спосіб"],
    ru: ["Настоящее время", "Прошедшее время", "Будущее время", "Повелительное наклонение"],
  };

  const PRONOUNS = {
    en: ["I", "You", "He/She/It", "We", "You (pl.)", "They"],
    es: ["yo", "tú", "él/ella", "nosotros", "vosotros", "ellos/ellas"],
    pt: ["eu", "tu", "ele/ela", "nós", "vós", "eles/elas"],
    de: ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"],
    fr: ["je", "tu", "il/elle", "nous", "vous", "ils/elles"],
    uk: ["я", "ти", "він/вона/воно", "ми", "ви", "вони"],
    ru: ["я", "ты", "он/она/оно", "мы", "вы", "они"],
  };

  const tenses = TENSES[toLang] || TENSES.en;
  const pronouns = PRONOUNS[toLang] || PRONOUNS.en;

  const prompt = `You are a linguistics expert. Generate a complete conjugation table for the ${LANG_NAMES[toLang]} verb "${translation}" (from word "${word}").

Pronouns: ${pronouns.join(", ")}
Tenses to include: ${tenses.join(", ")}

Respond ONLY with valid JSON (no markdown):
{
  "isVerb": true,
  "lemma": "infinitive form",
  "pronouns": ${JSON.stringify(pronouns)},
  "tenses": ${JSON.stringify(tenses)},
  "table": {
    "Tense Name": {
      "pronoun1": "conjugated form",
      "pronoun2": "conjugated form"
    }
  },
  "usage": {
    "Tense Name": {
      "rules": ["rule 1", "rule 2", "rule 3"],
      "examples": [
        { "sentence": "example in ${LANG_NAMES[toLang]}", "translation": "English translation" }
      ]
    }
  }
}

If the word is not a verb, return { "isVerb": false }.`;

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: prompt }], temperature: 0.2 }),
    });
    const d = await r.json();
    const content = d.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content");
    const result = JSON.parse(content.replace(/```json|```/g, "").trim());
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: "Grammar failed: " + e.message });
  }
}
