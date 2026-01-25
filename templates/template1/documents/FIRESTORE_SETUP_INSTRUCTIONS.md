# Firebase Firestore Rules Setup Instructions

## Current Issue
The admin dashboard and user profiles are showing empty data because Firestore security rules are blocking read access to user data, even for authenticated users.

## Solution: Update Firestore Security Rules

### Step 1: Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `auric-a0c92`
3. Navigate to **Firestore Database** in the left sidebar
4. Click on the **Rules** tab

### Step 2: Replace Current Rules
Replace the existing rules with the content from `firestore.rules` file in this project root.

The new rules will allow:
- ✅ Users to read/write their own profile data at `users/{userId}`
- ✅ Users to read/write their own orders at `users/{userId}/orders/{orderId}`
- ✅ Users to read/write their own cart data at `users/{userId}/carts/{cartId}`
- ✅ Users to read/write their own wishlist data at `users/{userId}/wishlist/{wishlistId}`
- ✅ Admin users to read all user data for the admin dashboard
- ✅ Public read access to products and categories
- ✅ Test collection for connectivity testing

### Step 3: Publish the Rules
1. Copy the content from `firestore.rules`
2. Paste it into the Firebase Console Rules editor
3. Click **Publish** to deploy the new rules

### Step 4: Test the Fix
After publishing the rules:
1. Go to your website's profile page
2. Try logging in with an existing account
3. Check if profile data loads correctly
4. Visit the admin dashboard to see if it shows real data

## Admin Access
To grant admin access to specific users, you can either:
1. Use the email whitelist approach (current): `admin@auric.com`, `owner@auric.com`
2. Set custom claims in Firebase Auth (more advanced)

## Troubleshooting
If issues persist:
1. Check browser console for specific Firebase error messages
2. Verify user authentication status
3. Ensure Firebase project ID matches in configuration
4. Test with the Firebase Emulator for local development

## Current Firebase Project Configuration
- Project ID: `auric-a0c92`
- Storage Bucket: `auric-a0c92.firebasestorage.app`
- Auth Domain: `auric-a0c92.firebaseapp.com`