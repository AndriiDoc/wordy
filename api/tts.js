export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, lang } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const voiceMap = {
    es: 'nova', pt: 'nova', fr: 'nova', de: 'nova',
    ru: 'alloy', uk: 'alloy', en: 'alloy'
  };

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voiceMap[lang] || 'alloy',
        speed: 0.9
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: err });
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(audioBuffer));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
