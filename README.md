# 🍔 QuickBites - Food Delivery Platform

A full-stack food delivery application with real-time order tracking, GPS live delivery tracking, admin dashboard, and Stripe payment integration.

![Tech Stack](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

---

## 🚀 Features

### Customer Features
- 🔐 **User Authentication** - JWT-based login/registration with secure password hashing
- 🍕 **Restaurant Browse & Search** - Filter by cuisine, rating, search by name
- 🛒 **Shopping Cart** - Add items, update quantities, manage cart
- 💳 **Stripe Payment** - Secure checkout with Stripe integration
- 📍 **GPS Live Tracking** - Real-time driver location on interactive map
- 🔔 **Real-time Updates** - WebSocket-powered order status notifications
- 📦 **Order History** - View past orders with delivery details
- ⭐ **Reviews & Ratings** - Rate restaurants and view reviews
- 📍 **Address Management** - Save multiple delivery addresses

### Admin Features
- 📊 **Analytics Dashboard** - Revenue, orders, users, restaurant stats
- 🏪 **Restaurant Management** - Full CRUD operations for restaurants
- 🍽️ **Menu Management** - Add, edit, delete menu items per restaurant
- 📋 **Order Management** - View all orders, update status, assign drivers
- 👥 **User Management** - View all registered users
- 🚗 **Driver Assignment** - Assign drivers to orders with vehicle info
- 🔒 **Status Protection** - Prevent invalid status changes on completed orders

### Real-Time Features
- ⚡ **WebSocket Integration** - Live order status updates
- 🗺️ **GPS Tracking** - Interactive map with driver, restaurant, delivery markers
- 📱 **Push Notifications** - Toast notifications for status changes
- 🔄 **Auto-refresh** - Real-time data synchronization

### Technical Features
- 📧 **Email Notifications** (Mocked) - Welcome emails, order confirmations
- 📲 **SMS Notifications** (Mocked) - Order alerts via Twilio
- 🎨 **Modern UI** - Tailwind CSS with custom design system
- 🌐 **Responsive Design** - Mobile-friendly interface
- 🔐 **Secure** - HttpOnly cookies, bcrypt password hashing, JWT tokens
- 🚀 **Optimized** - MongoDB aggregation pipelines, efficient queries

---

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.9+)
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT tokens, bcrypt password hashing
- **Real-time**: Socket.IO (python-socketio)
- **Payments**: Stripe (via emergentintegrations)
- **Notifications**: Mocked SendGrid & Twilio integration

### Frontend
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/UI
- **Maps**: React Leaflet (OpenStreetMap)
- **Real-time**: Socket.IO Client
- **HTTP Client**: Axios
- **Routing**: React Router v6
- **Animations**: Framer Motion

### DevOps
- **Process Manager**: Supervisor
- **Hot Reload**: Enabled for both frontend and backend
- **CORS**: Configured for cross-origin requests

---

## 📁 Project Structure

```
/app/
├── backend/
│   ├── server.py              # Main FastAPI application (1400+ lines)
│   ├── notifications.py       # Email/SMS notification service
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Backend environment variables
│
├── frontend/
│   ├── src/
│   │   ├── pages/            # All page components
│   │   │   ├── Home.js
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Browse.js
│   │   │   ├── RestaurantDetail.js
│   │   │   ├── Cart.js
│   │   │   ├── Checkout.js
│   │   │   ├── Orders.js
│   │   │   ├── OrderTracking.js
│   │   │   ├── OrderSuccess.js
│   │   │   ├── Profile.js
│   │   │   └── AdminDashboard.js
│   │   │
│   │   ├── components/       # Reusable components
│   │   │   ├── Header.js
│   │   │   ├── ProtectedRoute.js
│   │   │   └── ui/          # Shadcn/UI components
│   │   │
│   │   ├── contexts/        # React contexts
│   │   │   ├── AuthContext.js
│   │   │   └── WebSocketContext.js
│   │   │
│   │   ├── App.js           # Main app with routes
│   │   ├── App.css
│   │   └── index.css        # Global styles
│   │
│   ├── public/              # Static assets
│   ├── package.json         # Node dependencies
│   ├── tailwind.config.js   # Tailwind configuration
│   └── .env                 # Frontend environment variables
│
├── design_guidelines.json   # UI/UX design specifications
├── memory/
│   └── test_credentials.md  # Test account credentials
└── README.md               # This file
```

---

## 🔧 Environment Variables

### Backend (.env)
```bash
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
JWT_SECRET="your-secret-key-here"
ADMIN_EMAIL="admin@fooddelivery.com"
ADMIN_PASSWORD="admin123"
STRIPE_API_KEY="sk_test_emergent"
```

### Frontend (.env)
```bash
REACT_APP_BACKEND_URL="https://your-backend-url.com"
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 16+
- MongoDB
- npm or yarn

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run the server
python server.py

# Server runs on http://0.0.0.0:8001
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
yarn install
# or
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your backend URL

# Start development server
yarn start
# or
npm start

# App runs on http://localhost:3000
```

