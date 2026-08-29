const https = require('https');
const db = require('../db');

/**
 * Send SMS via TextBee (https://textbee.dev)
 * Free Android SMS Gateway — no per-message fees.
 * 
 * Setup:
 *  1. Register at https://app.textbee.dev/register
 *  2. Install the TextBee app on your Android phone
 *  3. Copy your API key and Device ID from the dashboard
 *  4. Add to .env: TEXTBEE_API_KEY=... and TEXTBEE_DEVICE_ID=...
 */
async function sendViaTextBee(phone, message) {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID; // optional

  const payload = JSON.stringify({
    recipients: [phone],
    message,
    ...(deviceId ? { deviceId } : {})
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.textbee.dev',
      path: '/api/v1/gateway/send-sms',
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`TextBee error ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(new Error('TextBee response parse error: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function sendSMS({ customerId, customerName, phone, productId, productName, message, discountCode }) {
  console.log(`[SMS] Sending to ${phone} (${customerName}): "${message}"`);

  let status = 'Simulated (Demo)';

  const textbeeKey = process.env.TEXTBEE_API_KEY;

  if (textbeeKey && textbeeKey !== 'your_textbee_api_key') {
    try {
      // Ensure phone is in E.164 format e.g. +919876543210
      let formattedPhone = phone.replace(/\s+/g, '').replace(/[^+\d]/g, '');
      if (!formattedPhone.startsWith('+')) {
        // Assume India (+91) if no country code
        formattedPhone = '+91' + formattedPhone.replace(/^0/, '');
      }

      await sendViaTextBee(formattedPhone, message);
      status = 'Sent via TextBee ✅';
      console.log(`[SMS] TextBee delivered to ${formattedPhone}`);
    } catch (err) {
      console.error('[SMS] TextBee error:', err.message);
      status = 'TextBee Failed: ' + err.message;
    }
  } else {
    console.log('[SMS] TEXTBEE_API_KEY not set — running in simulation mode');
  }

  // Record in database
  const campaign = db.createCampaign({
    customerId,
    customerName,
    phone,
    productId,
    productName,
    message,
    discountCode,
    status
  });

  return {
    success: true,
    campaign,
    status,
    timestamp: new Date().toISOString()
  };
}

module.exports = { sendSMS };
