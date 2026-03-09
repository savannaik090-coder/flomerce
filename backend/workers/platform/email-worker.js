import { jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';
import { sendEmail as sendEmailUtil, buildOrderConfirmationEmail } from '../../utils/email.js';

export async function handleEmail(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const pathParts = path.split('/').filter(Boolean);
  const action = pathParts[2];

  switch (action) {
    case 'order-confirmation':
      return sendOrderConfirmation(request, env);
    case 'verification':
      return sendVerificationEmail(request, env);
    case 'password-reset':
      return sendPasswordResetEmail(request, env);
    case 'contact':
      return sendContactEmail(request, env);
    case 'appointment':
      return sendAppointmentEmail(request, env);
    case 'test':
      return sendTestEmail(request, env);
    default:
      return errorResponse('Not found', 404);
  }
}

async function sendTestEmail(request, env) {
  const { email } = await request.json();
  if (!email) return errorResponse('Email is required');

  const html = `<h3>Test Email</h3><p>This is a test email from Fluxe.</p>`;
  const text = `Test Email from Fluxe`;

  const sent = await sendEmail(env, email, 'Fluxe Test Email', html, text);
  if (!sent) return errorResponse('Failed to send test email', 500);

  return successResponse(null, 'Test email sent');
}

async function sendEmail(env, to, subject, html, text) {
  return sendEmailUtil(env, to, subject, html, text);
}

async function sendOrderConfirmation(request, env) {
  try {
    const { order, customerEmail, brandName } = await request.json();

    if (!order || !customerEmail) {
      return errorResponse('Order and customer email are required');
    }

    const { html, text } = buildOrderConfirmationEmail(order, brandName);
    const orderNum = order.order_number || order.orderNumber || '';
    const sent = await sendEmail(env, customerEmail, `Order Confirmation - ${orderNum}`, html, text);

    if (sent !== true) {
      return errorResponse('Failed to send email', 500);
    }

    return successResponse(null, 'Order confirmation sent');
  } catch (error) {
    console.error('Send order confirmation error:', error);
    return errorResponse('Failed to send email', 500);
  }
}

async function sendVerificationEmail(request, env) {
  try {
    const { email, token, name, verifyUrl } = await request.json();

    if (!email || !token) {
      return errorResponse('Email and token are required');
    }

    const url = verifyUrl || `${env.APP_URL}${env.VERIFY_PATH || '/src/pages/verify-email.html'}?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Verify Your Email</h2>
          <p>Hi ${name || 'there'},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <a href="${url}" class="button">Verify Email</a>
          <p>Or copy and paste this link: ${url}</p>
          <p>This link will expire in 24 hours.</p>
        </div>
      </body>
      </html>
    `;

    const text = `Verify Your Email\n\nHi ${name || 'there'},\n\nPlease verify your email by visiting: ${url}\n\nThis link will expire in 24 hours.`;

    const sent = await sendEmail(env, email, 'Verify Your Email', html, text);

    if (sent !== true) {
      return jsonResponse({
        success: false,
        error: typeof sent === 'string' ? sent : 'Failed to send verification email',
        code: 'EMAIL_PROVIDER_ERROR'
      }, 500);
    }

    return successResponse(null, 'Verification email sent');
  } catch (error) {
    console.error('Send verification email error:', error);
    return errorResponse('Failed to send email', 500);
  }
}

async function sendPasswordResetEmail(request, env) {
  try {
    const { email, token, resetUrl } = await request.json();

    if (!email || !token) {
      return errorResponse('Email and token are required');
    }

    const url = resetUrl || `${env.APP_URL}${env.RESET_PATH || '/src/pages/reset-password.html'}?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Reset Your Password</h2>
          <p>You requested a password reset. Click the button below to set a new password:</p>
          <a href="${url}" class="button">Reset Password</a>
          <p>Or copy and paste this link: ${url}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      </body>
      </html>
    `;

    const text = `Reset Your Password\n\nYou requested a password reset. Visit this link to set a new password: ${url}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`;

    const sent = await sendEmail(env, email, 'Reset Your Password', html, text);

    if (sent !== true) {
      return jsonResponse({
        success: false,
        error: typeof sent === 'string' ? sent : 'Failed to send password reset email',
        code: 'EMAIL_PROVIDER_ERROR'
      }, 500);
    }

    return successResponse(null, 'Password reset email sent');
  } catch (error) {
    console.error('Send password reset email error:', error);
    return errorResponse('Failed to send email', 500);
  }
}

async function sendContactEmail(request, env) {
  try {
    const { name, email, phone, message, siteEmail, brandName } = await request.json();

    if (!name || !email || !message) {
      return errorResponse('Name, email and message are required');
    }

    const toEmail = siteEmail || env.CONTACT_EMAIL;

    if (!toEmail) {
      return errorResponse('No contact email configured', 500);
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>New Contact Form Submission</h2>
          <div class="field"><span class="label">Name:</span> ${name}</div>
          <div class="field"><span class="label">Email:</span> ${email}</div>
          ${phone ? `<div class="field"><span class="label">Phone:</span> ${phone}</div>` : ''}
          <div class="field"><span class="label">Message:</span></div>
          <p>${message}</p>
        </div>
      </body>
      </html>
    `;

    const text = `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}${phone ? `\nPhone: ${phone}` : ''}\n\nMessage:\n${message}`;

    const sent = await sendEmail(env, toEmail, `Contact Form - ${brandName || 'Website'}`, html, text);

    if (!sent) {
      return errorResponse('Failed to send email', 500);
    }

    return successResponse(null, 'Contact form submitted');
  } catch (error) {
    console.error('Send contact email error:', error);
    return errorResponse('Failed to send email', 500);
  }
}

async function sendAppointmentEmail(request, env) {
  try {
    const { name, email, phone, date, time, notes, siteEmail, brandName } = await request.json();

    if (!name || !email || !date) {
      return errorResponse('Name, email and date are required');
    }

    const toEmail = siteEmail || env.CONTACT_EMAIL;

    if (!toEmail) {
      return errorResponse('No contact email configured', 500);
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>New Appointment Request</h2>
          <div class="field"><span class="label">Name:</span> ${name}</div>
          <div class="field"><span class="label">Email:</span> ${email}</div>
          ${phone ? `<div class="field"><span class="label">Phone:</span> ${phone}</div>` : ''}
          <div class="field"><span class="label">Preferred Date:</span> ${date}</div>
          ${time ? `<div class="field"><span class="label">Preferred Time:</span> ${time}</div>` : ''}
          ${notes ? `<div class="field"><span class="label">Notes:</span> ${notes}</div>` : ''}
        </div>
      </body>
      </html>
    `;

    const text = `New Appointment Request\n\nName: ${name}\nEmail: ${email}${phone ? `\nPhone: ${phone}` : ''}\nPreferred Date: ${date}${time ? `\nPreferred Time: ${time}` : ''}${notes ? `\n\nNotes: ${notes}` : ''}`;

    const sent = await sendEmail(env, toEmail, `Appointment Request - ${brandName || 'Website'}`, html, text);

    if (!sent) {
      return errorResponse('Failed to send email', 500);
    }

    return successResponse(null, 'Appointment request submitted');
  } catch (error) {
    console.error('Send appointment email error:', error);
    return errorResponse('Failed to send email', 500);
  }
}
