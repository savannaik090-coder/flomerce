export async function sendEmail(env, to, subject, html, text) {
  try {
    if (env.RESEND_API_KEY) {
      const apiKey = env.RESEND_API_KEY.trim();
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.FROM_EMAIL || 'noreply@fluxe.in',
          to: typeof to === 'string' ? [to] : to,
          subject,
          html,
          text,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('Resend error:', body);
        return body.message || body.error || 'Resend API error';
      }
      return true;
    }

    if (env.SENDGRID_API_KEY) {
      const toList = typeof to === 'string' ? [{ email: to }] : to.map(e => ({ email: e }));
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: toList }],
          from: { email: env.FROM_EMAIL || 'noreply@fluxe.in' },
          subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SendGrid error:', errorText);
        return errorText || 'SendGrid API error';
      }
      return true;
    }

    console.log('No email provider configured. Email would be sent to:', to);
    console.log('Subject:', subject);
    return true;
  } catch (error) {
    console.error('Send email error:', error);
    return error.message || 'Unknown email sending error';
  }
}

export function buildOrderConfirmationEmail(order, brandName, ownerEmail) {
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${item.name}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px; font-weight: 600;">&#8377;${Number(item.price).toFixed(2)}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px; font-weight: 600;">&#8377;${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
    </tr>
  `).join('');

  const shippingAddress = typeof order.shipping_address === 'string'
    ? JSON.parse(order.shipping_address)
    : order.shipping_address || order.shippingAddress;

  const addressHtml = shippingAddress ? `
    <div style="margin-top: 24px; padding: 16px; background: #f8f9fa; border-radius: 8px;">
      <h3 style="margin: 0 0 8px; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Shipping Address</h3>
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #333;">
        ${shippingAddress.name || order.customer_name || ''}<br>
        ${shippingAddress.address || ''}<br>
        ${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${shippingAddress.pinCode || shippingAddress.pin_code || ''}<br>
        ${shippingAddress.phone || order.customer_phone || ''}
      </p>
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0f172a; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${brandName || 'Your Store'}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 56px; height: 56px; background: #dcfce7; border-radius: 50%; display: inline-block; line-height: 56px; text-align: center; margin-bottom: 12px; vertical-align: middle;">
              <span style="font-size: 28px; line-height: 1; vertical-align: middle;">&#10003;</span>
            </div>
            <h2 style="margin: 0 0 4px; font-size: 22px; color: #0f172a;">Order Confirmed!</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order #${order.order_number || order.orderNumber || ''}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Product</th>
                <th style="padding: 12px 16px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                <th style="padding: 12px 16px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Price</th>
                <th style="padding: 12px 16px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="text-align: right; padding: 16px; background: #f8f9fa; border-radius: 8px; margin-top: 16px;">
            <span style="font-size: 18px; font-weight: 700; color: #0f172a;">Total: &#8377;${Number(order.total).toFixed(2)}</span>
          </div>

          <div style="margin-top: 16px; padding: 12px 16px; background: #eff6ff; border-radius: 8px; font-size: 14px; color: #1e40af;">
            Payment Method: <strong>${order.payment_method === 'cod' || order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</strong>
          </div>

          ${addressHtml}

          <p style="margin-top: 24px; color: #64748b; font-size: 14px; line-height: 1.6;">Your order is now being prepared. We'll update you once it's on its way. For any queries, reach out to us at ${ownerEmail ? `<a href="mailto:${ownerEmail}" style="color:#0f172a;">${ownerEmail}</a>` : brandName || 'the store'}.</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for shopping with ${brandName || 'us'}!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Order Confirmation\n\nThank you for your order!\nOrder Number: ${order.order_number || order.orderNumber}\nTotal: Rs.${Number(order.total).toFixed(2)}\nPayment: ${order.payment_method === 'cod' || order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}\n\nYour order is now being prepared.`;

  return { html, text };
}

export function buildCancellationCustomerEmail(order, brandName, reason, ownerEmail) {
  const contactLine = ownerEmail
    ? `For any questions or to request a refund, please contact us at <a href="mailto:${ownerEmail}" style="color:#c0392b;">${ownerEmail}</a>.`
    : 'For any questions or to request a refund, please reply to this email.';
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #c0392b; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || 'Your Store'}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 56px; height: 56px; background: #fde8e8; border-radius: 50%; display: inline-block; line-height: 56px; text-align: center; margin-bottom: 12px; vertical-align: middle;">
              <span style="font-size: 28px; line-height: 1; vertical-align: middle;">&#10007;</span>
            </div>
            <h2 style="margin: 0 0 4px; font-size: 22px; color: #0f172a;">Order Cancelled</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order #${order.order_number || order.orderNumber || ''}</p>
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${order.customer_name || 'Customer'},</p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">We're sorry to inform you that your order has been cancelled.</p>
          <div style="margin: 24px 0; padding: 16px; background: #fff5f5; border-left: 4px solid #c0392b; border-radius: 4px;">
            <div style="font-size: 13px; color: #888; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">Cancellation Reason</div>
            <div style="font-size: 15px; color: #333;">${reason || 'No reason provided'}</div>
          </div>
          <div style="padding: 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #555;">
            <strong>Order Total:</strong> &#8377;${Number(order.total || 0).toFixed(2)}<br>
            <strong>Payment Method:</strong> ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
          </div>
          <p style="margin-top: 24px; color: #64748b; font-size: 14px; line-height: 1.6;">If you paid online and a refund is applicable, it will be processed within 5–7 business days. ${contactLine}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for shopping with ${brandName || 'us'}!</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Order Cancelled\n\nYour order #${order.order_number || order.orderNumber} has been cancelled.\nReason: ${reason || 'No reason provided'}\nTotal: Rs.${Number(order.total || 0).toFixed(2)}\n\n${ownerEmail ? 'Contact us at: ' + ownerEmail : 'Please reply to this email for any queries.'}`;
  return { html, text };
}

export function buildDeliveryCustomerEmail(order, brandName, ownerEmail) {
  let items = [];
  try {
    items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
    if (!Array.isArray(items)) items = [];
  } catch (_) { items = []; }
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${item.name}</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px; font-weight: 600;">&#8377;${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
    </tr>
  `).join('');
  const contactLine = ownerEmail
    ? `If you have any issues with your order, contact us at <a href="mailto:${ownerEmail}" style="color:#27ae60;">${ownerEmail}</a>.`
    : 'If you have any issues with your order, please reply to this email.';
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #27ae60; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || 'Your Store'}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 52px; margin-bottom: 12px;">📦</div>
            <h2 style="margin: 0 0 6px; font-size: 24px; color: #0f172a;">Your Order Has Been Delivered!</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order #${order.order_number || ''}</p>
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${order.customer_name || 'Customer'}, we hope you love your purchase! 🎉</p>
          ${items.length > 0 ? `
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Product</th>
                <th style="padding: 10px 16px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase;">Qty</th>
                <th style="padding: 10px 16px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase;">Amount</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="text-align: right; padding: 12px 16px; background: #f0fdf4; border-radius: 8px; font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 24px;">
            Total Paid: &#8377;${Number(order.total || 0).toFixed(2)}
          </div>` : ''}
          <div style="margin: 24px 0; padding: 20px; background: #f0fdf4; border-radius: 10px; text-align: center;">
            <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #166534;">Enjoying your purchase?</p>
            <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.6;">We'd love to hear from you! Share your experience and leave a review — your feedback helps us serve you better and helps other shoppers make great choices.</p>
          </div>
          <p style="margin-top: 20px; color: #64748b; font-size: 14px; line-height: 1.6;">${contactLine}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for shopping with ${brandName || 'us'}! We look forward to serving you again.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Your order #${order.order_number} has been delivered!\n\nWe hope you love your purchase. We'd love to hear your feedback — please leave a review!\n\nTotal Paid: Rs.${Number(order.total || 0).toFixed(2)}\n\n${ownerEmail ? 'For any issues, contact: ' + ownerEmail : ''}`;
  return { html, text };
}

export function buildDeliveryOwnerEmail(order, brandName) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #1a6b3a; color: #ffffff; padding: 24px 32px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Order Delivered ✓</h1>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${brandName || 'Your Store'} – Order #${order.order_number || ''}</p>
        </div>
        <div style="padding: 24px 32px;">
          <p style="color: #333; font-size: 15px;">Order <strong>#${order.order_number || ''}</strong> has been marked as delivered.</p>
          <div style="padding: 12px 16px; background: #f0fdf4; border-radius: 8px; font-size: 14px; line-height: 1.8; margin-top: 16px;">
            <strong>Customer:</strong> ${order.customer_name || 'N/A'}<br>
            <strong>Email:</strong> ${order.customer_email || 'N/A'}<br>
            <strong>Phone:</strong> ${order.customer_phone || 'N/A'}<br>
            <strong>Total:</strong> &#8377;${Number(order.total || 0).toFixed(2)}<br>
            <strong>Payment:</strong> ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
          </div>
          <p style="margin-top: 20px; color: #64748b; font-size: 14px;">The customer has been notified and prompted to leave a review. Keep up the great work!</p>
        </div>
        <div style="background: #f8f9fa; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">This is an automated notification from ${brandName || 'Fluxe'}.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Order Delivered\n\nOrder #${order.order_number} has been marked as delivered.\nCustomer: ${order.customer_name || ''}\nTotal: Rs.${Number(order.total || 0).toFixed(2)}`;
  return { html, text };
}

export function buildCancellationOwnerEmail(order, brandName, reason) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #7f1d1d; color: #ffffff; padding: 24px 32px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Order Cancelled</h1>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${brandName || 'Your Store'} - Order #${order.order_number || order.orderNumber || ''}</p>
        </div>
        <div style="padding: 24px 32px;">
          <p style="color: #333; font-size: 15px;">An order has been marked as cancelled.</p>
          <div style="margin: 20px 0; padding: 16px; background: #fff5f5; border-left: 4px solid #c0392b; border-radius: 4px;">
            <div style="font-size: 13px; color: #888; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">Cancellation Reason</div>
            <div style="font-size: 15px; color: #333;">${reason || 'No reason provided'}</div>
          </div>
          <div style="padding: 12px 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; line-height: 1.8;">
            <strong>Order #:</strong> ${order.order_number || order.orderNumber || ''}<br>
            <strong>Customer:</strong> ${order.customer_name || 'N/A'}<br>
            <strong>Email:</strong> ${order.customer_email || 'N/A'}<br>
            <strong>Phone:</strong> ${order.customer_phone || 'N/A'}<br>
            <strong>Total:</strong> &#8377;${Number(order.total || 0).toFixed(2)}
          </div>
        </div>
        <div style="background: #f8f9fa; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">This is an automated notification from ${brandName || 'Fluxe'}.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Order Cancelled\n\nOrder #${order.order_number || order.orderNumber} has been cancelled.\nReason: ${reason || 'No reason provided'}\nCustomer: ${order.customer_name || ''}\nTotal: Rs.${Number(order.total || 0).toFixed(2)}`;
  return { html, text };
}

