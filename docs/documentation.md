# QuickBites - Food Delivery Platform

## Complete Application Documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Features & Benefits](#features--benefits)
4. [API Documentation](#api-documentation)
5. [Database Schema](#database-schema)
6. [Architecture](#architecture)
7. [Getting Started](#getting-started)
8. [Admin Dashboard Guide](#admin-dashboard-guide)
9. [Real-Time Features](#real-time-features)
10. [Payment Integration](#payment-integration)

---

## Overview

QuickBites is a full-stack food delivery platform that connects customers with local restaurants. The platform provides a seamless ordering experience with real-time tracking, intelligent food recommendations, secure payments, and a powerful admin dashboard for managing all aspects of the business.

**Target Users:**
- **Customers** — Browse restaurants, place orders, track deliveries in real time
- **Administrators** — Manage restaurants, menus, orders, users, and drivers
- **Drivers** — Assigned to deliveries with GPS-tracked routes (simulated)

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Shadcn/UI |
| Backend | FastAPI (Python), Uvicorn |
| Database | MongoDB (Motor async driver) |
| Real-Time | Socket.IO (python-socketio) |
| Payments | Stripe Checkout |
| Maps | Leaflet.js |
| Auth | JWT (JSON Web Tokens), bcrypt |
| API Docs | Swagger UI (built-in FastAPI) |

---

## Features & Benefits

### 1. User Authentication & Authorization

**Features:**
- User registration with email and password
- Secure login with JWT tokens
- Token refresh mechanism for persistent sessions
- Password reset flow (forgot password / reset password)
- Role-based access control (user, admin)

**Benefits:**
- Secure access to user accounts and order history
- Admins can manage platform without exposing controls to regular users
- Token refresh keeps users logged in without compromising security

---

### 2. Restaurant Browsing & Search

**Features:**
- Browse all available restaurants with images, ratings, and descriptions
- Search restaurants by name
- Filter by cuisine type
- View detailed restaurant pages with full menu

**Benefits:**
- Users quickly find restaurants matching their preferences
- Search and filters reduce time-to-order significantly
- Rich restaurant cards with ratings build trust and help decision-making

---

### 3. Menu Management

**Features:**
- Full menu display organized by category
- Item availability toggling
- Price, description, and category management
- Admin can add, edit, and delete menu items

**Benefits:**
- Restaurants keep their menus up to date in real time
- Unavailable items are clearly marked, reducing order issues
- Categorized menus improve browsing experience

---

### 4. Shopping Cart & Checkout

**Features:**
- Add/remove items with quantity controls
- Real-time price calculation
- Delivery address management
- Seamless transition to payment

**Benefits:**
- Intuitive cart experience similar to major e-commerce platforms
- Users can manage multiple items before committing to an order
- Saved addresses speed up repeat ordering

---

### 5. Stripe Payment Integration

**Features:**
- Secure Stripe Checkout sessions
- Support for credit/debit cards
- Payment status verification
- Webhook handling for payment confirmations

**Benefits:**
- Industry-standard payment security (PCI compliant via Stripe)
- Users trust the payment process with a recognized payment provider
- Automated payment confirmation reduces manual verification

---

### 6. Order Management

**Features:**
- Place orders with item details and delivery address
- View order history with status tracking
- Order status progression: Pending > Confirmed > Preparing > Out for Delivery > Delivered
- Admin order management and status updates

**Benefits:**
- Complete transparency on order lifecycle
- Users always know where their order stands
- Admins can efficiently manage high volumes of orders

---

### 7. Real-Time Order Updates (WebSocket)

**Features:**
- Live order status changes pushed to the client instantly
- Socket.IO-based bidirectional communication
- Automatic reconnection on connection loss
- Per-order room-based updates

**Benefits:**
- No need to refresh the page to check order status
- Instant notifications when order moves to next stage
- Creates a modern, responsive user experience

---

### 8. GPS Live Delivery Tracking

**Features:**
- Real-time map showing driver location using Leaflet.js
- Simulated GPS coordinates for driver movement
- Route visualization from restaurant to delivery address
- Estimated delivery time display

**Benefits:**
- Users can see exactly where their delivery is
- Reduces anxiety and "where is my food?" support queries
- Builds confidence in the delivery process

---

### 9. Smart Food Recommendations

**Features:**
- **Personalized Recommendations** — Based on user's order history and preferences
- **Trending Items** — Popular items across the platform
- **Popular Items** — Most-ordered dishes
- **Similar Items** — Items related to what the user is viewing
- **Frequently Bought Together** — Cross-sell suggestions
- **Reorder Suggestions** — Quick reordering of past favorites

**Benefits:**
- Increases average order value through relevant suggestions
- Helps new users discover popular dishes
- Returning users can quickly reorder favorites
- Data-driven recommendations improve over time

---

### 10. Admin Dashboard

**Features:**
- **Restaurant Management** — Add, edit, delete restaurants
- **Menu Item Management** — Full CRUD operations on menu items
- **Order Management** — View all orders, update statuses, assign drivers
- **User Management** — View all registered users
- **Driver Management** — Add drivers, assign to deliveries
- **Analytics Dashboard** — Platform-wide statistics (total orders, revenue, user count)

**Benefits:**
- Single control panel for all business operations
- Real-time visibility into platform performance
- Efficient driver assignment for optimized delivery
- Data-driven decisions through analytics

---

### 11. Review System

**Features:**
- Submit reviews with star ratings and comments
- View restaurant reviews
- Reviews linked to verified orders

**Benefits:**
- Social proof helps new users make decisions
- Restaurant quality feedback loop
- Builds community trust on the platform

---

### 12. Swagger API Documentation

**Features:**
- Interactive API documentation at `/api/docs`
- All 37 endpoints documented with request/response schemas
- Try-it-out functionality for testing endpoints
- OpenAPI 3.0 specification

**Benefits:**
- Developers can quickly understand and integrate with the API
- Reduces onboarding time for new developers
- Self-documenting API reduces support burden

---

## API Documentation

The full interactive API documentation is available at:

```
{your-domain}/api/docs
```

### Endpoint Summary

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **Auth** | `/api/auth/register` | POST | Register new user |
| **Auth** | `/api/auth/login` | POST | Login and get JWT token |
| **Auth** | `/api/auth/logout` | POST | Logout user |
| **Auth** | `/api/auth/me` | GET | Get current user profile |
| **Auth** | `/api/auth/refresh` | POST | Refresh JWT token |
| **Auth** | `/api/auth/forgot-password` | POST | Request password reset |
| **Auth** | `/api/auth/reset-password` | POST | Reset password with token |
| **Restaurants** | `/api/restaurants` | GET | List all restaurants |
| **Restaurants** | `/api/restaurants/{id}` | GET | Get restaurant details |
| **Restaurants** | `/api/restaurants/{id}/menu` | GET | Get restaurant menu |
| **Restaurants** | `/api/restaurants/{id}/reviews` | GET | Get restaurant reviews |
| **Orders** | `/api/orders` | POST | Create new order |
| **Orders** | `/api/orders/{id}` | GET | Get order details |
| **Reviews** | `/api/reviews` | POST | Submit a review |
| **Addresses** | `/api/addresses` | GET/POST | Manage delivery addresses |
| **Addresses** | `/api/addresses/{id}` | DELETE | Remove an address |
| **Payments** | `/api/payments/checkout/session` | POST | Create Stripe checkout |
| **Payments** | `/api/payments/checkout/status/{id}` | GET | Check payment status |
| **Payments** | `/api/webhook/stripe` | POST | Stripe webhook handler |
| **Recommendations** | `/api/recommendations/personalized` | GET | Personalized suggestions |
| **Recommendations** | `/api/recommendations/popular` | GET | Popular items |
| **Recommendations** | `/api/recommendations/trending` | GET | Trending items |
| **Recommendations** | `/api/recommendations/similar/{id}` | GET | Similar items |
| **Recommendations** | `/api/recommendations/frequently-bought-together/{id}` | GET | Frequently bought together |
| **Recommendations** | `/api/recommendations/reorder` | GET | Reorder suggestions |
| **Drivers** | `/api/drivers` | GET/POST | List/add drivers |
| **Drivers** | `/api/drivers/{id}` | PUT/DELETE | Update/remove driver |
| **Drivers** | `/api/orders/{id}/assign-driver` | POST | Assign driver to order |
| **Drivers** | `/api/orders/{id}/driver-location` | GET | Get driver GPS location |
| **Admin** | `/api/admin/restaurants` | GET/POST | Manage restaurants |
| **Admin** | `/api/admin/restaurants/{id}` | PUT/DELETE | Edit/delete restaurant |
| **Admin** | `/api/admin/menu-items` | GET/POST | Manage menu items |
| **Admin** | `/api/admin/menu-items/{id}` | PUT/DELETE | Edit/delete menu item |
| **Admin** | `/api/admin/orders` | GET | View all orders |
| **Admin** | `/api/admin/orders/{id}` | PUT | Update order status |
| **Admin** | `/api/admin/analytics` | GET | Platform analytics |
| **Admin** | `/api/admin/users` | GET | List all users |

---

## Database Schema

### Users Collection
```json
{
  "email": "user@example.com",
  "password_hash": "$2b$12...",
  "role": "user | admin",
  "name": "John Doe",
  "created_at": "2026-01-01T00:00:00Z"
}
```

### Restaurants Collection
```json
{
  "name": "Pizza Palace",
  "description": "Best pizzas in town",
  "address": "123 Main St",
  "image_url": "https://...",
  "cuisine_type": "Italian",
  "rating": 4.5,
  "is_active": true
}
```

### Menu Items Collection
```json
{
  "restaurant_id": "restaurant_abc",
  "name": "Margherita Pizza",
  "description": "Classic cheese pizza",
  "price": 12.99,
  "category": "Pizza",
  "image_url": "https://...",
  "is_available": true
}
```

### Orders Collection
```json
{
  "user_id": "user_abc",
  "restaurant_id": "restaurant_abc",
  "items": [{"item_id": "...", "name": "...", "quantity": 2, "price": 12.99}],
  "total_amount": 25.98,
  "status": "pending | confirmed | preparing | out_for_delivery | delivered",
  "delivery_address": "456 Oak Ave",
  "driver_id": "driver_abc",
  "payment_status": "pending | paid",
  "created_at": "2026-01-01T00:00:00Z"
}
```

### Reviews Collection
```json
{
  "order_id": "order_abc",
  "user_id": "user_abc",
  "restaurant_id": "restaurant_abc",
  "rating": 5,
  "comment": "Great food!",
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

## Architecture

```
Client (React)  <-->  Nginx (Reverse Proxy)  <-->  FastAPI Backend  <-->  MongoDB
                           |                              |
                     Static Assets               Socket.IO (WebSocket)
                                                         |
                                                   Stripe API
```

**Key Design Decisions:**
- **Monolithic Backend** — Single FastAPI server handles all routes for simplicity
- **Async MongoDB** — Motor driver for non-blocking database operations
- **Socket.IO** — Chosen over raw WebSockets for automatic reconnection and room support
- **JWT Auth** — Stateless authentication that scales horizontally
- **Stripe Checkout** — Hosted payment page for PCI compliance without handling card data

---

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- MongoDB 6+
- Stripe Account (for payments)

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
# Configure .env with MONGO_URL, DB_NAME, JWT_SECRET, STRIPE_KEY
python server.py
```

### Frontend Setup
```bash
cd frontend
yarn install
# Configure .env with REACT_APP_BACKEND_URL
yarn start
```

### Default Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@fooddelivery.com | admin123 |
| Test User | user@test.com | user123 |

---

## Admin Dashboard Guide

Access the admin dashboard by logging in with admin credentials and navigating to `/admin`.

### Restaurant Management
1. View all restaurants in a table
2. Click "Add Restaurant" to create a new listing
3. Edit restaurant details (name, cuisine, address, image)
4. Toggle restaurant active status

### Menu Management
1. Select a restaurant to view its menu
2. Add new menu items with price, category, description
3. Toggle item availability
4. Edit or remove existing items

### Order Management
1. View all orders with filters by status
2. Update order status through the pipeline
3. Assign available drivers to orders

### Driver Management
1. View all registered drivers
2. Add new drivers
3. Track driver availability

### Analytics
- Total orders, revenue, and user count
- Platform performance at a glance

---

## Real-Time Features

### WebSocket Connection
The app establishes a Socket.IO connection on login. Events include:
- `order_status_update` — Pushed when an order status changes
- `driver_location_update` — Pushed with GPS coordinates during delivery
- `connection_status` — Confirms WebSocket connection

### GPS Tracking
During "Out for Delivery" status, the map displays:
- Driver's current position (updated in real time)
- Restaurant location marker
- Delivery address marker
- Estimated delivery time

> **Note:** Driver GPS movement is currently simulated for demonstration purposes.

---

## Payment Integration

### Stripe Checkout Flow
1. User completes cart and clicks "Checkout"
2. Backend creates a Stripe Checkout Session
3. User is redirected to Stripe's hosted payment page
4. On successful payment, Stripe webhook confirms the transaction
5. Order status updates to "paid" automatically

### Test Mode
The app runs in Stripe test mode. Use Stripe's test card numbers:
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002

---

## Notifications

The platform includes a notification system for:
- Order confirmation emails
- Status change notifications
- Welcome emails on registration

> **Note:** Email and SMS notifications are currently mocked for demonstration. Integration with services like SendGrid or Twilio can be added for production use.

---

*Document generated for QuickBites Food Delivery Platform*
*Last updated: April 2026*
