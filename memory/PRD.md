# QuickBites Food Delivery Platform — PRD

## Problem Statement
Create a food delivery app with login, payment, and admin dashboard. Additional features: WebSockets for real-time order updates, GPS live delivery tracking, Menu Item Management, Smart Food Recommendations, Swagger API docs, and comprehensive project documentation.

## Core Requirements
- User authentication (JWT) with role-based access
- Restaurant browsing with search/filters
- Shopping cart & checkout
- Stripe payment integration
- Admin dashboard (restaurants, menus, orders, users, drivers)
- WebSocket real-time order status updates
- GPS live delivery tracking (simulated)
- Behavior-based smart food recommendations
- Swagger API documentation
- Project documentation

## Tech Stack
- Frontend: React 18, Tailwind CSS, Shadcn/UI, Leaflet.js, Socket.IO client
- Backend: FastAPI, Motor (async MongoDB), python-socketio, Stripe
- Database: MongoDB
- Auth: JWT + bcrypt

## What's Been Implemented (All DONE)
- [x] Full auth (register, login, logout, refresh, forgot/reset password)
- [x] Restaurant browsing with search and cuisine filters
- [x] Menu display with categories and availability
- [x] Shopping cart with quantity controls
- [x] Stripe Checkout integration (session + webhook)
- [x] Order management with status pipeline
- [x] Admin Dashboard (restaurants, menus, orders, users, drivers, analytics)
- [x] WebSocket real-time order status updates
- [x] GPS live delivery tracking (simulated driver movement)
- [x] Smart food recommendations (personalized, trending, popular, similar, reorder)
- [x] Swagger API documentation at /api/docs (37 endpoints)
- [x] Project documentation at /app/docs/documentation.md
- [x] Review system (submit + view reviews)

## Mocked / Simulated
- Driver GPS movement is simulated (no real driver app)
- Email/SMS notifications are mocked (notifications.py)

## Upcoming Tasks
- P0: Loyalty Rewards Program (Points + Tiers)
- P1: Review System Enhancements
- P2: Driver Portal / Restaurant Portal (pending user confirmation)

## Backlog
- Backend refactoring: Split server.py (~1400 lines) into modular route files

## Key Files
- /app/backend/server.py — Main backend (all routes)
- /app/backend/recommendations.py — Recommendation engine
- /app/frontend/src/pages/AdminDashboard.js — Admin UI
- /app/frontend/src/pages/OrderTracking.js — GPS tracking
- /app/frontend/src/components/RecommendationSection.js — Recommendations UI
- /app/docs/documentation.md — Full project documentation
