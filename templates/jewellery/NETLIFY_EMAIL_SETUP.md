
# Netlify Email Configuration Setup

## Required Environment Variables

To fix the email verification issue on your Netlify site (nazakat.netlify.app), you need to add these environment variables:

### 1. Go to your Netlify Dashboard
- Visit: https://app.netlify.com
- Select your site: **nazakat.netlify.app**
- Go to: **Site settings** → **Environment variables**

### 2. Add these email variables:

```
EMAIL_USER=nazakatwebsite24@gmail.com
EMAIL_PASS=your_gmail_app_password_here
EMAIL_SERVICE=gmail
NODE_ENV=production
```

### 3. How to get Gmail App Password:

1. **Enable 2-Factor Authentication** on your Gmail account (required for app passwords)
2. Go to: https://myaccount.google.com/apppasswords
3. Select app: **Other (custom name)**
4. Name it: **Nazakat Website**
5. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)
6. Use this password as your `EMAIL_PASS` value (remove spaces)

### 4. Test the Configuration

After adding the environment variables:
1. Go to your Netlify site dashboard
2. Click **Deploys** tab
3. Click **Trigger deploy** → **Deploy site**
4. Wait for deployment to complete
5. Test account creation on your live site

### 5. Troubleshooting

If emails still don't send:
- Check the Netlify function logs: **Functions** tab → **send-verification-email**
- Verify your Gmail App Password is correct
- Make sure 2FA is enabled on your Gmail account
- Try regenerating the App Password

### 6. Alternative Email Providers

If Gmail doesn't work, you can use other providers:

**For SendGrid:**
```
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASS=your_sendgrid_api_key
```

**For Outlook/Hotmail:**
```
EMAIL_SERVICE=hotmail
EMAIL_USER=your_outlook_email@outlook.com
EMAIL_PASS=your_outlook_password
```
