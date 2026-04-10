import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export default async function handler(req, res) {
  // Always return 200 to Mailgun so it doesn't retry endlessly
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log the raw body so we can see what Mailgun is sending
    const body = req.body;
    console.log('Webhook received. Keys:', Object.keys(body).join(', '));

    // Check env vars are set
    if (!process.env.SUPABASE_URL) {
      console.error('MISSING: SUPABASE_URL env var not set');
      return res.status(200).json({ error: 'SUPABASE_URL not set' });
    }
    if (!process.env.SUPABASE_SERVICE_KEY) {
      console.error('MISSING: SUPABASE_SERVICE_KEY env var not set');
      return res.status(200).json({ error: 'SUPABASE_SERVICE_KEY not set' });
    }

    const db = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { persistSession: false } }
    );

    // Mailgun sends data in different formats depending on route type
    // Try both formats
    const eventData = body['event-data'] || body;

    const recipient   = eventData.recipient  || eventData.To        || eventData.to        || body.recipient || body.To || body.to || '';
    const sender      = eventData.sender     || eventData.From      || eventData.from      || body.sender    || body.From || body.from || '';
    const subject     = eventData.subject    || eventData.Subject   || body.subject        || body.Subject   || '(no subject)';
    const bodyText    = eventData['body-plain']    || eventData['stripped-text'] || body['body-plain']    || body['stripped-text'] || '';
    const bodyHtml    = eventData['body-html']     || eventData['stripped-html'] || body['body-html']     || body['stripped-html'] || '';
    const messageId   = eventData['Message-Id']    || eventData['message-id']   || body['Message-Id']    || body['message-id']   || crypto.randomUUID();
    const ts          = eventData.timestamp || body.timestamp;
    const receivedAt  = ts ? new Date(Number(ts) * 1000).toISOString() : new Date().toISOString();

    console.log('Parsed - recipient:', recipient, '| sender:', sender, '| subject:', subject);

    if (!recipient) {
      console.log('No recipient found, skipping');
      return res.status(200).json({ skipped: 'no recipient' });
    }

    const toAddress = (Array.isArray(recipient) ? recipient[0] : String(recipient)).toLowerCase().trim();
    console.log('Inserting to dropmail_messages for:', toAddress);

    const { data, error } = await db.from('dropmail_messages').insert([{
      to_address:   toAddress,
      from_address: String(sender),
      subject:      String(subject),
      body_text:    String(bodyText),
      body_html:    String(bodyHtml),
      message_id:   String(messageId),
      received_at:  receivedAt,
      seen:         false
    }]).select();

    if (error) {
      console.error('Supabase insert error:', JSON.stringify(error));
      return res.status(200).json({ error: error.message, code: error.code });
    }

    console.log('Success! Inserted message id:', data?.[0]?.id);
    return res.status(200).json({ success: true, id: data?.[0]?.id });

  } catch (e) {
    console.error('Webhook crash:', e.message, e.stack);
    return res.status(200).json({ error: e.message });
  }
}
