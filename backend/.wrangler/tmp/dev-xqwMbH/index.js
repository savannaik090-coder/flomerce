var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-nG1VjH/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-nG1VjH/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// utils/helpers.js
function generateId() {
  return crypto.randomUUID();
}
__name(generateId, "generateId");
function generateToken(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(generateToken, "generateToken");
function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}
__name(generateOrderNumber, "generateOrderNumber");
function generateSubdomain(brandName) {
  return brandName.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").substring(0, 30);
}
__name(generateSubdomain, "generateSubdomain");
function jsonResponse(data, status = 200, request = null) {
  const origin = request ? request.headers.get("Origin") : null;
  const allowedOrigin = getAllowedOrigin(origin);
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-ID",
      "Access-Control-Allow-Credentials": "true"
    }
  });
}
__name(jsonResponse, "jsonResponse");
function getAllowedOrigin(origin) {
  if (!origin)
    return "https://fluxe.in";
  if (origin === "https://fluxe.in")
    return origin;
  if (origin.endsWith(".fluxe.in") && origin.startsWith("https://"))
    return origin;
  if (origin === "https://fluxe-8x1.pages.dev")
    return origin;
  if (origin.endsWith(".pages.dev"))
    return origin;
  if (origin === "https://saas-platform.savannaik090.workers.dev")
    return origin;
  if (origin.endsWith(".workers.dev"))
    return origin;
  if (origin.includes("localhost"))
    return origin;
  if (origin.includes("replit.dev") || origin.includes("repl.co"))
    return origin;
  return "https://fluxe.in";
}
__name(getAllowedOrigin, "getAllowedOrigin");
function errorResponse(message, status = 400, code = "ERROR") {
  return jsonResponse({ success: false, error: message, code }, status);
}
__name(errorResponse, "errorResponse");
function successResponse(data, message = "Success") {
  return jsonResponse({ success: true, message, data });
}
__name(successResponse, "successResponse");
function corsHeaders(request) {
  const origin = request ? request.headers.get("Origin") : null;
  const allowedOrigin = getAllowedOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-ID",
    "Access-Control-Allow-Credentials": "true"
  };
}
__name(corsHeaders, "corsHeaders");
function handleCORS(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  return null;
}
__name(handleCORS, "handleCORS");
function getExpiryDate(hours = 24) {
  const date = /* @__PURE__ */ new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}
__name(getExpiryDate, "getExpiryDate");
function sanitizeInput(input) {
  if (typeof input !== "string")
    return input;
  return input.trim().replace(/[<>]/g, "");
}
__name(sanitizeInput, "sanitizeInput");
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
__name(validateEmail, "validateEmail");

