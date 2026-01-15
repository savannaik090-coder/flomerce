# Kreavo SaaS Platform

## Architecture
- **Frontend:** Plain HTML/JS (located at root)
- **Backend:** Netlify Functions (located in `/netlify/functions`)
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication

## Security & Secrets
- **IMPORTANT:** All sensitive keys must be stored as **Environment Variables** in Replit (Secrets tab).
- **Public Keys:** `FIREBASE_API_KEY`, etc., are loaded via `/env-config.js` (which is excluded from Git).
- **Private Keys:** `FIREBASE_PRIVATE_KEY`, `RAZORPAY_KEY_SECRET`, etc., are only accessible in Netlify Functions.

## Project Structure
- `/index.html`: SaaS Landing Page.
- `/signup.html`, `/login.html`: SaaS Auth pages.
- `/dashboard.html`: User Dashboard.
- `/admin-panel`: Original jewellery CRM code.
- `/guide`: Reference original code.

## Setup
1. Add all secrets to Replit Environment Variables.
2. Ensure `.gitignore` is active.
3. Deploy to Netlify using the provided `netlify.toml`.
