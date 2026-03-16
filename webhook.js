// api/webhook.js - Mailgun webhook receiver
// Deploy this to Vercel. Set these env vars in Vercel dashboard:
//   SUPABASE_URL=https://ylgtgecqhdhakzbjdkqq.supabase.co
//   SUPABASE_SERVICE_KEY=your_service_role_key
//   MAILGUN_WEBHOOK_SIGNING_KEY=your_webhook_signing_key

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.https://ylgtgecqhdhakzbjdkqq.supabase.co,
  process.env.sb_publishable_ILF6pER_bdL8GppxOzfumg_xsDoMA6T
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

    // Verify webhook signature if signing key is set
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
    const timestamp = eventData.timestamp
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
      received_at: timestamp,
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
