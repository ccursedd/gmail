import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    const eventData = body['event-data'] || body;

    const recipient  = eventData.recipient || eventData.To  || eventData.to  || '';
    const sender     = eventData.sender    || eventData.From || eventData.from || '';
    const subject    = eventData.subject   || eventData.Subject || '(no subject)';
    const bodyText   = eventData['body-plain']    || eventData['stripped-text'] || '';
    const bodyHtml   = eventData['body-html']     || eventData['stripped-html'] || '';
    const messageId  = eventData['Message-Id']    || eventData['message-id']   || crypto.randomUUID();
    const receivedAt = eventData.timestamp
      ? new Date(Number(eventData.timestamp) * 1000).toISOString()
      : new Date().toISOString();

    if (!recipient) {
      return res.status(200).json({ skipped: 'no recipient' });
    }

    const toAddress = Array.isArray(recipient) ? recipient[0] : String(recipient);

    const { error } = await db.from('dropmail_messages').insert([{
      to_address:   toAddress.toLowerCase().trim(),
      from_address: String(sender),
      subject:      String(subject),
      body_text:    String(bodyText),
      body_html:    String(bodyHtml),
      message_id:   String(messageId),
      received_at:  receivedAt,
      seen:         false
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
