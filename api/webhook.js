import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.https://ylgtgecqhdhakzbjdkqq.supabase.co,
  process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsZ3RnZWNxaGRoYWt6Ympka3FxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU0NDAwNCwiZXhwIjoyMDg3MTIwMDA0fQ.87ohTc61_HFVpRpdpVCuY73_zL3qMvi-b6-oBcndKec
);

function verifyMailgunSignature(signingKey, timestamp, token, signature) {
  const encodedToken = crypto
    .createHmac('sha256', signingKey)
    .update(timestamp.concat(token))
    .digest('hex');
  return encodedToken === signature;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    if (process.env.445d9949d4e2b6d36db7eea3c3a73421) {
      const { timestamp, token, signature } = body.signature || {};
      if (!verifyMailgunSignature(process.env.445d9949d4e2b6d36db7eea3c3a73421, timestamp, token, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const eventData = body['event-data'] || body;
    const recipient = eventData.recipient || eventData.To || eventData.to || '';
    const sender = eventData.sender || eventData.From || eventData.from || '';
    const subject = eventData.subject || eventData.Subject || '(no subject)';
    const bodyText = eventData['body-plain'] || eventData['stripped-text'] || '';
    const bodyHtml = eventData['body-html'] || eventData['stripped-html'] || '';
    const messageId = eventData['Message-Id'] || eventData['message-id'] || crypto.randomUUID();
    const receivedAt = eventData.timestamp
      ? new Date(eventData.timestamp * 1000).toISOString()
      : new Date().toISOString();

    if (!recipient) {
      return res.status(400).json({ error: 'No recipient found' });
    }

    const toAddress = Array.isArray(recipient) ? recipient[0] : recipient;

    const { error } = await db.from('dropmail_messages').insert([{
      to_address: toAddress.toLowerCase().trim(),
      from_address: sender,
      subject,
      body_text: bodyText,
      body_html: bodyHtml,
      message_id: messageId,
      received_at: receivedAt,
      seen: false
    }]);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return res.status(500).json({ error: e.message });
  }
}
