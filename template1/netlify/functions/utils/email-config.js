/**
 * Nodemailer Configuration for Netlify Functions
 * This file contains the configuration for the Nodemailer service.
 */

const nodemailer = require('nodemailer');

/**
 * Get the email transport configuration from environment variables
 * @returns {Object} Nodemailer transport configuration
 */
function getEmailConfig() {
  // Load variables from environment with fallback values for development
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  const emailUser = process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com';
  const emailPass = process.env.EMAIL_PASS;

  console.log('Email configuration:', {
    service: emailService,
    user: emailUser ? `${emailUser.substring(0, 3)}...` : 'missing',
    pass: emailPass ? 'configured' : 'missing',
    nodeEnv: process.env.NODE_ENV
  });

  // For development/testing, use a fallback configuration
  if (!emailPass && process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  Email password not configured - emails will not be sent in development');
    // Return a test configuration that won't actually send emails
    return {
      streamTransport: true,
      newline: 'unix',
      buffer: true
    };
  }

  // Validate required credentials for production
  if (!emailUser || !emailPass) {
    throw new Error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASS environment variables.');
  }

  // Gmail specific configuration
  const config = {
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass.replace(/\s+/g, ''), // Remove spaces from app password
    },
    // Enhanced configuration for better deliverability
    debug: false,
    logger: false,
    connectionTimeout: 15000, // 15 seconds
    greetingTimeout: 10000,   // 10 seconds
    socketTimeout: 15000,     // 15 seconds
    pool: true,               // Use connection pooling
    maxConnections: 5,        // Max concurrent connections
    maxMessages: 100,         // Max messages per connection
    rateDelta: 20000,         // Rate limiting
    rateLimit: 5              // Max 5 emails per 20 seconds
  };

  return config;
}

/**
 * Create a Nodemailer transport
 * @returns {Object} Nodemailer transport
 */
const createTransporter = () => {
  return nodemailer.createTransport(getEmailConfig());
};

module.exports = {
  createTransporter
};