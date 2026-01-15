
const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { to, subject, text, html } = JSON.parse(event.body);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER || 'nazakatwebsite24@gmail.com',
            pass: process.env.EMAIL_PASS
        }
    });

    try {
        await transporter.sendMail({
            from: `"Kreavo" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html
        });
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};
