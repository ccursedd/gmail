import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Hardcoded since RLS is disabled — anon key is safe here
const SUPABASE_URL = 'https://yoatzybpfmdnlfhifnzs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_o0Vdbv8HjqNluwkijys-Sw_lBBN5OjP';

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    console.log('Webhook hit. Body keys:', Object.keys(body || {}).join(', '));

    const eventData = body['event-data'] || body;

    const recipient  = eventData.recipient  || eventData.To      || eventData.to      || body.recipient || body.To  || body.to  || '';
    const sender     = eventData.sender     || eventData.From    || eventData.from    || body.sender    || body.From || body.from || '';
    const subject    = eventData.subject    || eventData.Subject || body.subject      || body.Subject   || '(no subject)';
    const bodyText   = eventData['body-plain']    || eventData['stripped-text'] || body['body-plain']    || body['stripped-text'] || '';
    const bodyHtml   = eventData['body-html']     || eventData['stripped-html'] || body['body-html']     || body['stripped-html'] || '';
    const messageId  = eventData['Message-Id']    || eventData['message-id']   || body['Message-Id']    || body['message-id']   || crypto.randomUUID();
    const ts         = eventData.timestamp || body.timestamp;
    const receivedAt = ts ? new Date(Number(ts) * 1000).toISOString() : new Date().toISOString();

    const toAddress  = (Array.isArray(recipient) ? recipient[0] : String(recipient)).toLowerCase().trim();

    console.log('To:', toAddress, '| From:', sender, '| Subject:', subject);

    if (!toAddress || toAddress === '') {
      console.log('No recipient, skipping');
      return res.status(200).json({ skipped: 'no recipient' });
    }

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
      console.error('Supabase error:', error.message, '| code:', error.code, '| details:', error.details);
      return res.status(200).json({ error: error.message });
    }

    console.log('Saved! ID:', data?.[0]?.id, 'to_address:', toAddress);
    return res.status(200).json({ success: true });

  } catch (e) {
    console.error('Crash:', e.message);
    return res.status(200).json({ error: e.message });
  }
}
