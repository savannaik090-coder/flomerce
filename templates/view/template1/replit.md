# Royal Meenakari E-commerce Platform

## Overview

Royal Meenakari is a premium e-commerce platform for traditional Indian Meenakari jewelry. The platform provides a sophisticated online shopping experience with product catalogs, user authentication, shopping cart functionality, wishlist management, secure payments, and order notifications.

The site is built as a multi-page static website with serverless backend functions, designed for deployment on Netlify with Firebase as the primary data layer.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology**: Static HTML5/CSS3 pages with vanilla JavaScript
- **Design Pattern**: Multi-page application (MPA) with shared components
- **Styling**: Custom CSS with responsive design, using Font Awesome and Flaticon for icons
- **Typography**: Playfair Display and Lato fonts via Google Fonts

### Backend Architecture
- **Serverless Functions**: Netlify Functions located in `/netlify/functions/`
- **API Endpoints**:
  - `send-order-email` - Email notifications via Nodemailer
  - `create-razorpay-order` - Payment order creation
  - `verify-razorpay-payment` - Payment verification
  - `health` - Health check endpoint
- **Local Development Server**: Express.js server in `run-server.js` for development

### Data Storage
- **Database**: Firebase Firestore for products, orders, user data, and analytics
- **Authentication**: Firebase Authentication for user accounts
- **File Storage**: Firebase Storage for product images
- **Client-side Storage**: localStorage for cart and session data

### Payment Integration
- **Payment Gateway**: Razorpay for processing transactions
- **Flow**: Client creates order → Razorpay checkout → Server verifies payment → Order confirmation

### Product Organization
Products are organized into Firestore collections:
- `new-arrivals` - Latest jewelry additions
- `featured-collection` - Curated featured items
- `saree-collection` - Saree/jewelry combinations
- Category-specific collections for gold/silver jewelry types

### Key JavaScript Files
- `js/firebase-config.js` - Centralized Firebase configuration
- `js/currency-converter.js` - Multi-currency support
- `js/netlify-helpers.js` - Serverless function utilities
- `firebase-messaging-sw.js` - Push notification service worker

### Video Management (Watch & Buy)
- **Storage Location**: Firebase Storage under `watch-buy-videos/` path
- **Metadata Storage**: Firestore `watch-buy-videos` collection
- **API Endpoints**:
  - `GET /api/videos` - Fetch all videos
  - `POST /api/videos` - Upload new video (multipart/form-data)
  - `PUT /api/videos/:id` - Update video metadata
  - `DELETE /api/videos/:id` - Delete video and metadata
- **Video Fields**: title, description, videoUrl, thumbnailUrl, linkedProductSku, order, createdAt, updatedAt

## External Dependencies

### Firebase Services
- **Project ID**: `auric-a0c92`
- **Services Used**: Authentication, Firestore, Storage, Cloud Messaging
- **Admin SDK**: Used server-side for privileged operations

### Payment Gateway
- **Razorpay**: Requires `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` environment variables

### Email Service
- **Nodemailer**: For order confirmation emails
- **Required Variables**: `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_SECURE`, `OWNER_EMAIL`

### CDN Resources
- Font Awesome icons
- Flaticon UI icons
- Google Fonts
- Bootstrap CSS (checkout page only)

### Deployment Platform
- **Netlify**: Static hosting with serverless functions
- **Configuration**: `netlify.toml` for build settings, `firebase.json` for Firebase hosting rules