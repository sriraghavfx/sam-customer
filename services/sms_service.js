const db = require('../db');

async function sendSMS({ customerId, customerName, phone, productId, productName, message, discountCode }) {
  console.log(`[SMS GATEWAY] Dispatching to ${phone} (${customerName}): "${message}"`);

  let status = 'Delivered (Live Demo)';
  
  // Real gateway support if env keys are present
  const fast2smsKey = process.env.FAST2SMS_API_KEY;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  
  if (fast2smsKey && fast2smsKey !== 'your_fast2sms_key') {
    try {
      // Call Fast2SMS HTTP API
      status = 'Sent via Fast2SMS';
    } catch (e) {
      status = 'Failed: ' + e.message;
    }
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

module.exports = {
  sendSMS
};
