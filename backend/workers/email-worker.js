import { jsonResponse, errorResponse, successResponse, handleCORS } from '../utils/helpers.js';
import { validateAuth } from '../utils/auth.js';

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
    default:
      return errorResponse('Not found', 404);
  }
}

async function sendEmail(env, to, subject, html, text) {
  try {
    if (env.RESEND_API_KEY) {
      console.log('Attempting to send email via Resend to:', to);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.FROM_EMAIL || 'noreply@fluxe.in',
          to: to,
          subject,
          html,
          text,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('Resend API Error details:', JSON.stringify(result, null, 2));
        console.error('Resend API Status:', response.status);
        console.error('Resend API Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
        return false;
      }

      console.log('Resend Email Sent Success:', result.id);
      return true;
    }

    if (env.SENDGRID_API_KEY) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: env.FROM_EMAIL || 'noreply@fluxe.in' },
          subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html },
          ],
        }),
      });

      if (!response.ok) {
        console.error('SendGrid error:', await response.text());
        return false;
      }

      return true;
    }

    console.log('No email provider configured. Email would be sent to:', to);
    console.log('Subject:', subject);
    return true;
  } catch (error) {
    console.error('Send email error:', error);
    return false;
  }
}

async function sendOrderConfirmation(request, env) {
  try {
    const { order, customerEmail, brandName } = await request.json();

    if (!order || !customerEmail) {
      return errorResponse('Order and customer email are required');
    }

    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price.toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .order-table th { background: #f5f5f5; padding: 10px; text-align: left; }
          .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${brandName || 'Your Order'}</h1>
          </div>
          <div class="content">
            <h2>Order Confirmation</h2>
            <p>Thank you for your order! Your order number is <strong>${order.order_number || order.orderNumber}</strong>.</p>
            
            <table class="order-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div class="total">
              Total: ₹${order.total.toFixed(2)}
            </div>
            
            <p>We will notify you when your order ships.</p>
          </div>
          <div class="footer">
            <p>Thank you for shopping with us!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `Order Confirmation\n\nThank you for your order!\nOrder Number: ${order.order_number || order.orderNumber}\nTotal: ₹${order.total.toFixed(2)}\n\nWe will notify you when your order ships.`;

    const sent = await sendEmail(env, customerEmail, `Order Confirmation - ${order.order_number || order.orderNumber}`, html, text);

    if (!sent) {
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

    const url = verifyUrl || `${env.APP_URL}/verify-email?token=${token}`;

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

    if (!sent) {
      return errorResponse('Failed to send email', 500);
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

    const url = resetUrl || `${env.APP_URL}/reset-password?token=${token}`;

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

    if (!sent) {
      return errorResponse('Failed to send email', 500);
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
