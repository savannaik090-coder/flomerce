/**
 * Nodemailer Configuration for Firebase Functions
 * This file contains the configuration for the Nodemailer service.
 */

const nodemailer = require('nodemailer');
const functions = require('firebase-functions');

/**
 * Get the email transport configuration from Firebase Functions config
 * @returns {Object} Nodemailer transport configuration
 */
function getEmailConfig() {
  // Get config from Firebase Functions config (set using firebase functions:config:set)
  const emailService = functions.config().email?.service || 'gmail';
  const emailUser = functions.config().email?.user;
  const emailPass = functions.config().email?.pass;
  const emailHost = functions.config().email?.host;
  const emailPort = parseInt(functions.config().email?.port || '587', 10);
  const emailSecure = functions.config().email?.secure === 'true';
  
  // Log configuration (without sensitive data)
  console.log('Email configuration:', {
    service: emailService || 'Not set',
    host: emailHost || 'Not set',
    port: emailPort,
    secure: emailSecure,
    auth: {
      user: emailUser ? 'Set' : 'Not set',
      pass: emailPass ? 'Set' : 'Not set',
    }
  });
  
  // Check if we have the minimum required information
  if (!emailUser || !emailPass) {
    console.warn('Email credentials not set - emails will not be sent');
  }
  
  // Create the configuration object
  const config = {
    // If a service like Gmail is specified, use it
    ...(emailService && { service: emailService }),
    // Otherwise use host and port
    ...(emailHost && { host: emailHost }),
    port: emailPort,
    secure: emailSecure,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    // Enhanced security and reputation settings
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    // Rate limiting to avoid being flagged as spam
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 20000,
    rateLimit: 5,
    // Additional deliverability settings
    dkim: {
      domainName: functions.config().email?.domain || 'yourdomain.com',
      keySelector: functions.config().email?.dkim_selector || 'default',
      privateKey: functions.config().email?.dkim_private_key || ''
    },
    // Enable SMTP authentication logging
    debug: false,
    logger: false
  };
  
  return config;
}

/**
 * Create a Nodemailer transport
 * @returns {Object} Nodemailer transport
 */
function createTransport() {
  return nodemailer.createTransport(getEmailConfig());
}

module.exports = {
  createTransport,
  getEmailConfig
};