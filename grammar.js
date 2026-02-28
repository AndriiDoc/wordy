export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { word, translation, toLang } = req.body;
  if (!word || !toLang) return res.status(400).json({ error: "Missing fields" });

  const OPENAI_KEY = process.env.VITE_OPENAI_KEY;
  if (!OPENAI_KEY) return res.status(500).json({ error: "No API key" });

  const LANG_NAMES = { en: "English", es: "Spanish", pt: "Portuguese", de: "German", fr: "French", uk: "Ukrainian" };

  const TENSES = {
    en: ["Present Simple","Present Continuous","Present Perfect","Present Perfect Continuous","Past Simple","Past Continuous","Past Perfect","Past Perfect Continuous","Future Simple (will)","Future Continuous","Future Perfect","Future Perfect Continuous","Going to (Future)","Conditional Present","Conditional Perfect","Imperative"],
    es: ["Presente de Indicativo","Pretérito Perfecto Compuesto","Pretérito Indefinido","Pretérito Imperfecto","Pretérito Pluscuamperfecto","Pretérito Anterior","Futuro Simple","Futuro Perfecto","Condicional Simple","Condicional Compuesto","Presente de Subjuntivo","Pretérito Perfecto de Subjuntivo","Pretérito Imperfecto de Subjuntivo","Pretérito Pluscuamperfecto de Subjuntivo","Futuro de Subjuntivo","Imperativo"],
    pt: ["Presente do Indicativo","Pretérito Perfeito Simples","Pretérito Perfeito Composto","Pretérito Imperfeito","Pretérito Mais-que-perfeito Simples","Pretérito Mais-que-perfeito Composto","Futuro do Presente Simples","Futuro do Presente Composto","Futuro do Pretérito Simples","Futuro do Pretérito Composto","Presente do Subjuntivo","Pretérito Imperfeito do Subjuntivo","Futuro do Subjuntivo","Imperativo Afirmativo","Imperativo Negativo"],
    de: ["Präsens","Präteritum","Perfekt","Plusquamperfekt","Futur I","Futur II","Konjunktiv I Präsens","Konjunktiv I Perfekt","Konjunktiv II Präteritum","Konjunktiv II Plusquamperfekt","Konjunktiv II Futur I","Imperativ"],
    fr: ["Présent de l'Indicatif","Passé Composé","Imparfait","Plus-que-parfait","Passé Simple","Passé Antérieur","Futur Simple","Futur Antérieur","Conditionnel Présent","Conditionnel Passé","Subjonctif Présent","Subjonctif Passé","Subjonctif Imparfait","Subjonctif Plus-que-parfait","Impératif Présent","Impératif Passé"],
    uk: ["Теперішній час (недок.)","Минулий час — чол.р. (док.)","Минулий час — жін.р. (док.)","Минулий час — сер.р. (док.)","Минулий час — мн. (док.)","Минулий час (недок.)","Майбутній час простий (док.)","Майбутній час складний (недок.)","Умовний спосіб","Наказовий спосіб"],
  };

  const PRONOUNS = {
    en: ["I","You","He / She / It","We","You (plural)","They"],
    es: ["yo","tú","él / ella / usted","nosotros","vosotros","ellos / ellas / ustedes"],
    pt: ["eu","tu","ele / ela / você","nós","vós","eles / elas / vocês"],
    de: ["ich","du","er / sie / es","wir","ihr","sie / Sie"],
    fr: ["je","tu","il / elle","nous","vous","ils / elles"],
    uk: ["я","ти","він / вона / воно","ми","ви","вони"],
  };

  const tenses = TENSES[toLang] || TENSES.en;
  const pronouns = PRONOUNS[toLang] || PRONOUNS.en;

  const prompt = `You are a professional linguist. Generate a COMPLETE conjugation table for the ${LANG_NAMES[toLang]} verb "${translation}" (from "${word}").

Pronouns: ${JSON.stringify(pronouns)}
ALL tenses: ${JSON.stringify(tenses)}

Rules:
- Include ALL ${tenses.length} tenses — do not skip any
- Use full compound forms (auxiliary + participle)
- For imperative use most common forms available
- Be precise and grammatically correct

Respond ONLY with valid JSON (no markdown):
{
  "isVerb": true,
  "lemma": "infinitive",
  "pronouns": ${JSON.stringify(pronouns)},
  "tenses": ${JSON.stringify(tenses)},
  "table": {
    "Tense Name": {
      "pronoun": "conjugated form"
    }
  },
  "usage": {
    "Tense Name": {
      "rules": ["when to use rule 1", "rule 2", "rule 3"],
      "examples": [
        { "sentence": "example in ${LANG_NAMES[toLang]}", "translation": "English translation" }
      ]
    }
  }
}

If NOT a verb: { "isVerb": false, "reason": "explanation" }`;

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: 4000 }),
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
