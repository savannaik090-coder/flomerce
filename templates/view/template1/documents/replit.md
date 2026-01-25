# royal meenakari Jewelry E-commerce Platform

## Overview
royal meenakari is a premium e-commerce platform for jewelry, offering a seamless online shopping experience. It includes user authentication, cart management, wishlist functionality, multi-currency support (INR base with USD, EUR, GBP, AED, CAD, AUD), order processing, email notifications, and real-time push notifications using Firebase Cloud Messaging. The platform aims to provide a modern interface for browsing and purchasing jewelry, featuring advanced stock management, multi-language support, and integrated shipping. Its business vision is to capture a significant share of the online luxury jewelry market by providing a reliable, feature-rich, and user-friendly platform.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Technology Stack**: HTML5/CSS3 for responsive design, modular JavaScript for client-side logic, Firebase SDK for real-time features.
- **UI/UX Design**: Clean, professional aesthetic with a gold/brown color palette and responsive grid layouts. Loading spinners with gold accent (#b5a681) are used for product sections. Welcome banners are responsively designed to ensure image and text visibility across devices with flexible height and image/text ratios.
- **Push Notifications**: Service Worker + Firebase Cloud Messaging with real FCM tokens for promotional campaigns, abandoned cart reminders, back-in-stock alerts, and price drop alerts.

### Backend
- **Server-side Logic**: Netlify Functions for API endpoints and serverless operations.
- **Local Development**: Express.js for local server setup.
- **Email System**: Nodemailer for transactional emails.
- **Payment System**: Razorpay integration for secure transactions (base prices in INR). Currency conversion is applied at cart and checkout displays for multi-currency support.
- **Shipping Logistics**: Shiprocket API for order fulfillment and tracking.
- **Push Notifications**: Firebase Cloud Messaging HTTP v1 API for real-time push delivery, including production-only sending restrictions.

### Authentication & Data Storage
- **User Authentication**: Firebase Authentication.
- **Database**: Firebase Firestore for user data, orders, and FCM tokens. FCM tokens are deduplicated to prevent multiple notifications.
- **Product Assets**: Firebase Cloud Storage.
- **Push Notification Tokens**: Stored in Firestore collections (users FCM tokens, guest tokens).
- **Cart Management**: localStorage for guests, Firebase for authenticated users.

### Key Features
- **User Management**: Authentication, profiles, order history, notification preferences.
- **Payment Gateway**: Secure Razorpay integration.
- **Currency Converter**: Real-time multi-currency (INR, USD, EUR, GBP, AED, CAD, AUD) with accurate display in cart and checkout.
- **Email Notifications**: Automated order confirmations and status updates.
- **Push Notifications**: Real Firebase Cloud Messaging for promotions, abandoned carts, back-in-stock, price drops, with single user permission and robust token management.
- **Product Management**: Multiple categories/subcategories with Firebase storage. CDN caching with ETag validation and extended localStorage cache (4 hours) is implemented for product data and images to optimize bandwidth.
- **Admin Panel**: Campaign management, user statistics, notification sending with duplicate send prevention.
- **Wishlist**: User wishlist functionality.
- **Checkout System**: For authenticated and guest users.
- **Order Tracking**: Full Shiprocket integration.
- **Stock Management**: Firebase-driven updates and admin alerts.
- **Multi-Language Support**: Translation API with RTL support.
- **Performance**: CDN caching, ETag validation for images, extended cache durations, and reduced polling intervals for data loaders.

## External Dependencies

- **Payment Gateway**: Razorpay
- **Shipping Service**: Shiprocket API
- **Translation Service**: MyMemory Translation API
- **Email Service**: Gmail SMTP
- **Firebase Services**: Authentication, Firestore, Cloud Storage, Cloud Messaging
- **Third-party Libraries**: Font Awesome, Google Fonts, Firebase SDK