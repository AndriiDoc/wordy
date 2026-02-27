export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to, type } = req.body;
  if (!to || !type) return res.status(400).json({ error: 'Missing fields' });

  const subjects = {
    reset: 'Reset your Wordy password',
    verify: 'Verify your Wordy account',
  };

  const bodies = {
    reset: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #1A1A1A; color: #F0F0F0; border-radius: 16px;">
        <div style="background: #F7C772; width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
          <span style="font-size: 24px; font-weight: 800; color: #181818;">W</span>
        </div>
        <h1 style="font-size: 24px; margin-bottom: 8px; color: #F0F0F0;">Reset your password</h1>
        <p style="color: #A0A0A0; margin-bottom: 24px;">We received a request to reset your Wordy password. Click the button below to create a new password.</p>
        <a href="{link}" style="display: inline-block; background: #F7C772; color: #181818; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; margin-bottom: 24px;">Reset Password</a>
        <p style="color: #606060; font-size: 13px;">If you didn't request this, you can ignore this email. The link expires in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">
        <p style="color: #606060; font-size: 12px;">Wordy · wordy-app.com</p>
      </div>
    `,
  };

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Wordy <noreply@wordy-app.com>',
        to,
        subject: subjects[type],
        html: bodies[type]
      })
    });

    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