// utils/auth.js
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    data,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 1e5,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(hashArray, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${hashHex}`;
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, storedHash) {
  const [saltHex, hashHex] = storedHash.split(":");
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    data,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 1e5,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(derivedBits);
  const computedHashHex = Array.from(hashArray, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return computedHashHex === hashHex;
}
__name(verifyPassword, "verifyPassword");
async function generateJWT(payload, secret, expiresInHours = 24) {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  const now = Math.floor(Date.now() / 1e3);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInHours * 60 * 60
  };
  const base64Header = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const base64Payload = btoa(JSON.stringify(tokenPayload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${base64Header}.${base64Payload}`)
  );
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${base64Header}.${base64Payload}.${base64Signature}`;
}
__name(generateJWT, "generateJWT");
async function verifyJWT(token, secret) {
  try {
    const [base64Header, base64Payload, base64Signature] = token.split(".");
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signatureBytes = Uint8Array.from(
      atob(base64Signature.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(`${base64Header}.${base64Payload}`)
    );
    if (!isValid) {
      return null;
    }
    const payload = JSON.parse(atob(base64Payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    return payload;
  } catch (e) {
    return null;
  }
}
__name(verifyJWT, "verifyJWT");
async function validateAuth(request, env) {
  const authHeader = request.headers.get("Authorization");
  const cookie = request.headers.get("Cookie");
  let token = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (cookie) {
    const cookies = cookie.split(";").reduce((acc, c) => {
      const [key, value] = c.trim().split("=");
      acc[key] = value;
      return acc;
    }, {});
    token = cookies["auth_token"];
  }
  if (!token) {
    return null;
  }
  const payload = await verifyJWT(token, env.JWT_SECRET || "your-secret-key");
  if (!payload) {
    return null;
  }
  const user = await env.DB.prepare(
    "SELECT id, email, name, email_verified FROM users WHERE id = ?"
  ).bind(payload.userId).first();
  return user;
}
__name(validateAuth, "validateAuth");

// workers/email-worker.js
async function handleEmail(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  const pathParts = path.split("/").filter(Boolean);
  const action = pathParts[2];
  switch (action) {
    case "order-confirmation":
      return sendOrderConfirmation(request, env);
    case "verification":
      return sendVerificationEmail(request, env);
    case "password-reset":
      return sendPasswordResetEmail(request, env);
    case "contact":
      return sendContactEmail(request, env);
    case "appointment":
      return sendAppointmentEmail(request, env);
    case "test":
      return sendTestEmail(request, env);
    default:
      return errorResponse("Not found", 404);
  }
}
__name(handleEmail, "handleEmail");
async function sendTestEmail(request, env) {
  const { email } = await request.json();
  if (!email)
    return errorResponse("Email is required");
  const html = `<h3>Test Email</h3><p>This is a test email from Fluxe.</p>`;
  const text = `Test Email from Fluxe`;
  const sent = await sendEmail(env, email, "Fluxe Test Email", html, text);
  if (!sent)
    return errorResponse("Failed to send test email", 500);
  return successResponse(null, "Test email sent");
}
__name(sendTestEmail, "sendTestEmail");
async function sendEmail(env, to, subject, html, text) {
  try {
    console.log("EMAIL SEND ATTEMPT", {
      provider: env.RESEND_API_KEY ? "resend" : env.SENDGRID_API_KEY ? "sendgrid" : "none",
      to,
      from: env.FROM_EMAIL || "noreply@fluxe.in"
    });
    if (env.RESEND_API_KEY) {
      const apiKey = env.RESEND_API_KEY.trim();
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.FROM_EMAIL || "noreply@fluxe.in",
          to: typeof to === "string" ? [to] : to,
          subject,
          html,
          text
        })
      });
      const body = await response.json().catch(() => ({}));
      console.log("RESEND RESPONSE", response.status, body);
      if (!response.ok) {
        console.error("Resend error:", body);
        return body.message || body.error || "Resend API error";
      }
      console.log("Resend Email Sent Success:", body.id);
      return true;
    }
    if (env.SENDGRID_API_KEY) {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: env.FROM_EMAIL || "noreply@fluxe.in" },
          subject,
          content: [
            { type: "text/plain", value: text },
            { type: "text/html", value: html }
          ]
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("SendGrid error:", errorText);
        return errorText || "SendGrid API error";
      }
      return true;
    }
    console.log("No email provider configured. Email would be sent to:", to);
    console.log("Subject:", subject);
    return true;
  } catch (error) {
    console.error("Send email error:", error);
    return error.message || "Unknown email sending error";
  }
}
__name(sendEmail, "sendEmail");
async function sendOrderConfirmation(request, env) {
  try {
    const { order, customerEmail, brandName } = await request.json();
    if (!order || !customerEmail) {
      return errorResponse("Order and customer email are required");
    }
    const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
    const itemsHtml = items.map((item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">\u20B9${item.price.toFixed(2)}</td>
      </tr>
    `).join("");
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
            <h1>${brandName || "Your Order"}</h1>
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
              Total: \u20B9${order.total.toFixed(2)}
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
    const text = `Order Confirmation

Thank you for your order!
Order Number: ${order.order_number || order.orderNumber}
Total: \u20B9${order.total.toFixed(2)}

We will notify you when your order ships.`;
    const sent = await sendEmail(env, customerEmail, `Order Confirmation - ${order.order_number || order.orderNumber}`, html, text);
    if (!sent) {
      return errorResponse("Failed to send email", 500);
    }
    return successResponse(null, "Order confirmation sent");
  } catch (error) {
    console.error("Send order confirmation error:", error);
    return errorResponse("Failed to send email", 500);
  }
}
__name(sendOrderConfirmation, "sendOrderConfirmation");
async function sendVerificationEmail(request, env) {
  try {
    const { email, token, name, verifyUrl } = await request.json();
    if (!email || !token) {
      return errorResponse("Email and token are required");
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
          <p>Hi ${name || "there"},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <a href="${url}" class="button">Verify Email</a>
          <p>Or copy and paste this link: ${url}</p>
          <p>This link will expire in 24 hours.</p>
        </div>
      </body>
      </html>
    `;
    const text = `Verify Your Email

Hi ${name || "there"},

Please verify your email by visiting: ${url}

This link will expire in 24 hours.`;
    const sent = await sendEmail(env, email, "Verify Your Email", html, text);
    if (sent !== true) {
      return jsonResponse({
        success: false,
        error: typeof sent === "string" ? sent : "Failed to send verification email",
        code: "EMAIL_PROVIDER_ERROR"
      }, 500);
    }
    return successResponse(null, "Verification email sent");
  } catch (error) {
    console.error("Send verification email error:", error);
    return errorResponse("Failed to send email", 500);
  }
}
__name(sendVerificationEmail, "sendVerificationEmail");
async function sendPasswordResetEmail(request, env) {
  try {
    const { email, token, resetUrl } = await request.json();
    if (!email || !token) {
      return errorResponse("Email and token are required");
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
    const text = `Reset Your Password

You requested a password reset. Visit this link to set a new password: ${url}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.`;
    const sent = await sendEmail(env, email, "Reset Your Password", html, text);
    if (sent !== true) {
      return jsonResponse({
        success: false,
        error: typeof sent === "string" ? sent : "Failed to send password reset email",
        code: "EMAIL_PROVIDER_ERROR"
      }, 500);
    }
    return successResponse(null, "Password reset email sent");
  } catch (error) {
    console.error("Send password reset email error:", error);
    return errorResponse("Failed to send email", 500);
  }
}
__name(sendPasswordResetEmail, "sendPasswordResetEmail");
async function sendContactEmail(request, env) {
  try {
    const { name, email, phone, message, siteEmail, brandName } = await request.json();
    if (!name || !email || !message) {
      return errorResponse("Name, email and message are required");
    }
    const toEmail = siteEmail || env.CONTACT_EMAIL;
    if (!toEmail) {
      return errorResponse("No contact email configured", 500);
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
          ${phone ? `<div class="field"><span class="label">Phone:</span> ${phone}</div>` : ""}
          <div class="field"><span class="label">Message:</span></div>
          <p>${message}</p>
        </div>
      </body>
      </html>
    `;
    const text = `New Contact Form Submission

Name: ${name}
Email: ${email}${phone ? `
Phone: ${phone}` : ""}

Message:
${message}`;
    const sent = await sendEmail(env, toEmail, `Contact Form - ${brandName || "Website"}`, html, text);
    if (!sent) {
      return errorResponse("Failed to send email", 500);
    }
    return successResponse(null, "Contact form submitted");
  } catch (error) {
    console.error("Send contact email error:", error);
    return errorResponse("Failed to send email", 500);
  }
}
__name(sendContactEmail, "sendContactEmail");
async function sendAppointmentEmail(request, env) {
  try {
    const { name, email, phone, date, time, notes, siteEmail, brandName } = await request.json();
    if (!name || !email || !date) {
      return errorResponse("Name, email and date are required");
    }
    const toEmail = siteEmail || env.CONTACT_EMAIL;
    if (!toEmail) {
      return errorResponse("No contact email configured", 500);
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
          ${phone ? `<div class="field"><span class="label">Phone:</span> ${phone}</div>` : ""}
          <div class="field"><span class="label">Preferred Date:</span> ${date}</div>
          ${time ? `<div class="field"><span class="label">Preferred Time:</span> ${time}</div>` : ""}
          ${notes ? `<div class="field"><span class="label">Notes:</span> ${notes}</div>` : ""}
        </div>
      </body>
      </html>
    `;
    const text = `New Appointment Request

Name: ${name}
Email: ${email}${phone ? `
Phone: ${phone}` : ""}
Preferred Date: ${date}${time ? `
Preferred Time: ${time}` : ""}${notes ? `

Notes: ${notes}` : ""}`;
    const sent = await sendEmail(env, toEmail, `Appointment Request - ${brandName || "Website"}`, html, text);
    if (!sent) {
      return errorResponse("Failed to send email", 500);
    }
    return successResponse(null, "Appointment request submitted");
  } catch (error) {
    console.error("Send appointment email error:", error);
    return errorResponse("Failed to send email", 500);
  }
}
__name(sendAppointmentEmail, "sendAppointmentEmail");

// workers/auth-worker.js
async function handleAuth(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const method = request.method;
  const action = path.split("/").pop();
  switch (action) {
    case "signup":
      return handleSignup(request, env);
    case "login":
      return handleLogin(request, env);
    case "google":
      return handleGoogleLogin(request, env);
    case "resend-verification":
      return handleResendVerification(request, env);
    case "logout":
      return handleLogout(request, env);
    case "verify-email":
      return handleVerifyEmail(request, env);
    case "send-verification":
      return handleSendVerification(request, env);
    case "reset-password":
      return handleResetPassword(request, env);
    case "request-reset":
      return handleRequestReset(request, env);
    case "me":
      return handleGetCurrentUser(request, env);
    case "update-profile":
      return handleUpdateProfile(request, env);
    default:
      return errorResponse("Not found", 404);
  }
}
__name(handleAuth, "handleAuth");
async function handleSignup(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { name, email, password, phone } = await request.json();
    if (!name || !email || !password) {
      return errorResponse("Name, email and password are required");
    }
    if (!validateEmail(email)) {
      return errorResponse("Invalid email format");
    }
    if (password.length < 8) {
      return errorResponse("Password must be at least 8 characters");
    }
    const existingUser = await env.DB.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).bind(email.toLowerCase()).first();
    if (existingUser) {
      return errorResponse("Email already registered", 400, "EMAIL_EXISTS");
    }
    const userId = generateId();
    const passwordHash = await hashPassword(password);
    const verificationToken = generateToken();
    await env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, name, phone, email_verified, created_at)
       VALUES (?, ?, ?, ?, ?, 0, datetime('now'))`
    ).bind(userId, email.toLowerCase(), passwordHash, sanitizeInput(name), phone || null).run();
    await env.DB.prepare(
      `INSERT INTO email_verifications (id, user_id, token, expires_at)
       VALUES (?, ?, ?, ?)`
    ).bind(generateId(), userId, verificationToken, getExpiryDate(24)).run();
    const emailResponse = await handleEmail(new Request(`${env.APP_URL || ""}/api/email/verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.toLowerCase(),
        token: verificationToken,
        name: sanitizeInput(name),
        verifyUrl: `${env.APP_URL}/verify-email?token=${verificationToken}`
      })
    }), env, "/api/email/verification");
    const emailBody = await emailResponse.json().catch(() => ({}));
    if (!emailResponse.ok || emailBody.success === false) {
      return jsonResponse({
        success: false,
        error: emailBody.error || "Verification email failed",
        code: "EMAIL_SEND_FAILED",
        details: emailBody
      }, 500, request);
    }
    return successResponse({
      user: {
        id: userId,
        email: email.toLowerCase(),
        name: sanitizeInput(name),
        emailVerified: false
      }
    }, "Account created. Please verify your email.");
  } catch (error) {
    console.error("Signup error:", error);
    return errorResponse("Failed to create account", 500);
  }
}
__name(handleSignup, "handleSignup");
async function handleLogin(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return errorResponse("Email and password are required");
    }
    const user = await env.DB.prepare(
      "SELECT id, email, password_hash, name, email_verified FROM users WHERE email = ?"
    ).bind(email.toLowerCase()).first();
    if (!user) {
      console.error("Login: User not found:", email.toLowerCase());
      return errorResponse("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      console.error("Login: Invalid password for:", email.toLowerCase());
      return errorResponse("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    if (!user.email_verified) {
      return errorResponse("Please verify your email", 401, "EMAIL_NOT_VERIFIED");
    }
    const token = await generateJWT({ userId: user.id, email: user.email }, env.JWT_SECRET || "your-secret-key");
    const sessionId = generateId();
    await env.DB.prepare(
      `INSERT INTO sessions (id, user_id, token, expires_at)
       VALUES (?, ?, ?, ?)`
    ).bind(sessionId, user.id, token, getExpiryDate(24 * 7)).run();
    const response = successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: !!user.email_verified
      },
      token
    }, "Login successful");
    response.headers.set("Set-Cookie", `auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Login failed", 500);
  }
}
__name(handleLogin, "handleLogin");
async function handleLogout(request, env) {
  try {
    const user = await validateAuth(request, env);
    if (user) {
      await env.DB.prepare(
        "DELETE FROM sessions WHERE user_id = ?"
      ).bind(user.id).run();
    }
    const response = successResponse(null, "Logged out successfully");
    response.headers.set("Set-Cookie", "auth_token=; Path=/; HttpOnly; Max-Age=0");
    return response;
  } catch (error) {
    return errorResponse("Logout failed", 500);
  }
}
__name(handleLogout, "handleLogout");
async function handleVerifyEmail(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { token } = await request.json();
    if (!token) {
      return errorResponse("Verification token is required");
    }
    const verification = await env.DB.prepare(
      `SELECT user_id, expires_at FROM email_verifications WHERE token = ?`
    ).bind(token).first();
    if (!verification) {
      return errorResponse("Invalid verification token", 400, "INVALID_TOKEN");
    }
    if (new Date(verification.expires_at) < /* @__PURE__ */ new Date()) {
      return errorResponse("Verification token has expired", 400, "TOKEN_EXPIRED");
    }
    await env.DB.prepare(
      'UPDATE users SET email_verified = 1, updated_at = datetime("now") WHERE id = ?'
    ).bind(verification.user_id).run();
    await env.DB.prepare(
      "DELETE FROM email_verifications WHERE user_id = ?"
    ).bind(verification.user_id).run();
    return successResponse(null, "Email verified successfully");
  } catch (error) {
    console.error("Verify email error:", error);
    return errorResponse("Verification failed", 500);
  }
}
__name(handleVerifyEmail, "handleVerifyEmail");
async function handleSendVerification(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const user = await validateAuth(request, env);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }
    if (user.email_verified) {
      return errorResponse("Email already verified", 400);
    }
    await env.DB.prepare(
      "DELETE FROM email_verifications WHERE user_id = ?"
    ).bind(user.id).run();
    const verificationToken = generateToken();
    await env.DB.prepare(
      `INSERT INTO email_verifications (id, user_id, token, expires_at)
       VALUES (?, ?, ?, ?)`
    ).bind(generateId(), user.id, verificationToken, getExpiryDate(24)).run();
    return successResponse({ verificationToken }, "Verification email sent");
  } catch (error) {
    console.error("Send verification error:", error);
    return errorResponse("Failed to send verification", 500);
  }
}
__name(handleSendVerification, "handleSendVerification");
async function handleRequestReset(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { email } = await request.json();
    if (!email) {
      return errorResponse("Email is required");
    }
    const user = await env.DB.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).bind(email.toLowerCase()).first();
    if (!user) {
      return successResponse(null, "If email exists, reset link will be sent");
    }
    await env.DB.prepare(
      "DELETE FROM password_resets WHERE user_id = ?"
    ).bind(user.id).run();
    const resetToken = generateToken();
    await env.DB.prepare(
      `INSERT INTO password_resets (id, user_id, token, expires_at)
       VALUES (?, ?, ?, ?)`
    ).bind(generateId(), user.id, resetToken, getExpiryDate(1)).run();
    const emailResponse = await handleEmail(new Request(`${env.APP_URL || ""}/api/email/password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.toLowerCase(),
        token: resetToken,
        resetUrl: `${env.APP_URL}/src/pages/reset-password.html?token=${resetToken}`
      })
    }), env, "/api/email/password-reset");
    const emailBody = await emailResponse.json().catch(() => ({}));
    if (!emailResponse.ok || emailBody.success === false) {
      return jsonResponse({
        success: false,
        error: emailBody.error || "Password reset email failed",
        code: "EMAIL_SEND_FAILED",
        details: emailBody
      }, 500, request);
    }
    return successResponse({ resetToken }, "Password reset link sent");
  } catch (error) {
    console.error("Request reset error:", error);
    return errorResponse("Failed to process reset request", 500);
  }
}
__name(handleRequestReset, "handleRequestReset");
async function handleResetPassword(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { token, newPassword } = await request.json();
    if (!token || !newPassword) {
      return errorResponse("Token and new password are required");
    }
    if (newPassword.length < 8) {
      return errorResponse("Password must be at least 8 characters");
    }
    const reset = await env.DB.prepare(
      `SELECT user_id, expires_at, used FROM password_resets WHERE token = ?`
    ).bind(token).first();
    if (!reset) {
      return errorResponse("Invalid reset token", 400, "INVALID_TOKEN");
    }
    if (reset.used) {
      return errorResponse("Reset token already used", 400, "TOKEN_USED");
    }
    if (new Date(reset.expires_at) < /* @__PURE__ */ new Date()) {
      return errorResponse("Reset token has expired", 400, "TOKEN_EXPIRED");
    }
    const passwordHash = await hashPassword(newPassword);
    await env.DB.prepare(
      'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(passwordHash, reset.user_id).run();
    await env.DB.prepare(
      "UPDATE password_resets SET used = 1 WHERE token = ?"
    ).bind(token).run();
    await env.DB.prepare(
      "DELETE FROM sessions WHERE user_id = ?"
    ).bind(reset.user_id).run();
    return successResponse(null, "Password reset successfully");
  } catch (error) {
    console.error("Reset password error:", error);
    return errorResponse("Failed to reset password", 500);
  }
}
__name(handleResetPassword, "handleResetPassword");
async function handleGetCurrentUser(request, env) {
  try {
    const user = await validateAuth(request, env);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }
    return successResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: !!user.email_verified
    });
  } catch (error) {
    return errorResponse("Failed to get user", 500);
  }
}
__name(handleGetCurrentUser, "handleGetCurrentUser");
async function handleResendVerification(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { email } = await request.json();
    if (!email)
      return errorResponse("Email is required");
    const user = await env.DB.prepare(
      "SELECT id, name, email_verified FROM users WHERE email = ?"
    ).bind(email.toLowerCase()).first();
    if (!user)
      return successResponse(null, "If account exists, verification email sent");
    if (user.email_verified)
      return errorResponse("Email already verified");
    await env.DB.prepare("DELETE FROM email_verifications WHERE user_id = ?").bind(user.id).run();
    const token = generateToken();
    await env.DB.prepare(
      `INSERT INTO email_verifications (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`
    ).bind(generateId(), user.id, token, getExpiryDate(24)).run();
    const emailResponse = await handleEmail(new Request(`${env.APP_URL || ""}/api/email/verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.toLowerCase(),
        token,
        name: user.name,
        verifyUrl: `${env.APP_URL}/verify-email?token=${token}`
      })
    }), env, "/api/email/verification");
    const emailBody = await emailResponse.json().catch(() => ({}));
    if (!emailResponse.ok || emailBody.success === false) {
      return jsonResponse({
        success: false,
        error: emailBody.error || "Verification email failed",
        code: "EMAIL_SEND_FAILED",
        details: emailBody
      }, 500, request);
    }
    return successResponse(null, "Verification email sent");
  } catch (error) {
    return errorResponse("Failed to resend verification", 500);
  }
}
__name(handleResendVerification, "handleResendVerification");
async function handleGoogleLogin(request, env) {
  if (request.method !== "POST")
    return errorResponse("Method not allowed", 405);
  try {
    const { credential } = await request.json();
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!googleRes.ok)
      return errorResponse("Invalid Google token", 401);
    const payload = await googleRes.json();
    if (payload.aud !== env.GOOGLE_CLIENT_ID)
      return errorResponse("Invalid client ID", 401);
    const email = payload.email.toLowerCase();
    let user = await env.DB.prepare("SELECT id, email, name FROM users WHERE email = ?").bind(email).first();
    if (!user) {
      const userId = generateId();
      await env.DB.prepare(
        'INSERT INTO users (id, email, name, email_verified, created_at) VALUES (?, ?, ?, 1, datetime("now"))'
      ).bind(userId, email, payload.name).run();
      user = { id: userId, email, name: payload.name };
    }
    const token = await generateJWT({ userId: user.id, email: user.email }, env.JWT_SECRET);
    const sessionId = generateId();
    await env.DB.prepare(
      "INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)"
    ).bind(sessionId, user.id, token, getExpiryDate(24 * 7)).run();
    const response = successResponse({ user, token }, "Google login successful");
    response.headers.set("Set-Cookie", `auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`);
    return response;
  } catch (error) {
    console.error("Google login error:", error);
    return errorResponse("Google login failed", 500);
  }
}
__name(handleGoogleLogin, "handleGoogleLogin");
async function handleUpdateProfile(request, env) {
  if (request.method !== "PUT" && request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const user = await validateAuth(request, env);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }
    const { name, phone } = await request.json();
    await env.DB.prepare(
      `UPDATE users SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        updated_at = datetime('now')
       WHERE id = ?`
    ).bind(name ? sanitizeInput(name) : null, phone || null, user.id).run();
    const updatedUser = await env.DB.prepare(
      "SELECT id, email, name, phone, email_verified FROM users WHERE id = ?"
    ).bind(user.id).first();
    return successResponse(updatedUser, "Profile updated successfully");
  } catch (error) {
    console.error("Update profile error:", error);
    return errorResponse("Failed to update profile", 500);
  }
}
__name(handleUpdateProfile, "handleUpdateProfile");