---

## 🔑 Test Credentials

### Admin Account
- **Email**: admin@fooddelivery.com
- **Password**: admin123
- **Access**: Full admin dashboard with all management capabilities

### Test User Account
- **Email**: user@test.com
- **Password**: user123
- **Access**: Customer portal with ordering capabilities

### Test Drivers (Pre-seeded)
1. **John Driver** - Honda Civic (ABC123)
2. **Sarah Delivery** - Toyota Prius (XYZ789)
3. **Mike Fast** - Motorcycle (FAST01)

### Test Restaurants (Pre-seeded)
1. **Burger Palace** - American cuisine
2. **Fresh & Healthy** - Healthy food
3. **Sushi Express** - Japanese cuisine
4. **Pizza Perfection** - Italian cuisine

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Restaurants
- `GET /api/restaurants` - List all restaurants (with filters)
- `GET /api/restaurants/{id}` - Get restaurant details
- `GET /api/restaurants/{id}/menu` - Get restaurant menu
- `GET /api/restaurants/{id}/reviews` - Get restaurant reviews

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user orders
- `GET /api/orders/{id}` - Get order details
- `GET /api/orders/{id}/driver-location` - Get driver location

### Payments
- `POST /api/payments/checkout/session` - Create Stripe checkout
- `GET /api/payments/checkout/status/{session_id}` - Check payment status
- `POST /api/webhook/stripe` - Stripe webhook handler

### Reviews
- `POST /api/reviews` - Submit restaurant review

### Addresses
- `GET /api/addresses` - Get user addresses
- `POST /api/addresses` - Add new address
- `PUT /api/addresses/{id}` - Update address
- `DELETE /api/addresses/{id}` - Delete address

### Drivers
- `GET /api/drivers` - List available drivers
- `GET /api/drivers/{id}` - Get driver details
- `POST /api/orders/{id}/assign-driver` - Assign driver to order

### Admin Endpoints (Requires Admin Role)
- `GET /api/admin/analytics` - Platform analytics
- `GET /api/admin/restaurants` - List all restaurants
- `POST /api/admin/restaurants` - Create restaurant
- `PUT /api/admin/restaurants/{id}` - Update restaurant
- `DELETE /api/admin/restaurants/{id}` - Delete restaurant
- `GET /api/admin/menu-items` - List menu items
- `POST /api/admin/menu-items` - Create menu item
- `PUT /api/admin/menu-items/{id}` - Update menu item
- `DELETE /api/admin/menu-items/{id}` - Delete menu item
- `GET /api/admin/orders` - List all orders
- `PUT /api/admin/orders/{id}` - Update order status
- `GET /api/admin/users` - List all users

---

## 🌐 WebSocket Events

### Client → Server
- `connect` - Client connection
- `join_order_room` - Subscribe to order updates
- `leave_order_room` - Unsubscribe from order updates
- `update_driver_location` - Driver location update (for driver app)

### Server → Client
- `connection_status` - Connection confirmation
- `room_joined` - Room join confirmation
- `order_update` - Order status change notification
- `driver_location_update` - Real-time driver position

---

## 📦 How to Get the Codebase

### Method 1: Save to GitHub (Recommended)

**If you have a paid Emergent subscription:**

1. **Connect GitHub**
   - Click the GitHub icon in your Emergent workspace
   - Authorize Emergent to access your GitHub account

2. **Push Your Code**
   - Create a new repository or select existing one
   - Click "Push to GitHub"
   - All files will be saved with proper structure

3. **Download Locally**
   - Go to your GitHub repository
   - Click "Code" → "Download ZIP"
   - Or clone it: `git clone <your-repo-url>`

### Method 2: Manual Download

1. Use VS Code view in Emergent to browse files
2. Copy key files manually from the structure above
3. Preserve the directory structure

### Important Files to Export
- **Backend**: `server.py`, `notifications.py`, `requirements.txt`, `.env`
- **Frontend**: All files in `/app/frontend/src/`, `package.json`, `tailwind.config.js`
- **Config**: Environment variables, design guidelines

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 8001 is in use
lsof -i :8001

# Check MongoDB connection
mongosh $MONGO_URL

# Check Python version
python --version  # Should be 3.9+
```

### Frontend won't start
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 16+
```

### WebSocket not connecting
- Verify backend URL in frontend .env
- Check CORS configuration
- Ensure Socket.IO path is `/api/socket.io`

---

## 🎯 Future Enhancements

### Planned Features
- [ ] **Food Recommendation System** (AI-powered)
- [ ] Loyalty Rewards Program (Points + Tiers)
- [ ] Review Submission Flow (Post-delivery)
- [ ] Driver Portal/Login
- [ ] Restaurant Portal/Login
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Scheduled orders
- [ ] Group orders

---

## 📄 License

This project is built for educational and commercial purposes.

---

**Built with ❤️ using Emergent AI**

Version: 1.0.0