export function buildOwnerNotificationEmail(order, brandName) {
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${item.name}</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px;">&#8377;${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
    </tr>
  `).join('');

  const shippingAddress = typeof order.shipping_address === 'string'
    ? JSON.parse(order.shipping_address)
    : order.shipping_address || order.shippingAddress;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #059669; color: #ffffff; padding: 24px 32px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">New Order Received!</h1>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${brandName || 'Your Store'} - Order #${order.order_number || order.orderNumber || ''}</p>
        </div>
        <div style="padding: 24px 32px;">
          <div style="display: flex; gap: 16px; margin-bottom: 20px;">
            <div style="padding: 12px 16px; background: #f0fdf4; border-radius: 8px; flex: 1;">
              <div style="font-size: 12px; color: #059669; text-transform: uppercase; font-weight: 600;">Total Amount</div>
              <div style="font-size: 22px; font-weight: 700; color: #0f172a;">&#8377;${Number(order.total).toFixed(2)}</div>
            </div>
          </div>

          <h3 style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 8px;">Customer Details</h3>
          <div style="padding: 12px 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; line-height: 1.8;">
            <strong>Name:</strong> ${order.customer_name || (shippingAddress && shippingAddress.name) || 'N/A'}<br>
            <strong>Email:</strong> ${order.customer_email || (shippingAddress && shippingAddress.email) || 'N/A'}<br>
            <strong>Phone:</strong> ${order.customer_phone || (shippingAddress && shippingAddress.phone) || 'N/A'}<br>
            <strong>Payment:</strong> ${order.payment_method === 'cod' || order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
          </div>

          ${shippingAddress ? `
          <h3 style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 8px;">Shipping Address</h3>
          <div style="padding: 12px 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; line-height: 1.6;">
            ${shippingAddress.address || ''}<br>
            ${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${shippingAddress.pinCode || shippingAddress.pin_code || ''}
          </div>
          ` : ''}

          <h3 style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 8px;">Order Items</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Product</th>
                <th style="padding: 10px 16px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase;">Qty</th>
                <th style="padding: 10px 16px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>
        <div style="background: #f8f9fa; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">This is an automated notification from ${brandName || 'Fluxe'}.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `New Order Received!\n\nOrder #${order.order_number || order.orderNumber}\nTotal: Rs.${Number(order.total).toFixed(2)}\nCustomer: ${order.customer_name || ''}\nPhone: ${order.customer_phone || ''}\nPayment: ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}`;

  return { html, text };
}