// workers/sites-worker.js
async function handleSites(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  const method = request.method;
  const pathParts = path.split("/").filter(Boolean);
  const siteId = pathParts[2];
  switch (method) {
    case "GET":
      return siteId ? getSite(env, user, siteId) : getUserSites(env, user);
    case "POST":
      return createSite(request, env, user);
    case "PUT":
      return updateSite(request, env, user, siteId);
    case "DELETE":
      return deleteSite(env, user, siteId);
    default:
      return errorResponse("Method not allowed", 405);
  }
}
__name(handleSites, "handleSites");
async function getUserSites(env, user) {
  try {
    const sites = await env.DB.prepare(
      `SELECT id, subdomain, brand_name, category, template_id, logo_url, 
              primary_color, is_active, subscription_plan, created_at
       FROM sites 
       WHERE user_id = ? 
       ORDER BY created_at DESC`
    ).bind(user.id).all();
    return successResponse(sites.results);
  } catch (error) {
    console.error("Get sites error:", error);
    return errorResponse("Failed to fetch sites", 500);
  }
}
__name(getUserSites, "getUserSites");
async function getSite(env, user, siteId) {
  try {
    const site = await env.DB.prepare(
      `SELECT * FROM sites WHERE id = ? AND user_id = ?`
    ).bind(siteId, user.id).first();
    if (!site) {
      return errorResponse("Site not found", 404, "NOT_FOUND");
    }
    const categories = await env.DB.prepare(
      `SELECT * FROM categories WHERE site_id = ? ORDER BY display_order`
    ).bind(siteId).all();
    return successResponse({ ...site, categories: categories.results });
  } catch (error) {
    console.error("Get site error:", error);
    return errorResponse("Failed to fetch site", 500);
  }
}
__name(getSite, "getSite");
async function createSite(request, env, user) {
  let siteId = null;
  let finalSubdomain = null;
  try {
    const body = await request.json();
    const { brandName, categories, templateId, logoUrl, phone, email, address, primaryColor, secondaryColor } = body;
    const category = body.category || "general";
    const subdomain = body.subdomain || generateSubdomain(brandName);
    if (!brandName) {
      return errorResponse("Brand name is required");
    }
    const existingSubdomain = await env.DB.prepare(
      "SELECT id FROM sites WHERE subdomain = ?"
    ).bind(subdomain).first();
    if (existingSubdomain) {
      return errorResponse("This subdomain is already taken. Please choose a different brand name.", 400, "SUBDOMAIN_TAKEN");
    }
    finalSubdomain = subdomain;
    siteId = generateId();
    await env.DB.prepare(
      `INSERT INTO sites (id, user_id, subdomain, brand_name, category, template_id, logo_url, phone, email, address, primary_color, secondary_color, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      siteId,
      user.id,
      finalSubdomain,
      sanitizeInput(brandName),
      category,
      templateId || "template1",
      logoUrl || null,
      phone || null,
      email || null,
      address || null,
      primaryColor || "#000000",
      secondaryColor || "#ffffff"
    ).run();
    try {
      if (categories && categories.length > 0) {
        await createUserCategories(env, siteId, categories);
      } else if (category) {
        await createDefaultCategories(env, siteId, category);
      }
    } catch (catError) {
      console.error("Category creation failed, attempting to auto-create table:", catError);
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            site_id TEXT NOT NULL,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            parent_id TEXT,
            description TEXT,
            image_url TEXT,
            display_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
            UNIQUE(site_id, slug)
          )
        `).run();
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_categories_site ON categories(site_id)").run();
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(site_id, slug)").run();
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)").run();
        if (categories && categories.length > 0) {
          await createUserCategories(env, siteId, categories);
        } else if (category) {
          await createDefaultCategories(env, siteId, category);
        }
      } catch (retryError) {
        console.error("Retry category creation failed:", retryError);
      }
    }
    return successResponse({ id: siteId, subdomain: finalSubdomain }, "Site created successfully");
  } catch (error) {
    console.error("Create site error:", error);
    if (error.message && error.message.includes("UNIQUE constraint failed")) {
      return errorResponse("Subdomain already taken", 400, "SUBDOMAIN_TAKEN");
    }
    return errorResponse("Failed to create site: " + error.message, 500);
  }
}
__name(createSite, "createSite");
async function createDefaultCategories(env, siteId, businessCategory) {
  const categoryTemplates = {
    jewellery: [
      { name: "Gold", slug: "gold", children: ["Necklace", "Earrings", "Bangles", "Rings"] },
      { name: "Silver", slug: "silver", children: ["Necklace", "Earrings", "Bangles", "Rings"] },
      { name: "Featured Collection", slug: "featured-collection", children: [] },
      { name: "New Arrivals", slug: "new-arrivals", children: [] }
    ],
    clothing: [
      { name: "Men", slug: "men", children: ["Shirts", "Pants", "Suits", "Accessories"] },
      { name: "Women", slug: "women", children: ["Dresses", "Tops", "Bottoms", "Accessories"] },
      { name: "New Arrivals", slug: "new-arrivals", children: [] },
      { name: "Sale", slug: "sale", children: [] }
    ],
    electronics: [
      { name: "Phones", slug: "phones", children: [] },
      { name: "Laptops", slug: "laptops", children: [] },
      { name: "Accessories", slug: "accessories", children: [] },
      { name: "New Arrivals", slug: "new-arrivals", children: [] }
    ]
  };
  const categories = categoryTemplates[businessCategory] || categoryTemplates.jewellery;
  let order = 0;
  for (const cat of categories) {
    const parentId = generateId();
    await env.DB.prepare(
      `INSERT INTO categories (id, site_id, name, slug, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(parentId, siteId, cat.name, cat.slug, order++).run();
    for (const childName of cat.children) {
      const childSlug = `${cat.slug}-${childName.toLowerCase().replace(/\s+/g, "-")}`;
      await env.DB.prepare(
        `INSERT INTO categories (id, site_id, name, slug, parent_id, display_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(generateId(), siteId, childName, childSlug, parentId, order++).run();
    }
  }
}
__name(createDefaultCategories, "createDefaultCategories");
async function createUserCategories(env, siteId, categories) {
  let order = 0;
  for (let cat of categories) {
    let categoryName = typeof cat === "string" ? cat : cat.name || cat.label;
    if (!categoryName)
      continue;
    const slug = categoryName.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
    await env.DB.prepare(
      `INSERT INTO categories (id, site_id, name, slug, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(generateId(), siteId, categoryName, slug, order++).run();
  }
}
__name(createUserCategories, "createUserCategories");
async function updateSite(request, env, user, siteId) {
  if (!siteId) {
    return errorResponse("Site ID is required");
  }
  try {
    const site = await env.DB.prepare(
      "SELECT id FROM sites WHERE id = ? AND user_id = ?"
    ).bind(siteId, user.id).first();
    if (!site) {
      return errorResponse("Site not found", 404, "NOT_FOUND");
    }
    const updates = await request.json();
    const allowedFields = ["brand_name", "logo_url", "favicon_url", "primary_color", "secondary_color", "phone", "email", "address", "social_links", "settings"];
    const setClause = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (allowedFields.includes(dbKey)) {
        setClause.push(`${dbKey} = ?`);
        values.push(typeof value === "object" ? JSON.stringify(value) : value);
      }
    }
    if (setClause.length === 0) {
      return errorResponse("No valid fields to update");
    }
    setClause.push('updated_at = datetime("now")');
    values.push(siteId);
    await env.DB.prepare(
      `UPDATE sites SET ${setClause.join(", ")} WHERE id = ?`
    ).bind(...values).run();
    return successResponse(null, "Site updated successfully");
  } catch (error) {
    console.error("Update site error:", error);
    return errorResponse("Failed to update site", 500);
  }
}
__name(updateSite, "updateSite");
async function deleteSite(env, user, siteId) {
  if (!siteId) {
    return errorResponse("Site ID is required");
  }
  try {
    const site = await env.DB.prepare(
      "SELECT id, subdomain FROM sites WHERE id = ? AND user_id = ?"
    ).bind(siteId, user.id).first();
    if (!site) {
      return errorResponse("Site not found", 404, "NOT_FOUND");
    }
    await env.DB.prepare("DELETE FROM sites WHERE id = ?").bind(siteId).run();
    return successResponse({ subdomain: site.subdomain }, "Site deleted successfully");
  } catch (error) {
    console.error("Delete site error:", error);
    return errorResponse("Failed to delete site", 500);
  }
}
__name(deleteSite, "deleteSite");

// workers/products-worker.js
async function handleProducts(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = path.split("/").filter(Boolean);
  const productId = pathParts[2];
  if (method === "GET") {
    const siteId = url.searchParams.get("siteId");
    const subdomain = url.searchParams.get("subdomain");
    const category = url.searchParams.get("category");
    if (productId) {
      return getProduct(env, productId);
    }
    return getProducts(env, { siteId, subdomain, category, url });
  }
  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  switch (method) {
    case "POST":
      return createProduct(request, env, user);
    case "PUT":
      return updateProduct(request, env, user, productId);
    case "DELETE":
      return deleteProduct(env, user, productId);
    default:
      return errorResponse("Method not allowed", 405);
  }
}
__name(handleProducts, "handleProducts");
async function getProducts(env, { siteId, subdomain, category, url }) {
  try {
    let query = "SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1";
    const bindings = [];
    if (siteId) {
      query += " AND p.site_id = ?";
      bindings.push(siteId);
    } else if (subdomain) {
      query = `SELECT p.*, c.name as category_name, c.slug as category_slug 
               FROM products p 
               LEFT JOIN categories c ON p.category_id = c.id
               JOIN sites s ON p.site_id = s.id 
               WHERE p.is_active = 1 AND s.subdomain = ?`;
      bindings.push(subdomain);
    }
    if (category) {
      query += " AND (c.slug = ? OR c.name = ?)";
      bindings.push(category, category);
    }
    const featured = url.searchParams.get("featured");
    if (featured === "true") {
      query += " AND p.is_featured = 1";
    }
    const limit = parseInt(url.searchParams.get("limit")) || 50;
    const offset = parseInt(url.searchParams.get("offset")) || 0;
    query += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
    bindings.push(limit, offset);
    const products = await env.DB.prepare(query).bind(...bindings).all();
    const parsedProducts = products.results.map((product) => ({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      tags: product.tags ? JSON.parse(product.tags) : []
    }));
    return successResponse(parsedProducts);
  } catch (error) {
    console.error("Get products error:", error);
    return errorResponse("Failed to fetch products", 500);
  }
}
__name(getProducts, "getProducts");
async function getProduct(env, productId) {
  try {
    const product = await env.DB.prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug, s.brand_name, s.subdomain
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id
       JOIN sites s ON p.site_id = s.id
       WHERE p.id = ?`
    ).bind(productId).first();
    if (!product) {
      return errorResponse("Product not found", 404, "NOT_FOUND");
    }
    const variants = await env.DB.prepare(
      "SELECT * FROM product_variants WHERE product_id = ?"
    ).bind(productId).all();
    const parsedProduct = {
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      tags: product.tags ? JSON.parse(product.tags) : [],
      variants: variants.results.map((v) => ({
        ...v,
        attributes: v.attributes ? JSON.parse(v.attributes) : {}
      }))
    };
    return successResponse(parsedProduct);
  } catch (error) {
    console.error("Get product error:", error);
    return errorResponse("Failed to fetch product", 500);
  }
}
__name(getProduct, "getProduct");
async function createProduct(request, env, user) {
  try {
    const data = await request.json();
    const { siteId, name, description, shortDescription, price, comparePrice, costPrice, sku, stock, categoryId, images, thumbnailUrl, tags, isFeatured, weight, dimensions } = data;
    if (!siteId || !name || price === void 0) {
      return errorResponse("Site ID, name and price are required");
    }
    const site = await env.DB.prepare(
      "SELECT id FROM sites WHERE id = ? AND user_id = ?"
    ).bind(siteId, user.id).first();
    if (!site) {
      return errorResponse("Site not found or unauthorized", 404);
    }
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").substring(0, 100);
    const productId = generateId();
    await env.DB.prepare(
      `INSERT INTO products (id, site_id, category_id, name, slug, description, short_description, price, compare_price, cost_price, sku, stock, low_stock_threshold, weight, dimensions, images, thumbnail_url, tags, is_featured, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      productId,
      siteId,
      categoryId || null,
      sanitizeInput(name),
      slug,
      description || null,
      shortDescription || null,
      price,
      comparePrice || null,
      costPrice || null,
      sku || null,
      stock || 0,
      5,
      weight || null,
      dimensions ? JSON.stringify(dimensions) : null,
      images ? JSON.stringify(images) : "[]",
      thumbnailUrl || null,
      tags ? JSON.stringify(tags) : "[]",
      isFeatured ? 1 : 0
    ).run();
    return successResponse({ id: productId, slug }, "Product created successfully");
  } catch (error) {
    console.error("Create product error:", error);
    if (error.message && error.message.includes("UNIQUE constraint failed")) {
      return errorResponse("Product slug already exists", 400, "SLUG_EXISTS");
    }
    return errorResponse("Failed to create product", 500);
  }
}
__name(createProduct, "createProduct");
async function updateProduct(request, env, user, productId) {
  if (!productId) {
    return errorResponse("Product ID is required");
  }
  try {
    const product = await env.DB.prepare(
      `SELECT p.id, p.site_id FROM products p 
       JOIN sites s ON p.site_id = s.id 
       WHERE p.id = ? AND s.user_id = ?`
    ).bind(productId, user.id).first();
    if (!product) {
      return errorResponse("Product not found or unauthorized", 404);
    }
    const updates = await request.json();
    const allowedFields = ["name", "description", "short_description", "price", "compare_price", "cost_price", "sku", "stock", "low_stock_threshold", "category_id", "images", "thumbnail_url", "tags", "is_featured", "is_active", "weight", "dimensions"];
    const setClause = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (allowedFields.includes(dbKey)) {
        setClause.push(`${dbKey} = ?`);
        if (Array.isArray(value) || typeof value === "object") {
          values.push(JSON.stringify(value));
        } else if (typeof value === "boolean") {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    }
    if (setClause.length === 0) {
      return errorResponse("No valid fields to update");
    }
    setClause.push('updated_at = datetime("now")');
    values.push(productId);
    await env.DB.prepare(
      `UPDATE products SET ${setClause.join(", ")} WHERE id = ?`
    ).bind(...values).run();
    return successResponse(null, "Product updated successfully");
  } catch (error) {
    console.error("Update product error:", error);
    return errorResponse("Failed to update product", 500);
  }
}
__name(updateProduct, "updateProduct");
async function deleteProduct(env, user, productId) {
  if (!productId) {
    return errorResponse("Product ID is required");
  }
  try {
    const product = await env.DB.prepare(
      `SELECT p.id FROM products p 
       JOIN sites s ON p.site_id = s.id 
       WHERE p.id = ? AND s.user_id = ?`
    ).bind(productId, user.id).first();
    if (!product) {
      return errorResponse("Product not found or unauthorized", 404);
    }
    await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(productId).run();
    return successResponse(null, "Product deleted successfully");
  } catch (error) {
    console.error("Delete product error:", error);
    return errorResponse("Failed to delete product", 500);
  }
}
__name(deleteProduct, "deleteProduct");
async function updateProductStock(env, productId, quantity, operation = "decrement") {
  try {
    if (operation === "decrement") {
      await env.DB.prepare(
        'UPDATE products SET stock = stock - ?, updated_at = datetime("now") WHERE id = ? AND stock >= ?'
      ).bind(quantity, productId, quantity).run();
    } else {
      await env.DB.prepare(
        'UPDATE products SET stock = stock + ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(quantity, productId).run();
    }
    return true;
  } catch (error) {
    console.error("Update stock error:", error);
    return false;
  }
}
__name(updateProductStock, "updateProductStock");

// workers/orders-worker.js
async function handleOrders(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const method = request.method;
  const pathParts = path.split("/").filter(Boolean);
  const orderId = pathParts[2];
  const action = pathParts[3];
  if (action === "guest") {
    return handleGuestOrder(request, env, method, orderId);
  }
  if (action === "track") {
    return trackOrder(env, orderId);
  }
  const user = await validateAuth(request, env);
  switch (method) {
    case "GET":
      if (orderId) {
        return getOrder(env, user, orderId);
      }
      return getOrders(request, env, user);
    case "POST":
      return createOrder(request, env, user);
    case "PUT":
      return updateOrderStatus(request, env, user, orderId);
    default:
      return errorResponse("Method not allowed", 405);
  }
}
__name(handleOrders, "handleOrders");
async function getOrders(request, env, user) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit")) || 50;
    const offset = parseInt(url.searchParams.get("offset")) || 0;
    let query = "SELECT * FROM orders WHERE 1=1";
    const bindings = [];
    if (user) {
      if (siteId) {
        const site = await env.DB.prepare(
          "SELECT id FROM sites WHERE id = ? AND user_id = ?"
        ).bind(siteId, user.id).first();
        if (site) {
          query += " AND site_id = ?";
          bindings.push(siteId);
        } else {
          query += " AND user_id = ?";
          bindings.push(user.id);
        }
      } else {
        query += " AND user_id = ?";
        bindings.push(user.id);
      }
    }
    if (status) {
      query += " AND status = ?";
      bindings.push(status);
    }
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    bindings.push(limit, offset);
    const orders = await env.DB.prepare(query).bind(...bindings).all();
    const parsedOrders = orders.results.map((order) => ({
      ...order,
      items: JSON.parse(order.items),
      shipping_address: JSON.parse(order.shipping_address),
      billing_address: order.billing_address ? JSON.parse(order.billing_address) : null
    }));
    return successResponse(parsedOrders);
  } catch (error) {
    console.error("Get orders error:", error);
    return errorResponse("Failed to fetch orders", 500);
  }
}
__name(getOrders, "getOrders");
async function getOrder(env, user, orderId) {
  try {
    let query = "SELECT * FROM orders WHERE id = ? OR order_number = ?";
    const bindings = [orderId, orderId];
    if (user) {
      query += " AND (user_id = ? OR site_id IN (SELECT id FROM sites WHERE user_id = ?))";
      bindings.push(user.id, user.id);
    }
    const order = await env.DB.prepare(query).bind(...bindings).first();
    if (!order) {
      return errorResponse("Order not found", 404, "NOT_FOUND");
    }
    return successResponse({
      ...order,
      items: JSON.parse(order.items),
      shipping_address: JSON.parse(order.shipping_address),
      billing_address: order.billing_address ? JSON.parse(order.billing_address) : null
    });
  } catch (error) {
    console.error("Get order error:", error);
    return errorResponse("Failed to fetch order", 500);
  }
}
__name(getOrder, "getOrder");
async function createOrder(request, env, user) {
  try {
    const data = await request.json();
    const { siteId, items, shippingAddress, billingAddress, customerName, customerEmail, customerPhone, paymentMethod, notes, couponCode } = data;
    if (!siteId || !items || !items.length || !shippingAddress || !customerName || !customerPhone) {
      return errorResponse("Missing required fields");
    }
    let subtotal = 0;
    const processedItems = [];
    for (const item of items) {
      const product = await env.DB.prepare(
        "SELECT id, name, price, stock, thumbnail_url FROM products WHERE id = ? AND site_id = ?"
      ).bind(item.productId, siteId).first();
      if (!product) {
        return errorResponse(`Product ${item.productId} not found`, 400);
      }
      if (product.stock < item.quantity) {
        return errorResponse(`Insufficient stock for ${product.name}`, 400, "INSUFFICIENT_STOCK");
      }
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      processedItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal,
        thumbnail: product.thumbnail_url,
        variant: item.variant || null
      });
    }
    let discount = 0;
    if (couponCode) {
      const coupon = await env.DB.prepare(
        `SELECT * FROM coupons WHERE site_id = ? AND code = ? AND is_active = 1 
         AND (starts_at IS NULL OR starts_at <= datetime('now'))
         AND (expires_at IS NULL OR expires_at > datetime('now'))
         AND (usage_limit IS NULL OR used_count < usage_limit)`
      ).bind(siteId, couponCode.toUpperCase()).first();
      if (coupon && subtotal >= coupon.min_order_value) {
        if (coupon.type === "percentage") {
          discount = subtotal * coupon.value / 100;
          if (coupon.max_discount && discount > coupon.max_discount) {
            discount = coupon.max_discount;
          }
        } else {
          discount = coupon.value;
        }
        await env.DB.prepare(
          "UPDATE coupons SET used_count = used_count + 1 WHERE id = ?"
        ).bind(coupon.id).run();
      }
    }
    const shippingCost = 0;
    const tax = 0;
    const total = subtotal - discount + shippingCost + tax;
    const orderId = generateId();
    const orderNumber = generateOrderNumber();
    await env.DB.prepare(
      `INSERT INTO orders (id, site_id, user_id, order_number, items, subtotal, discount, shipping_cost, tax, total, payment_method, shipping_address, billing_address, customer_name, customer_email, customer_phone, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      orderId,
      siteId,
      user ? user.id : null,
      orderNumber,
      JSON.stringify(processedItems),
      subtotal,
      discount,
      shippingCost,
      tax,
      total,
      paymentMethod || "pending",
      JSON.stringify(shippingAddress),
      billingAddress ? JSON.stringify(billingAddress) : null,
      customerName,
      customerEmail || null,
      customerPhone,
      notes || null
    ).run();
    for (const item of processedItems) {
      await updateProductStock(env, item.productId, item.quantity, "decrement");
    }
    return successResponse({
      id: orderId,
      orderNumber,
      total,
      items: processedItems
    }, "Order created successfully");
  } catch (error) {
    console.error("Create order error:", error);
    return errorResponse("Failed to create order", 500);
  }
}
__name(createOrder, "createOrder");
async function updateOrderStatus(request, env, user, orderId) {
  if (!orderId) {
    return errorResponse("Order ID is required");
  }
  try {
    const order = await env.DB.prepare(
      `SELECT o.id, o.site_id FROM orders o 
       JOIN sites s ON o.site_id = s.id 
       WHERE o.id = ? AND s.user_id = ?`
    ).bind(orderId, user.id).first();
    if (!order) {
      return errorResponse("Order not found or unauthorized", 404);
    }
    const { status, trackingNumber, carrier } = await request.json();
    const updates = [];
    const values = [];
    if (status) {
      updates.push("status = ?");
      values.push(status);
      if (status === "shipped") {
        updates.push('shipped_at = datetime("now")');
      } else if (status === "delivered") {
        updates.push('delivered_at = datetime("now")');
      } else if (status === "cancelled") {
        updates.push('cancelled_at = datetime("now")');
      }
    }
    if (trackingNumber) {
      updates.push("tracking_number = ?");
      values.push(trackingNumber);
    }
    if (carrier) {
      updates.push("carrier = ?");
      values.push(carrier);
    }
    if (updates.length === 0) {
      return errorResponse("No valid fields to update");
    }
    updates.push('updated_at = datetime("now")');
    values.push(orderId);
    await env.DB.prepare(
      `UPDATE orders SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...values).run();
    return successResponse(null, "Order updated successfully");
  } catch (error) {
    console.error("Update order error:", error);
    return errorResponse("Failed to update order", 500);
  }
}
__name(updateOrderStatus, "updateOrderStatus");
async function handleGuestOrder(request, env, method, orderId) {
  if (method === "POST") {
    return createGuestOrder(request, env);
  }
  if (method === "GET" && orderId) {
    return getGuestOrder(env, orderId);
  }
  return errorResponse("Method not allowed", 405);
}
__name(handleGuestOrder, "handleGuestOrder");
async function createGuestOrder(request, env) {
  try {
    const data = await request.json();
    const { siteId, items, shippingAddress, customerName, customerEmail, customerPhone, paymentMethod } = data;
    if (!siteId || !items || !items.length || !shippingAddress || !customerName || !customerPhone) {
      return errorResponse("Missing required fields");
    }
    let subtotal = 0;
    const processedItems = [];
    for (const item of items) {
      const product = await env.DB.prepare(
        "SELECT id, name, price, stock, thumbnail_url FROM products WHERE id = ? AND site_id = ?"
      ).bind(item.productId, siteId).first();
      if (!product) {
        return errorResponse(`Product ${item.productId} not found`, 400);
      }
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      processedItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal,
        thumbnail: product.thumbnail_url
      });
    }
    const total = subtotal;
    const orderId = generateId();
    const orderNumber = generateOrderNumber();
    await env.DB.prepare(
      `INSERT INTO guest_orders (id, site_id, order_number, items, subtotal, total, payment_method, shipping_address, customer_name, customer_email, customer_phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      orderId,
      siteId,
      orderNumber,
      JSON.stringify(processedItems),
      subtotal,
      total,
      paymentMethod || "cod",
      JSON.stringify(shippingAddress),
      customerName,
      customerEmail || null,
      customerPhone
    ).run();
    for (const item of processedItems) {
      await updateProductStock(env, item.productId, item.quantity, "decrement");
    }
    return successResponse({
      id: orderId,
      orderNumber,
      total
    }, "Guest order created successfully");
  } catch (error) {
    console.error("Create guest order error:", error);
    return errorResponse("Failed to create order", 500);
  }
}
__name(createGuestOrder, "createGuestOrder");
async function getGuestOrder(env, orderNumber) {
  try {
    const order = await env.DB.prepare(
      "SELECT * FROM guest_orders WHERE order_number = ?"
    ).bind(orderNumber).first();
    if (!order) {
      return errorResponse("Order not found", 404);
    }
    return successResponse({
      ...order,
      items: JSON.parse(order.items),
      shipping_address: JSON.parse(order.shipping_address)
    });
  } catch (error) {
    console.error("Get guest order error:", error);
    return errorResponse("Failed to fetch order", 500);
  }
}
__name(getGuestOrder, "getGuestOrder");
async function trackOrder(env, orderNumber) {
  try {
    let order = await env.DB.prepare(
      "SELECT order_number, status, tracking_number, carrier, shipped_at, delivered_at, created_at FROM orders WHERE order_number = ?"
    ).bind(orderNumber).first();
    if (!order) {
      order = await env.DB.prepare(
        "SELECT order_number, status, tracking_number, carrier, created_at FROM guest_orders WHERE order_number = ?"
      ).bind(orderNumber).first();
    }
    if (!order) {
      return errorResponse("Order not found", 404);
    }
    return successResponse(order);
  } catch (error) {
    console.error("Track order error:", error);
    return errorResponse("Failed to track order", 500);
  }
}
__name(trackOrder, "trackOrder");

// workers/cart-worker.js
async function handleCart(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const method = request.method;
  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId");
  if (!siteId) {
    return errorResponse("Site ID is required");
  }
  const user = await validateAuth(request, env);
  const sessionId = request.headers.get("X-Session-ID") || url.searchParams.get("sessionId");
  if (!user && !sessionId) {
    return errorResponse("User authentication or session ID required");
  }
  switch (method) {
    case "GET":
      return getCart(env, siteId, user, sessionId);
    case "POST":
      return addToCart(request, env, siteId, user, sessionId);
    case "PUT":
      return updateCartItem(request, env, siteId, user, sessionId);
    case "DELETE":
      return removeFromCart(request, env, siteId, user, sessionId);
    default:
      return errorResponse("Method not allowed", 405);
  }
}
__name(handleCart, "handleCart");
async function getOrCreateCart(env, siteId, user, sessionId) {
  let cart;
  if (user) {
    cart = await env.DB.prepare(
      "SELECT * FROM carts WHERE site_id = ? AND user_id = ?"
    ).bind(siteId, user.id).first();
  } else {
    cart = await env.DB.prepare(
      "SELECT * FROM carts WHERE site_id = ? AND session_id = ?"
    ).bind(siteId, sessionId).first();
  }
  if (!cart) {
    const cartId = generateId();
    await env.DB.prepare(
      `INSERT INTO carts (id, site_id, user_id, session_id, items, subtotal, created_at)
       VALUES (?, ?, ?, ?, '[]', 0, datetime('now'))`
    ).bind(cartId, siteId, user ? user.id : null, user ? null : sessionId).run();
    cart = { id: cartId, items: "[]", subtotal: 0 };
  }
  return cart;
}
__name(getOrCreateCart, "getOrCreateCart");
async function getCart(env, siteId, user, sessionId) {
  try {
    const cart = await getOrCreateCart(env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const enrichedItems = [];
    for (const item of items) {
      const product = await env.DB.prepare(
        "SELECT id, name, price, stock, thumbnail_url, is_active FROM products WHERE id = ?"
      ).bind(item.productId).first();
      if (product && product.is_active) {
        enrichedItems.push({
          ...item,
          name: product.name,
          price: product.price,
          thumbnail: product.thumbnail_url,
          inStock: product.stock >= item.quantity,
          availableStock: product.stock
        });
      }
    }
    const subtotal = enrichedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return successResponse({
      id: cart.id,
      items: enrichedItems,
      itemCount: enrichedItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal
    });
  } catch (error) {
    console.error("Get cart error:", error);
    return errorResponse("Failed to fetch cart", 500);
  }
}
__name(getCart, "getCart");
async function addToCart(request, env, siteId, user, sessionId) {
  try {
    const { productId, quantity, variant } = await request.json();
    if (!productId || !quantity || quantity < 1) {
      return errorResponse("Product ID and quantity are required");
    }
    const product = await env.DB.prepare(
      "SELECT id, stock, is_active FROM products WHERE id = ? AND site_id = ?"
    ).bind(productId, siteId).first();
    if (!product) {
      return errorResponse("Product not found", 404);
    }
    if (!product.is_active) {
      return errorResponse("Product is not available", 400);
    }
    if (product.stock < quantity) {
      return errorResponse("Insufficient stock", 400, "INSUFFICIENT_STOCK");
    }
    const cart = await getOrCreateCart(env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const existingIndex = items.findIndex(
      (item) => item.productId === productId && JSON.stringify(item.variant) === JSON.stringify(variant)
    );
    if (existingIndex >= 0) {
      const newQuantity = items[existingIndex].quantity + quantity;
      if (newQuantity > product.stock) {
        return errorResponse("Insufficient stock", 400, "INSUFFICIENT_STOCK");
      }
      items[existingIndex].quantity = newQuantity;
    } else {
      items.push({
        productId,
        quantity,
        variant: variant || null,
        addedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    await env.DB.prepare(
      `UPDATE carts SET items = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(JSON.stringify(items), cart.id).run();
    return successResponse({ itemCount: items.reduce((sum, i) => sum + i.quantity, 0) }, "Item added to cart");
  } catch (error) {
    console.error("Add to cart error:", error);
    return errorResponse("Failed to add item to cart", 500);
  }
}
__name(addToCart, "addToCart");
async function updateCartItem(request, env, siteId, user, sessionId) {
  try {
    const { productId, quantity, variant } = await request.json();
    if (!productId) {
      return errorResponse("Product ID is required");
    }
    const cart = await getOrCreateCart(env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const existingIndex = items.findIndex(
      (item) => item.productId === productId && JSON.stringify(item.variant) === JSON.stringify(variant)
    );
    if (existingIndex < 0) {
      return errorResponse("Item not found in cart", 404);
    }
    if (quantity <= 0) {
      items.splice(existingIndex, 1);
    } else {
      const product = await env.DB.prepare(
        "SELECT stock FROM products WHERE id = ?"
      ).bind(productId).first();
      if (product && quantity > product.stock) {
        return errorResponse("Insufficient stock", 400, "INSUFFICIENT_STOCK");
      }
      items[existingIndex].quantity = quantity;
    }
    await env.DB.prepare(
      `UPDATE carts SET items = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(JSON.stringify(items), cart.id).run();
    return successResponse({ itemCount: items.reduce((sum, i) => sum + i.quantity, 0) }, "Cart updated");
  } catch (error) {
    console.error("Update cart error:", error);
    return errorResponse("Failed to update cart", 500);
  }
}
__name(updateCartItem, "updateCartItem");
async function removeFromCart(request, env, siteId, user, sessionId) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    const variant = url.searchParams.get("variant");
    if (!productId) {
      return errorResponse("Product ID is required");
    }
    const cart = await getOrCreateCart(env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const filteredItems = items.filter(
      (item) => !(item.productId === productId && JSON.stringify(item.variant) === variant)
    );
    await env.DB.prepare(
      `UPDATE carts SET items = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(JSON.stringify(filteredItems), cart.id).run();
    return successResponse({ itemCount: filteredItems.reduce((sum, i) => sum + i.quantity, 0) }, "Item removed from cart");
  } catch (error) {
    console.error("Remove from cart error:", error);
    return errorResponse("Failed to remove item from cart", 500);
  }
}
__name(removeFromCart, "removeFromCart");

// workers/wishlist-worker.js
async function handleWishlist(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  const method = request.method;
  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId");
  if (!siteId) {
    return errorResponse("Site ID is required");
  }
  switch (method) {
    case "GET":
      return getWishlist(env, user, siteId);
    case "POST":
      return addToWishlist(request, env, user, siteId);
    case "DELETE":
      return removeFromWishlist(request, env, user, siteId);
    default:
      return errorResponse("Method not allowed", 405);
  }
}
__name(handleWishlist, "handleWishlist");
async function getWishlist(env, user, siteId) {
  try {
    const wishlistItems = await env.DB.prepare(
      `SELECT w.id, w.product_id, w.created_at,
              p.name, p.price, p.compare_price, p.thumbnail_url, p.stock, p.is_active
       FROM wishlists w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = ? AND w.site_id = ?
       ORDER BY w.created_at DESC`
    ).bind(user.id, siteId).all();
    const items = wishlistItems.results.map((item) => ({
      id: item.id,
      productId: item.product_id,
      name: item.name,
      price: item.price,
      comparePrice: item.compare_price,
      thumbnail: item.thumbnail_url,
      inStock: item.stock > 0,
      isActive: !!item.is_active,
      addedAt: item.created_at
    }));
    return successResponse({
      items,
      count: items.length
    });
  } catch (error) {
    console.error("Get wishlist error:", error);
    return errorResponse("Failed to fetch wishlist", 500);
  }
}
__name(getWishlist, "getWishlist");
async function addToWishlist(request, env, user, siteId) {
  try {
    const { productId } = await request.json();
    if (!productId) {
      return errorResponse("Product ID is required");
    }
    const product = await env.DB.prepare(
      "SELECT id FROM products WHERE id = ? AND site_id = ? AND is_active = 1"
    ).bind(productId, siteId).first();
    if (!product) {
      return errorResponse("Product not found", 404);
    }
    const existing = await env.DB.prepare(
      "SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?"
    ).bind(user.id, productId).first();
    if (existing) {
      return errorResponse("Product already in wishlist", 400, "ALREADY_EXISTS");
    }
    const wishlistId = generateId();
    await env.DB.prepare(
      `INSERT INTO wishlists (id, site_id, user_id, product_id, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(wishlistId, siteId, user.id, productId).run();
    return successResponse({ id: wishlistId }, "Added to wishlist");
  } catch (error) {
    console.error("Add to wishlist error:", error);
    return errorResponse("Failed to add to wishlist", 500);
  }
}
__name(addToWishlist, "addToWishlist");
async function removeFromWishlist(request, env, user, siteId) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    if (!productId) {
      return errorResponse("Product ID is required");
    }
    await env.DB.prepare(
      "DELETE FROM wishlists WHERE user_id = ? AND product_id = ? AND site_id = ?"
    ).bind(user.id, productId, siteId).run();
    return successResponse(null, "Removed from wishlist");
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    return errorResponse("Failed to remove from wishlist", 500);
  }
}
__name(removeFromWishlist, "removeFromWishlist");

// workers/payments-worker.js
import crypto2 from "node:crypto";
async function handlePayments(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const pathParts = path.split("/").filter(Boolean);
  const action = pathParts[2];
  switch (action) {
    case "create-order":
      return createRazorpayOrder(request, env);
    case "verify":
      return verifyPayment(request, env);
    case "subscription":
      return handleSubscription(request, env);
    default:
      return errorResponse("Not found", 404);
  }
}
__name(handlePayments, "handlePayments");
async function createRazorpayOrder(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { amount, currency, receipt, notes, orderId, type } = await request.json();
    if (!amount) {
      return errorResponse("Amount is required");
    }
    const amountInPaise = Math.round(amount * 100);
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: currency || "INR",
        receipt: receipt || `order_${Date.now()}`,
        notes: notes || {}
      })
    });
    if (!response.ok) {
      const error = await response.json();
      console.error("Razorpay error:", error);
      return errorResponse("Failed to create payment order", 500);
    }
    const razorpayOrder = await response.json();
    await env.DB.prepare(
      `INSERT INTO payment_transactions (id, order_id, razorpay_order_id, amount, currency, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))`
    ).bind(generateId(), orderId || null, razorpayOrder.id, amount, currency || "INR").run();
    return successResponse({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("Create order error:", error);
    return errorResponse("Failed to create payment order", 500);
  }
}
__name(createRazorpayOrder, "createRazorpayOrder");
async function verifyPayment(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  if (!env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_KEY_ID) {
    return errorResponse("Razorpay credentials missing", 500);
  }
  try {
    await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS payment_transactions (
            id TEXT PRIMARY KEY,
            site_id TEXT,
            user_id TEXT,
            order_id TEXT,
            subscription_id TEXT,
            razorpay_order_id TEXT,
            razorpay_payment_id TEXT,
            razorpay_signature TEXT,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'INR',
            status TEXT DEFAULT 'pending',
            payment_method TEXT,
            error_code TEXT,
            error_description TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
            FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
        )
    `).run();
    await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            plan TEXT NOT NULL,
            billing_cycle TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'INR',
            status TEXT DEFAULT 'active',
            razorpay_subscription_id TEXT,
            current_period_start TEXT,
            current_period_end TEXT,
            cancelled_at TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `).run();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, billingCycle } = await request.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return errorResponse("Missing payment verification data");
    }
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const computedSignature = crypto2.createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(body).digest("hex");
    console.log("VerifyPayment: signature match?", computedSignature === razorpay_signature);
    console.log("VerifyPayment: receivedSignature:", razorpay_signature);
    console.log("VerifyPayment: computedSignature:", computedSignature);
    if (computedSignature !== razorpay_signature) {
      return errorResponse("Invalid payment signature", 400, "INVALID_SIGNATURE");
    }
    await env.DB.prepare(
      `UPDATE payment_transactions 
       SET razorpay_payment_id = ?, razorpay_signature = ?, status = 'completed', payment_method = 'razorpay'
       WHERE razorpay_order_id = ?`
    ).bind(razorpay_payment_id, razorpay_signature, razorpay_order_id).run();
    if (planId && billingCycle) {
      const user = await validateAuth(request, env);
      if (user) {
        console.log(`Activating subscription: user=${user.id}, plan=${planId}, cycle=${billingCycle}`);
        const activated = await activateSubscription(env, user.id, planId, billingCycle, razorpay_payment_id);
        if (!activated) {
          console.error("Failed to activate subscription in verifyPayment");
        } else {
          console.log("Subscription activated successfully");
        }
      } else {
        console.error("User not authenticated during payment verification");
      }
    }
    return successResponse({ verified: true, planActivated: true }, "Payment verified and plan activated successfully");
  } catch (error) {
    console.error("Verify payment error:", error);
    return errorResponse("Payment verification failed", 500);
  }
}
__name(verifyPayment, "verifyPayment");
async function handleSubscription(request, env) {
  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }
  if (request.method === "GET") {
    return getUserSubscription(env, user);
  }
  if (request.method === "POST") {
    return createSubscriptionOrder(request, env, user);
  }
  return errorResponse("Method not allowed", 405);
}
__name(handleSubscription, "handleSubscription");
async function getUserSubscription(env, user) {
  try {
    const subscription = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
    ).bind(user.id).first();
    if (!subscription) {
      return successResponse({ plan: "free", status: "none" });
    }
    return successResponse({
      id: subscription.id,
      plan: subscription.plan,
      billingCycle: subscription.billing_cycle,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return errorResponse("Failed to fetch subscription", 500);
  }
}
__name(getUserSubscription, "getUserSubscription");
async function createSubscriptionOrder(request, env, user) {
  try {
    const { planId, billingCycle } = await request.json();
    const plans = {
      basic: { monthly: 99, "6months": 499, yearly: 899 },
      premium: { monthly: 299, "6months": 1499, yearly: 2499 },
      pro: { monthly: 999, "6months": 4999, yearly: 8999 }
    };
    if (!plans[planId] || !plans[planId][billingCycle]) {
      return errorResponse("Invalid plan or billing cycle");
    }
    const amount = plans[planId][billingCycle];
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amount * 100,
        currency: "INR",
        receipt: `sub_${user.id.slice(0, 8)}_${Date.now().toString(36)}`,
        notes: {
          userId: user.id,
          planId,
          billingCycle,
          type: "subscription"
        }
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = errorText;
      }
      console.error("Razorpay Error Response:", errorData);
      const errorMessage = errorData && errorData.error && errorData.error.description ? `Razorpay error: ${errorData.error.description}` : "Failed to create subscription order";
      return errorResponse(errorMessage, 500);
    }
    const razorpayOrder = await response.json();
    return successResponse({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: env.RAZORPAY_KEY_ID,
      planId,
      billingCycle
    });
  } catch (error) {
    console.error("Create subscription order error:", error);
    return errorResponse("Failed to create subscription order", 500);
  }
}
__name(createSubscriptionOrder, "createSubscriptionOrder");
async function activateSubscription(env, userId, planId, billingCycle, razorpayPaymentId) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan TEXT NOT NULL,
        billing_cycle TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        status TEXT DEFAULT 'active',
        razorpay_subscription_id TEXT,
        current_period_start TEXT,
        current_period_end TEXT,
        cancelled_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();
    const userSub = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY current_period_end DESC LIMIT 1`
    ).bind(userId).first();
    const periodMonths = billingCycle === "monthly" ? 1 : billingCycle === "6months" ? 6 : 12;
    let periodStart = /* @__PURE__ */ new Date();
    if (userSub && userSub.current_period_end) {
      const currentEnd = new Date(userSub.current_period_end);
      if (currentEnd > periodStart) {
        periodStart = currentEnd;
      }
    }
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + periodMonths);
    await env.DB.prepare(
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now') WHERE user_id = ? AND status = 'active' AND id != ?`
    ).bind(userId, userSub?.id || "").run();
    const plans = {
      basic: { monthly: 99, "6months": 499, yearly: 899 },
      premium: { monthly: 299, "6months": 1499, yearly: 2499 },
      pro: { monthly: 999, "6months": 4999, yearly: 8999 }
    };
    await env.DB.prepare(
      `INSERT INTO subscriptions (id, user_id, plan, billing_cycle, amount, status, current_period_start, current_period_end, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, datetime('now'))`
    ).bind(
      generateId(),
      userId,
      planId,
      billingCycle,
      plans[planId][billingCycle],
      periodStart.toISOString(),
      periodEnd.toISOString()
    ).run();
    console.log(`Inserted subscription record for user ${userId}`);
    await env.DB.prepare(
      `UPDATE users SET updated_at = datetime('now') WHERE id = ?`
    ).bind(userId).run();
    await env.DB.prepare(
      `UPDATE sites SET subscription_plan = ?, subscription_expires_at = ?, updated_at = datetime('now') WHERE user_id = ?`
    ).bind(planId, periodEnd.toISOString(), userId).run();
    console.log(`Updated sites table for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Activate subscription error:", error);
    if (error.message)
      console.error("Error message:", error.message);
    return false;
  }
}
__name(activateSubscription, "activateSubscription");

// workers/categories-worker.js
async function handleCategories(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const method = request.method;
  const url = new URL(request.url);
  const pathParts = path.split("/").filter(Boolean);
  const categoryId = pathParts[2];
  if (method === "GET") {
    const siteId = url.searchParams.get("siteId");
    const subdomain = url.searchParams.get("subdomain");
    const slug = url.searchParams.get("slug");
    if (categoryId) {
      return getCategory(env, categoryId);
    }
    return getCategories(env, { siteId, subdomain, slug });
  }
  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  switch (method) {
    case "POST":
      return createCategory(request, env, user);
    case "PUT":
      return updateCategory(request, env, user, categoryId);
    case "DELETE":
      return deleteCategory(env, user, categoryId);
    default:
      return errorResponse("Method not allowed", 405);
  }
}
__name(handleCategories, "handleCategories");
async function getCategories(env, { siteId, subdomain, slug }) {
  try {
    let query = `SELECT c.*, 
                   (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
                 FROM categories c WHERE 1=1`;
    const bindings = [];
    if (siteId) {
      query += " AND c.site_id = ?";
      bindings.push(siteId);
    } else if (subdomain) {
      query = `SELECT c.*, 
                 (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
               FROM categories c 
               JOIN sites s ON c.site_id = s.id 
               WHERE s.subdomain = ?`;
      bindings.push(subdomain);
    } else {
      query += " AND 1=0";
    }
    if (slug) {
      query += " AND c.slug = ?";
      bindings.push(slug);
    }
    query += " ORDER BY c.display_order, c.name";
    const categories = await env.DB.prepare(query).bind(...bindings).all();
    const parentCategories = categories.results.filter((c) => !c.parent_id);
    const result = parentCategories.map((parent) => ({
      ...parent,
      children: categories.results.filter((c) => c.parent_id === parent.id)
    }));
    return successResponse(result);
  } catch (error) {
    console.error("Get categories error:", error);
    return errorResponse("Failed to fetch categories", 500);
  }
}
__name(getCategories, "getCategories");
async function getCategory(env, categoryId) {
  try {
    const category = await env.DB.prepare(
      `SELECT c.*, s.subdomain, s.brand_name
       FROM categories c 
       JOIN sites s ON c.site_id = s.id 
       WHERE c.id = ?`
    ).bind(categoryId).first();
    if (!category) {
      return errorResponse("Category not found", 404, "NOT_FOUND");
    }
    const children = await env.DB.prepare(
      "SELECT * FROM categories WHERE parent_id = ? ORDER BY display_order"
    ).bind(categoryId).all();
    return successResponse({
      ...category,
      children: children.results
    });
  } catch (error) {
    console.error("Get category error:", error);
    return errorResponse("Failed to fetch category", 500);
  }
}
__name(getCategory, "getCategory");
async function createCategory(request, env, user) {
  try {
    const { siteId, name, description, parentId, imageUrl, displayOrder } = await request.json();
    if (!siteId || !name) {
      return errorResponse("Site ID and name are required");
    }
    const site = await env.DB.prepare(
      "SELECT id FROM sites WHERE id = ? AND user_id = ?"
    ).bind(siteId, user.id).first();
    if (!site) {
      return errorResponse("Site not found or unauthorized", 404);
    }
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
    const existing = await env.DB.prepare(
      "SELECT id FROM categories WHERE site_id = ? AND slug = ?"
    ).bind(siteId, slug).first();
    if (existing) {
      return errorResponse("Category with this name already exists", 400, "SLUG_EXISTS");
    }
    const categoryId = generateId();
    await env.DB.prepare(
      `INSERT INTO categories (id, site_id, name, slug, description, parent_id, image_url, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      categoryId,
      siteId,
      sanitizeInput(name),
      slug,
      description || null,
      parentId || null,
      imageUrl || null,
      displayOrder || 0
    ).run();
    return successResponse({ id: categoryId, slug }, "Category created successfully");
  } catch (error) {
    console.error("Create category error:", error);
    return errorResponse("Failed to create category", 500);
  }
}
__name(createCategory, "createCategory");
async function updateCategory(request, env, user, categoryId) {
  if (!categoryId) {
    return errorResponse("Category ID is required");
  }
  try {
    const category = await env.DB.prepare(
      `SELECT c.id, c.site_id FROM categories c 
       JOIN sites s ON c.site_id = s.id 
       WHERE c.id = ? AND s.user_id = ?`
    ).bind(categoryId, user.id).first();
    if (!category) {
      return errorResponse("Category not found or unauthorized", 404);
    }
    const updates = await request.json();
    const allowedFields = ["name", "description", "parent_id", "image_url", "display_order", "is_active"];
    const setClause = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (allowedFields.includes(dbKey)) {
        setClause.push(`${dbKey} = ?`);
        if (typeof value === "boolean") {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    }
    if (updates.name) {
      const slug = updates.name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
      setClause.push("slug = ?");
      values.push(slug);
    }
    if (setClause.length === 0) {
      return errorResponse("No valid fields to update");
    }
    setClause.push('updated_at = datetime("now")');
    values.push(categoryId);
    await env.DB.prepare(
      `UPDATE categories SET ${setClause.join(", ")} WHERE id = ?`
    ).bind(...values).run();
    return successResponse(null, "Category updated successfully");
  } catch (error) {
    console.error("Update category error:", error);
    return errorResponse("Failed to update category", 500);
  }
}
__name(updateCategory, "updateCategory");
async function deleteCategory(env, user, categoryId) {
  if (!categoryId) {
    return errorResponse("Category ID is required");
  }
  try {
    const category = await env.DB.prepare(
      `SELECT c.id FROM categories c 
       JOIN sites s ON c.site_id = s.id 
       WHERE c.id = ? AND s.user_id = ?`
    ).bind(categoryId, user.id).first();
    if (!category) {
      return errorResponse("Category not found or unauthorized", 404);
    }
    await env.DB.prepare(
      "UPDATE categories SET parent_id = NULL WHERE parent_id = ?"
    ).bind(categoryId).run();
    await env.DB.prepare(
      "UPDATE products SET category_id = NULL WHERE category_id = ?"
    ).bind(categoryId).run();
    await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(categoryId).run();
    return successResponse(null, "Category deleted successfully");
  } catch (error) {
    console.error("Delete category error:", error);
    return errorResponse("Failed to delete category", 500);
  }
}
__name(deleteCategory, "deleteCategory");

// workers/users-worker.js
async function handleUsers(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  const pathParts = path.split("/").filter(Boolean);
  const action = pathParts[2];
  switch (action) {
    case "profile":
      return handleProfile(request, env, user);
    case "subscription":
      return handleSubscription2(request, env, user);
    default:
      return errorResponse("Not found", 404);
  }
}
__name(handleUsers, "handleUsers");
async function handleProfile(request, env, user) {
  if (request.method === "GET") {
    return getProfile(env, user);
  }
  if (request.method === "PUT" || request.method === "PATCH") {
    return updateProfile(request, env, user);
  }
  return errorResponse("Method not allowed", 405);
}
__name(handleProfile, "handleProfile");
async function getProfile(env, user) {
  try {
    let profile = null;
    let subscription = null;
    profile = await env.DB.prepare(
      `SELECT id, email, name, phone, email_verified FROM users WHERE id = ?`
    ).bind(user.id).first();
    if (!profile) {
      return errorResponse("User not found", 404);
    }
    try {
      subscription = await env.DB.prepare(
        `SELECT plan, billing_cycle, status, current_period_start, current_period_end 
         FROM subscriptions 
         WHERE user_id = ? AND status = 'active' 
         ORDER BY created_at DESC 
         LIMIT 1`
      ).bind(user.id).first();
    } catch (subError) {
      console.error("Subscription query error (table may not exist):", subError);
    }
    return successResponse({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      emailVerified: !!profile.email_verified,
      plan: subscription?.plan || null,
      billingCycle: subscription?.billing_cycle || null,
      status: subscription?.status || "none",
      trialStartDate: subscription?.current_period_start || null,
      trialEndDate: subscription?.current_period_end || null
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return errorResponse("Failed to fetch profile", 500);
  }
}
__name(getProfile, "getProfile");
async function updateProfile(request, env, user) {
  try {
    const updates = await request.json();
    const { name, phone } = updates;
    await env.DB.prepare(
      `UPDATE users SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        updated_at = datetime('now')
       WHERE id = ?`
    ).bind(name || null, phone || null, user.id).run();
    return successResponse(null, "Profile updated successfully");
  } catch (error) {
    console.error("Update profile error:", error);
    return errorResponse("Failed to update profile", 500);
  }
}
__name(updateProfile, "updateProfile");
async function handleSubscription2(request, env, user) {
  if (request.method === "GET") {
    return getSubscription(env, user);
  }
  if (request.method === "PATCH" || request.method === "PUT") {
    return updateSubscription(request, env, user);
  }
  return errorResponse("Method not allowed", 405);
}
__name(handleSubscription2, "handleSubscription");
async function getSubscription(env, user) {
  try {
    let subscription = null;
    try {
      subscription = await env.DB.prepare(
        `SELECT * FROM subscriptions 
         WHERE user_id = ? AND status = 'active' 
         ORDER BY created_at DESC 
         LIMIT 1`
      ).bind(user.id).first();
    } catch (subError) {
      console.error("Subscription query error (table may not exist):", subError);
      return successResponse({
        plan: null,
        status: "none",
        billingCycle: null
      });
    }
    if (!subscription) {
      return successResponse({
        plan: null,
        status: "none",
        billingCycle: null
      });
    }
    return successResponse({
      id: subscription.id,
      plan: subscription.plan,
      billingCycle: subscription.billing_cycle,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return errorResponse("Failed to fetch subscription", 500);
  }
}
__name(getSubscription, "getSubscription");
async function ensureSubscriptionsTable(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan TEXT NOT NULL,
        billing_cycle TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        status TEXT DEFAULT 'active',
        razorpay_subscription_id TEXT,
        current_period_start TEXT,
        current_period_end TEXT,
        cancelled_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();
    return true;
  } catch (error) {
    console.error("Failed to ensure subscriptions table:", error);
    return false;
  }
}
__name(ensureSubscriptionsTable, "ensureSubscriptionsTable");
async function updateSubscription(request, env, user) {
  try {
    const { plan, billingCycle, status } = await request.json();
    await ensureSubscriptionsTable(env);
    const subscriptionPlans = {
      trial: { monthly: 0, "6months": 0, yearly: 0, rank: 0 },
      basic: { monthly: 99, "6months": 499, yearly: 899, rank: 1 },
      premium: { monthly: 299, "6months": 1499, yearly: 2499, rank: 2 },
      pro: { monthly: 999, "6months": 4999, yearly: 8999, rank: 3 }
    };
    let existingSubscription = null;
    try {
      existingSubscription = await env.DB.prepare(
        `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active'`
      ).bind(user.id).first();
    } catch (e) {
      console.error("Error checking existing subscription:", e);
    }
    if (existingSubscription) {
      if (status === "expired" || status === "cancelled") {
        await env.DB.prepare(
          `UPDATE subscriptions SET status = ?, cancelled_at = datetime('now') WHERE id = ?`
        ).bind(status, existingSubscription.id).run();
        return successResponse(null, "Subscription updated");
      }
      if (plan && subscriptionPlans[plan] && subscriptionPlans[existingSubscription.plan]) {
        const isDowngrade = subscriptionPlans[plan].rank < subscriptionPlans[existingSubscription.plan].rank;
        const isExpired2 = existingSubscription.current_period_end && new Date(existingSubscription.current_period_end) < /* @__PURE__ */ new Date();
        if (isDowngrade && !isExpired2) {
          return errorResponse("You can only downgrade after your current plan expires", 400);
        }
      }
      let periodEnd2 = existingSubscription.current_period_end;
      const newPlan = plan || existingSubscription.plan;
      const newCycle = billingCycle || existingSubscription.billing_cycle;
      if (plan || billingCycle) {
        let periodDays2 = 30;
        if (newCycle === "6months")
          periodDays2 = 180;
        if (newCycle === "yearly")
          periodDays2 = 365;
        if (newPlan === "trial")
          periodDays2 = 7;
        const date = /* @__PURE__ */ new Date();
        date.setDate(date.getDate() + periodDays2);
        periodEnd2 = date.toISOString();
      }
      const amount2 = newPlan === "trial" ? 0 : subscriptionPlans[newPlan]?.[newCycle] || 0;
      await env.DB.prepare(
        `UPDATE subscriptions SET 
          plan = COALESCE(?, plan),
          billing_cycle = COALESCE(?, billing_cycle),
          status = COALESCE(?, status),
          amount = ?,
          current_period_start = datetime('now'),
          current_period_end = ?,
          updated_at = datetime('now')
         WHERE id = ?`
      ).bind(plan || null, billingCycle || null, status || null, amount2, periodEnd2, existingSubscription.id).run();
      return successResponse(null, "Subscription updated");
    }
    let periodDays = 30;
    if (billingCycle === "6months")
      periodDays = 180;
    if (billingCycle === "yearly")
      periodDays = 365;
    if (plan === "trial")
      periodDays = 7;
    const periodEnd = /* @__PURE__ */ new Date();
    periodEnd.setDate(periodEnd.getDate() + periodDays);
    const amount = plan === "trial" ? 0 : subscriptionPlans[plan]?.[billingCycle] || 0;
    await env.DB.prepare(
      `INSERT INTO subscriptions (id, user_id, plan, billing_cycle, amount, status, current_period_start, current_period_end, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'))`
    ).bind(
      generateId(),
      user.id,
      plan,
      billingCycle || "monthly",
      amount,
      status || "active",
      periodEnd.toISOString()
    ).run();
    return successResponse(null, "Subscription created");
  } catch (error) {
    console.error("Update subscription error:", error);
    return errorResponse("Failed to update subscription", 500);
  }
}
__name(updateSubscription, "updateSubscription");

// workers/site-router.js
var STATIC_EXTENSIONS = [
  ".css",
  ".js",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  ".map",
  ".json"
];
function isStaticAsset(path) {
  const lowerPath = path.toLowerCase();
  const hasStaticExtension = STATIC_EXTENSIONS.some((ext) => lowerPath.endsWith(ext));
  const hasStaticDir = lowerPath.includes("/css/") || lowerPath.includes("/js/") || lowerPath.includes("/images/") || lowerPath.includes("/fonts/") || lowerPath.includes("/data/");
  return hasStaticExtension || hasStaticDir;
}
__name(isStaticAsset, "isStaticAsset");
function getContentType(path) {
  const ext = path.split(".").pop().toLowerCase();
  const contentTypes = {
    "css": "text/css",
    "js": "application/javascript",
    "json": "application/json",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "gif": "image/gif",
    "svg": "image/svg+xml",
    "webp": "image/webp",
    "ico": "image/x-icon",
    "woff": "font/woff",
    "woff2": "font/woff2",
    "ttf": "font/ttf",
    "eot": "application/vnd.ms-fontobject",
    "otf": "font/otf",
    "map": "application/json"
  };
  return contentTypes[ext] || "application/octet-stream";
}
__name(getContentType, "getContentType");
async function handleSiteRouting(request, env) {
  const url = new URL(request.url);
  const hostname = url.hostname;
  const hostParts = hostname.split(".");
  let subdomain = null;
  if (hostname.endsWith("fluxe.in")) {
    if (hostParts.length >= 3 && hostParts[0] !== "www") {
      subdomain = hostParts[0];
    }
  } else if (hostname.endsWith("pages.dev")) {
    if (hostParts.length >= 4) {
      subdomain = hostParts[0];
    }
  }
  const subdomainParam = url.searchParams.get("subdomain");
  if (subdomainParam) {
    subdomain = subdomainParam;
  }
  if (!subdomain) {
    return null;
  }
  const path = url.pathname;
  if (path.startsWith("/api/")) {
    return null;
  }
  try {
    const site = await env.DB.prepare(
      `SELECT * FROM sites WHERE subdomain = ? AND is_active = 1`
    ).bind(subdomain).first();
    if (!site) {
      return new Response("Site not found", {
        status: 404,
        headers: corsHeaders()
      });
    }
    const isExpired2 = site.subscription_expires_at && new Date(site.subscription_expires_at) < /* @__PURE__ */ new Date();
    if (isExpired2 && !path.startsWith("/api/")) {
      return new Response(
        `<html>
          <head>
            <title>Site Disabled - Fluxe</title>
            <style>
              body { font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
              .container { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 400px; }
              h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #ef4444; }
              p { color: #64748b; line-height: 1.6; margin-bottom: 2rem; }
              .btn { background: #2563eb; color: white; padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Site Disabled</h1>
              <p>The subscription for <strong>${site.brand_name || subdomain}</strong> has expired. Please contact the site owner or renew the plan to restore access.</p>
              <a href="https://fluxe.in" class="btn">Go to Fluxe</a>
            </div>
          </body>
        </html>`,
        {
          status: 402,
          headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() }
        }
      );
    }
    const templateId = site.template_id || "template1";
    if (isStaticAsset(path)) {
      return serveStaticAsset(env, templateId, path);
    }
    let categoriesResult = { results: [] };
    try {
      categoriesResult = await env.DB.prepare(
        "SELECT * FROM categories WHERE site_id = ? ORDER BY display_order"
      ).bind(site.id).all();
    } catch (catError) {
      console.error("Categories query failed:", catError);
    }
    const categories = categoriesResult;
    let settings = {};
    let socialLinks = {};
    try {
      if (site.settings)
        settings = JSON.parse(site.settings);
    } catch (e) {
    }
    try {
      if (site.social_links)
        socialLinks = JSON.parse(site.social_links);
    } catch (e) {
    }
    const siteData = {
      id: site.id,
      subdomain: site.subdomain,
      brandName: site.brand_name,
      category: site.category,
      templateId,
      logoUrl: site.logo_url,
      faviconUrl: site.favicon_url,
      primaryColor: site.primary_color,
      secondaryColor: site.secondary_color,
      phone: site.phone,
      email: site.email,
      address: site.address,
      socialLinks,
      settings,
      categories: categories.results,
      subscriptionPlan: site.subscription_plan
    };
    if (path === "/" || path === "/index.html") {
      return serveTemplate(env, templateId, "index.html", siteData);
    }
    const categoryMatch = path.match(/^\/category\/([a-z0-9-]+)\/?$/i);
    if (categoryMatch) {
      const categorySlug = categoryMatch[1];
      const category = categories.results.find((c) => c.slug === categorySlug);
      if (category) {
        return serveTemplate(env, templateId, "category.html", {
          ...siteData,
          currentCategory: category
        });
      }
    }
    const productMatch = path.match(/^\/product\/([a-z0-9-]+)\/?$/i);
    if (productMatch) {
      const productSlug = productMatch[1];
      const product = await env.DB.prepare(
        "SELECT * FROM products WHERE site_id = ? AND slug = ? AND is_active = 1"
      ).bind(site.id, productSlug).first();
      if (product) {
        return serveTemplate(env, templateId, "product.html", {
          ...siteData,
          currentProduct: {
            ...product,
            images: product.images ? JSON.parse(product.images) : []
          }
        });
      }
    }
    const staticPages = ["shop", "cart", "checkout", "login", "signup", "profile", "wishlist", "orders", "contact", "about"];
    const pageName = path.replace(/^\/|\/$/g, "").split("/")[0];
    if (staticPages.includes(pageName)) {
      return serveTemplate(env, templateId, `${pageName}.html`, siteData);
    }
    return null;
  } catch (error) {
    console.error("Site routing error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
__name(handleSiteRouting, "handleSiteRouting");
async function serveStaticAsset(env, templateId, path) {
  try {
    let cleanPath = path;
    const staticDirs = ["/css/", "/js/", "/images/", "/fonts/", "/data/"];
    for (const dir of staticDirs) {
      if (path.includes(dir)) {
        cleanPath = dir + path.split(dir).pop();
        break;
      }
    }
    const templatePath = `/templates/${templateId}${cleanPath}`;
    if (env.ASSETS) {
      try {
        const assetRequest = new Request(`https://placeholder.com${templatePath}`);
        const response2 = await env.ASSETS.fetch(assetRequest);
        if (response2.ok) {
          const contentType2 = getContentType(path);
          const headers = new Headers(response2.headers);
          headers.set("Content-Type", contentType2);
          headers.set("Cache-Control", "public, max-age=31536000");
          headers.set("Access-Control-Allow-Origin", "*");
          return new Response(response2.body, {
            status: 200,
            headers
          });
        }
      } catch (assetErr) {
        console.error("[Static] ASSETS fetch error:", assetErr);
      }
    }
    const domain = env.DOMAIN || "fluxe.in";
    const baseUrl = `https://${domain}`;
    const response = await fetch(`${baseUrl}${templatePath}`);
    if (!response.ok) {
      console.error(`[Static] Asset not found at: ${baseUrl}${templatePath}`);
      return new Response("Asset not found", { status: 404 });
    }
    const contentType = getContentType(path);
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    console.error("Serve static asset error:", error);
    return new Response("Failed to load asset", { status: 500 });
  }
}
__name(serveStaticAsset, "serveStaticAsset");
async function serveTemplate(env, templateId, fileName, siteData) {
  try {
    let html;
    const templatePath = `/templates/${templateId}/${fileName}`;
    if (env.ASSETS) {
      try {
        const assetRequest = new Request(`https://placeholder.com${templatePath}`);
        const response = await env.ASSETS.fetch(assetRequest);
        if (response.ok) {
          html = await response.text();
        }
      } catch (assetErr) {
        console.error("[Routing] ASSETS fetch error:", assetErr);
      }
    }
    if (!html) {
      const domain = env.DOMAIN || "fluxe.in";
      const baseUrl = `https://${domain}`;
      const response = await fetch(`${baseUrl}${templatePath}`);
      if (!response.ok) {
        console.error(`[Routing] Template not found at: ${baseUrl}${templatePath}`);
        return new Response("Page not found", { status: 404 });
      }
      html = await response.text();
    }
    if (!html) {
      return new Response("Page not found", { status: 404 });
    }
    html = replacePlaceholders(html, siteData);
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
        ...corsHeaders()
      }
    });
  } catch (error) {
    console.error("Serve template error:", error);
    return new Response("Failed to load page", { status: 500 });
  }
}
__name(serveTemplate, "serveTemplate");
function replacePlaceholders(html, siteData) {
  const replacements = {
    "{{brandName}}": siteData.brandName || "",
    "{{logoUrl}}": siteData.logoUrl || "/images/logo.png",
    "{{faviconUrl}}": siteData.faviconUrl || "/favicon.ico",
    "{{primaryColor}}": siteData.primaryColor || "#000000",
    "{{secondaryColor}}": siteData.secondaryColor || "#ffffff",
    "{{phone}}": siteData.phone || "",
    "{{email}}": siteData.email || "",
    "{{address}}": siteData.address || "",
    "{{siteId}}": siteData.id || "",
    "{{subdomain}}": siteData.subdomain || "",
    "{{whatsappNumber}}": siteData.phone ? siteData.phone.replace(/\D/g, "") : "",
    "{{instagramUrl}}": siteData.socialLinks?.instagram || "#",
    "{{facebookUrl}}": siteData.socialLinks?.facebook || "#",
    "{{twitterUrl}}": siteData.socialLinks?.twitter || "#",
    "{{youtubeUrl}}": siteData.socialLinks?.youtube || "#"
  };
  let result = html;
  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.split(placeholder).join(value);
  }
  if (siteData.currentCategory) {
    result = result.replace("{{categoryName}}", siteData.currentCategory.name || "");
    result = result.replace("{{categoryDescription}}", siteData.currentCategory.description || "");
    result = result.replace("{{categoryImage}}", siteData.currentCategory.image_url || "");
  }
  if (siteData.currentProduct) {
    result = result.replace("{{productName}}", siteData.currentProduct.name || "");
    result = result.replace("{{productDescription}}", siteData.currentProduct.description || "");
    result = result.replace("{{productPrice}}", siteData.currentProduct.price || "");
  }
  const navCategories = siteData.categories?.filter((c) => !c.parent_id || c.parent_id === "0" || c.parent_id === 0).map((c) => `<li class="nav-item"><a href="/category/${c.slug}" class="nav-link">${c.name}</a></li>`).join("") || "";
  result = result.replace("{{navigationCategories}}", navCategories);
  result = result.replace(/\{\{siteData\}\}/g, JSON.stringify(siteData));
  return result;
}
__name(replacePlaceholders, "replacePlaceholders");

// workers/index.js
var workers_default = {
  async fetch(request, env, ctx) {
    const corsResponse = handleCORS(request);
    if (corsResponse)
      return corsResponse;
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path.startsWith("/api/")) {
        return handleAPI(request, env, path);
      }
      const siteResponse = await handleSiteRouting(request, env);
      if (siteResponse) {
        return siteResponse;
      }
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("Worker error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
};
async function handleAPI(request, env, path) {
  const pathParts = path.split("/").filter(Boolean);
  const apiVersion = pathParts[0];
  const resource = pathParts[1];
  if (apiVersion !== "api") {
    return errorResponse("Invalid API path", 400);
  }
  switch (resource) {
    case "auth":
      return handleAuth(request, env, path);
    case "sites":
      return handleSites(request, env, path);
    case "products":
      return handleProducts(request, env, path);
    case "orders":
      return handleOrders(request, env, path);
    case "cart":
      return handleCart(request, env, path);
    case "wishlist":
      return handleWishlist(request, env, path);
    case "payments":
      return handlePayments(request, env, path);
    case "email":
      return handleEmail(request, env, path);
    case "categories":
      return handleCategories(request, env, path);
    case "users":
      return handleUsers(request, env, path);
    case "health":
      return handleHealth(env);
    case "site":
      return handleSiteInfo(request, env);
    default:
      return errorResponse("API endpoint not found", 404);
  }
}
__name(handleAPI, "handleAPI");
async function handleHealth(env) {
  try {
    const dbCheck = await env.DB.prepare("SELECT 1 as ok").first();
    return jsonResponse({
      status: "healthy",
      database: dbCheck ? "connected" : "error",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    return jsonResponse({
      status: "unhealthy",
      database: "error",
      error: error.message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }, 500);
  }
}
__name(handleHealth, "handleHealth");
async function handleSiteInfo(request, env) {
  const url = new URL(request.url);
  const subdomain = url.searchParams.get("subdomain");
  if (!subdomain) {
    return errorResponse("Subdomain is required");
  }
  try {
    const site = await env.DB.prepare(
      `SELECT s.id, s.subdomain, s.brand_name, s.category, s.template_id, 
              s.logo_url, s.favicon_url, s.primary_color, s.secondary_color,
              s.phone, s.email, s.address, s.social_links, s.settings
       FROM sites s 
       WHERE s.subdomain = ? AND s.is_active = 1`
    ).bind(subdomain).first();
    if (!site) {
      return errorResponse("Site not found", 404);
    }
    let categoriesResult = [];
    try {
      const categories = await env.DB.prepare(
        "SELECT * FROM categories WHERE site_id = ? ORDER BY display_order"
      ).bind(site.id).all();
      categoriesResult = categories.results || [];
    } catch (catError) {
      console.error("Categories query failed, attempting to auto-create table:", catError);
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            site_id TEXT NOT NULL,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            parent_id TEXT,
            description TEXT,
            image_url TEXT,
            display_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
            UNIQUE(site_id, slug)
          )
        `).run();
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_categories_site ON categories(site_id)").run();
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(site_id, slug)").run();
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)").run();
        console.log("Categories table auto-created successfully");
      } catch (createError) {
        console.error("Failed to auto-create categories table:", createError);
      }
    }
    let socialLinks = {};
    let settings = {};
    try {
      if (site.social_links)
        socialLinks = JSON.parse(site.social_links);
    } catch (e) {
    }
    try {
      if (site.settings)
        settings = JSON.parse(site.settings);
    } catch (e) {
    }
    return jsonResponse({
      success: true,
      data: {
        ...site,
        socialLinks,
        settings,
        categories: categoriesResult
      }
    });
  } catch (error) {
    console.error("Get site info error:", error);
    return errorResponse("Failed to fetch site info: " + error.message, 500);
  }
}
__name(handleSiteInfo, "handleSiteInfo");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-nG1VjH/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = workers_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-nG1VjH/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
