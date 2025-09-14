const axios = require('axios');
const logger = require('./logger');

class SMSService {
  constructor() {
    this.apiUrl = process.env.SMS_API_URL;
    this.apiToken = process.env.SMS_API_TOKEN;
    this.sender = process.env.SMS_SENDER || 'SEHATSHAKTI';
  }

  async sendOTP(phone, otp, purpose = 'verification') {
    try {
      const message = this.getOTPMessage(otp, purpose);
        // Edit kardo bhauuuuuu !!!! pls :) :)
      const response = await axios.post(this.apiUrl, {
        phone: phone,
        message: message,
        sender: this.sender
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data && response.data.success) {
        logger.info(`SMS sent successfully to ${phone}`);
        return true;
      } else {
        logger.error(`SMS API returned error for ${phone}:`, response.data);
        return false;
      }

    } catch (error) {
      logger.error(`SMS sending failed for ${phone}:`, error.message);
      return false;
    }
  }

  getOTPMessage(otp, purpose) {
    const messages = {
      verification: `Your Telemedicine verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`,
      login: `Your Telemedicine login code is: ${otp}. Valid for 5 minutes. Do not share this code.`,
      signup: `Your Telemedicine signup code is: ${otp}. Valid for 5 minutes. Do not share this code.`,
      password_reset: `Your Telemedicine password reset code is: ${otp}. Valid for 5 minutes. Do not share this code.`
    };

    return messages[purpose] || messages.verification;
  }

  async sendNotification(phone, message) {
    try {
      const response = await axios.post(this.apiUrl, {
        phone: phone,
        message: message,
        sender: this.sender
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return response.data && response.data.success;

    } catch (error) {
      logger.error(`SMS notification failed for ${phone}:`, error.message);
      return false;
    }
  }
}

module.exports = new SMSService();
