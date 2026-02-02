# Fluxe SaaS Platform

## Overview
Fluxe is a SaaS platform designed to empower users to effortlessly create their own e-commerce websites using pre-built templates. The flagship template (template1) offers a comprehensive jewellery e-commerce experience. The project aims to provide a robust, scalable, and customizable solution for online businesses, leveraging a modern cloud-native architecture.

## User Preferences
The user prefers clear and concise information. The AI should prioritize iterative development and ask for confirmation before making significant architectural changes or introducing new dependencies. When implementing features, the AI should favor a modular and API-driven approach.

## System Architecture

Fluxe operates on a Cloudflare-centric serverless architecture for enhanced scalability and performance.

**Technology Stack:**
- **Frontend:** Cloudflare Pages (static assets, user interface)
- **Backend:** Cloudflare Workers (API endpoints, business logic)
- **Database:** Cloudflare D1 (SQLite-compatible)
- **File Storage:** Cloudflare R2
- **Authentication:** Custom JWT-based system
- **Payments:** Razorpay integration

**Core Design Principles:**
- **API-Driven:** All frontend functionalities interact with the backend via RESTful APIs.
- **Multi-tenancy:** The platform supports multiple user-created websites, each potentially with its own subdomain.
- **Dynamic Content:** A dynamic category system allows users to define and manage categories for their e-commerce sites, replacing hardcoded pages with a single, versatile template (`category.html`) powered by `category-loader.js`.
- **Modular Backend:** Cloudflare Workers are organized into distinct services (e.g., `auth-worker.js`, `products-worker.js`) for better maintainability and scalability.
- **Frontend Structure:** The frontend is organized into main SaaS pages, templates, an admin panel, and a user dashboard.
- **Subdomain Routing:** Cloudflare Workers handle routing for user subdomains (e.g., `*.fluxe.in`) to their respective sites.

**Key Features:**
- User authentication and authorization.
- Website creation and management for individual users.
- Product catalog management (CRUD operations).
- Order processing and management.
- Shopping cart and wishlist functionalities.
- Dynamic, user-defined categories for e-commerce sites.
- Payment processing via Razorpay.
- Transactional email services.
- Admin panels for managing products, orders, users, and analytics.

**Database Schema:**
The D1 database schema includes tables for `users`, `sites`, `products`, `categories`, `orders`, `guest_orders`, `carts`, `wishlists`, `subscriptions`, and `payment_transactions`, supporting the core e-commerce and SaaS functionalities.

## External Dependencies

- **Cloudflare Pages:** For hosting the static frontend.
- **Cloudflare Workers:** For serverless backend API execution.
- **Cloudflare D1:** For the primary database.
- **Cloudflare R2:** For object storage (e.g., product images).
- **Razorpay:** For payment gateway integration.
- **Resend/SendGrid:** For transactional email services (API keys are required).
- **GitHub:** For version control and deployment via Cloudflare's integrations.