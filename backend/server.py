from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import bcrypt
import jwt
import secrets
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
import socketio
from notifications import notify_order_status_change, send_order_confirmation, send_welcome_email
from recommendations import (
    get_personalized_recommendations,
    get_popular_items,
    get_similar_items,
    get_frequently_bought_together,
    get_trending_items,
    get_reorder_suggestions
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize Socket.IO
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Create FastAPI app
fastapi_app = FastAPI(
    title="QuickBites Food Delivery API",
    description="""
    ## QuickBites - Food Delivery Platform API
    
    A comprehensive food delivery platform with real-time order tracking, GPS live delivery tracking, 
    admin dashboard, and Stripe payment integration.
    
    ### Features:
    * **Authentication** - JWT-based secure authentication
    * **Restaurant Management** - Browse and search restaurants
    * **Order Management** - Create, track, and manage orders
    * **Real-time Updates** - WebSocket-powered live tracking
    * **Payment Integration** - Stripe checkout and webhooks
    * **Recommendations** - AI-powered food suggestions
    * **Admin Dashboard** - Complete platform management
    * **GPS Tracking** - Live driver location tracking
    
    ### Authentication:
    Most endpoints require authentication. Login to receive JWT tokens stored in httpOnly cookies.
    
    **Test Accounts:**
    - Admin: `admin@fooddelivery.com` / `admin123`
    - User: `user@test.com` / `user123`
    """,
    version="1.0.0",
    contact={
        "name": "QuickBites Support",
        "email": "support@quickbites.com",
    },
    license_info={
        "name": "Proprietary",
    },
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ['JWT_SECRET']

# ==================== Socket.IO Events ====================
logger = logging.getLogger(__name__)

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    await sio.emit('connection_status', {'status': 'connected'}, room=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@sio.event
async def join_order_room(sid, data):
    """Join a room for specific order updates"""
    order_id = data.get('order_id')
    if not order_id:
        logger.warning(f"join_order_room called without order_id for {sid}")
        return
    await sio.enter_room(sid, f"order_{order_id}")
    logger.info(f"Client {sid} joined order room: order_{order_id}")
    await sio.emit('room_joined', {'order_id': order_id}, room=sid)

@sio.event
async def leave_order_room(sid, data):
    """Leave a specific order room"""
    order_id = data.get('order_id')
    if order_id:
        await sio.leave_room(sid, f"order_{order_id}")
        logger.info(f"Client {sid} left order room: order_{order_id}")

@sio.event
async def update_driver_location(sid, data):
    """Receive driver location update and broadcast to order room"""
    driver_id = data.get('driver_id')
    order_id = data.get('order_id')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    
    if not all([driver_id, order_id, latitude, longitude]):
        logger.warning(f"Invalid driver location update from {sid}")
        return
    
    # Update driver location in database
    await db.drivers.update_one(
        {"_id": ObjectId(driver_id)},
        {
            "$set": {
                "current_location": {
                    "type": "Point",
                    "coordinates": [longitude, latitude]
                },
                "last_updated": datetime.now(timezone.utc)
            }
        }
    )
    
    # Broadcast to order room
    room = f"order_{order_id}"
    await sio.emit('driver_location_update', {
        'driver_id': driver_id,
        'latitude': latitude,
        'longitude': longitude,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }, room=room)
    logger.info(f"Driver {driver_id} location updated for order {order_id}")

async def broadcast_order_update(order_id: str, order_data: dict):
    """Broadcast order status update to all clients in the order room"""
    room = f"order_{order_id}"
    # Convert datetime to ISO string for JSON serialization
    if 'updated_at' in order_data and isinstance(order_data['updated_at'], datetime):
        order_data['updated_at'] = order_data['updated_at'].isoformat()
    if 'created_at' in order_data and isinstance(order_data['created_at'], datetime):
        order_data['created_at'] = order_data['created_at'].isoformat()
    
    await sio.emit('order_update', {
        'order_id': order_id,
        'status': order_data.get('status'),
        'data': order_data
    }, room=room)
    logger.info(f"Broadcasted order update to room {room}: status={order_data.get('status')}")

# ==================== Helper Functions ====================
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])}, {"password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== Pydantic Models ====================
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class RestaurantCreate(BaseModel):
    name: str
    description: str
    cuisine_type: str
    image: str
    delivery_time: str
    min_order: float

class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cuisine_type: Optional[str] = None
    image: Optional[str] = None
    delivery_time: Optional[str] = None
    min_order: Optional[float] = None
    is_active: Optional[bool] = None

class MenuItemCreate(BaseModel):
    restaurant_id: str
    name: str
    description: str
    price: float
    image: str
    category: str

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image: Optional[str] = None
    category: Optional[str] = None
    is_available: Optional[bool] = None

class OrderItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    quantity: int

class OrderCreate(BaseModel):
    restaurant_id: str
    items: List[OrderItem]
    delivery_address_id: str

class ReviewCreate(BaseModel):
    restaurant_id: str
    order_id: str
    rating: int
    comment: str

class AddressCreate(BaseModel):
    label: str
    street: str
    city: str
    state: str
    zip_code: str

class AddressUpdate(BaseModel):
    label: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    is_default: Optional[bool] = None

class CheckoutRequest(BaseModel):
    order_id: str
    origin_url: str

class DriverLocationUpdate(BaseModel):
    driver_id: str
    latitude: float
    longitude: float

class AssignDriverRequest(BaseModel):
    driver_id: str

# ==================== Startup Events ====================
@fastapi_app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.restaurants.create_index("cuisine_type")
    await db.menu_items.create_index("restaurant_id")
    await db.orders.create_index("user_id")
    await db.reviews.create_index("restaurant_id")
    
    # Seed admin user
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@fooddelivery.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing_admin = await db.users.find_one({"email": admin_email})
    
    if existing_admin is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "phone": None,
            "created_at": datetime.now(timezone.utc)
        })
    elif not verify_password(admin_password, existing_admin["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
    
    # Create test user
    test_email = "user@test.com"
    test_password = "user123"
    existing_test = await db.users.find_one({"email": test_email})
    if existing_test is None:
        await db.users.insert_one({
            "email": test_email,
            "password_hash": hash_password(test_password),
            "name": "Test User",
            "role": "user",
            "phone": "+1234567890",
            "created_at": datetime.now(timezone.utc)
        })
    
    # Write credentials to file
    credentials_content = f"""# Test Credentials

## Admin Account
- Email: {admin_email}
- Password: {admin_password}
- Role: admin

## Test User Account
- Email: {test_email}
- Password: {test_password}
- Role: user

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
"""
    
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(credentials_content)
    
    # Seed sample restaurants
    restaurant_count = await db.restaurants.count_documents({})
    if restaurant_count == 0:
        sample_restaurants = [
            {
                "name": "Burger Palace",
                "description": "Gourmet burgers made with fresh, locally sourced ingredients",
                "cuisine_type": "American",
                "image": "https://images.unsplash.com/photo-1639262881416-01dca65c37ce?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHw0fHxkZWxpY2lvdXMlMjBnb3VybWV0JTIwYnVyZ2VyJTIwZGFyayUyMGJhY2tncm91bmR8ZW58MHx8fHwxNzc1NzA3NDQwfDA&ixlib=rb-4.1.0&q=85",
                "rating": 4.5,
                "delivery_time": "25-35 min",
                "min_order": 15.0,
                "is_active": True,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "name": "Fresh & Healthy",
                "description": "Nutritious salads, bowls, and smoothies for a healthy lifestyle",
                "cuisine_type": "Healthy",
                "image": "https://images.unsplash.com/photo-1622637103261-ae624e188bd0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHw0fHxmcmVzaCUyMGhlYWx0aHklMjBzYWxhZCUyMGJvd2x8ZW58MHx8fHwxNzc1NzA3NDQwfDA&ixlib=rb-4.1.0&q=85",
                "rating": 4.7,
                "delivery_time": "20-30 min",
                "min_order": 12.0,
                "is_active": True,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "name": "Sushi Express",
                "description": "Authentic Japanese sushi and rolls prepared by expert chefs",
                "cuisine_type": "Japanese",
                "image": "https://images.unsplash.com/photo-1663870158409-2d3c78ba0a9f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxzdXNoaSUyMHBsYXR0ZXIlMjB0b3AlMjB2aWV3fGVufDB8fHx8MTc3NTcwNzQ0MHww&ixlib=rb-4.1.0&q=85",
                "rating": 4.8,
                "delivery_time": "30-40 min",
                "min_order": 20.0,
                "is_active": True,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "name": "Pizza Perfection",
                "description": "Wood-fired pizzas with authentic Italian flavors",
                "cuisine_type": "Italian",
                "image": "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwxfHxwaXp6YSUyMHRvcCUyMHZpZXd8ZW58MHx8fHwxNzc1NzA3NDU2fDA&ixlib=rb-4.1.0&q=85",
                "rating": 4.6,
                "delivery_time": "25-35 min",
                "min_order": 18.0,
                "is_active": True,
                "created_at": datetime.now(timezone.utc)
            }
        ]
        result = await db.restaurants.insert_many(sample_restaurants)
        
        # Seed menu items for each restaurant
        menu_items = []
        # Burger Palace items
        menu_items.extend([
            {"restaurant_id": str(result.inserted_ids[0]), "name": "Classic Burger", "description": "Beef patty, lettuce, tomato, onion, pickles", "price": 12.99, "image": "https://images.unsplash.com/photo-1639262881416-01dca65c37ce?w=400", "category": "Burgers", "is_available": True, "created_at": datetime.now(timezone.utc)},
            {"restaurant_id": str(result.inserted_ids[0]), "name": "Cheese Burger", "description": "Double cheese, beef patty, special sauce", "price": 14.99, "image": "https://images.unsplash.com/photo-1639262881416-01dca65c37ce?w=400", "category": "Burgers", "is_available": True, "created_at": datetime.now(timezone.utc)},
            {"restaurant_id": str(result.inserted_ids[0]), "name": "Fries", "description": "Crispy golden fries", "price": 4.99, "image": "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400", "category": "Sides", "is_available": True, "created_at": datetime.now(timezone.utc)},
        ])
        # Fresh & Healthy items
        menu_items.extend([
            {"restaurant_id": str(result.inserted_ids[1]), "name": "Caesar Salad", "description": "Romaine lettuce, parmesan, croutons, caesar dressing", "price": 10.99, "image": "https://images.unsplash.com/photo-1622637103261-ae624e188bd0?w=400", "category": "Salads", "is_available": True, "created_at": datetime.now(timezone.utc)},
            {"restaurant_id": str(result.inserted_ids[1]), "name": "Protein Bowl", "description": "Quinoa, grilled chicken, avocado, mixed greens", "price": 13.99, "image": "https://images.unsplash.com/photo-1622637103261-ae624e188bd0?w=400", "category": "Bowls", "is_available": True, "created_at": datetime.now(timezone.utc)},
            {"restaurant_id": str(result.inserted_ids[1]), "name": "Green Smoothie", "description": "Spinach, banana, mango, almond milk", "price": 6.99, "image": "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400", "category": "Drinks", "is_available": True, "created_at": datetime.now(timezone.utc)},
        ])
        # Sushi Express items
        menu_items.extend([
            {"restaurant_id": str(result.inserted_ids[2]), "name": "California Roll", "description": "Crab, avocado, cucumber", "price": 8.99, "image": "https://images.unsplash.com/photo-1663870158409-2d3c78ba0a9f?w=400", "category": "Rolls", "is_available": True, "created_at": datetime.now(timezone.utc)},
            {"restaurant_id": str(result.inserted_ids[2]), "name": "Spicy Tuna Roll", "description": "Tuna, spicy mayo, cucumber", "price": 9.99, "image": "https://images.unsplash.com/photo-1663870158409-2d3c78ba0a9f?w=400", "category": "Rolls", "is_available": True, "created_at": datetime.now(timezone.utc)},
            {"restaurant_id": str(result.inserted_ids[2]), "name": "Sashimi Platter", "description": "Assorted fresh fish", "price": 24.99, "image": "https://images.unsplash.com/photo-1663870158409-2d3c78ba0a9f?w=400", "category": "Sashimi", "is_available": True, "created_at": datetime.now(timezone.utc)},
        ])
        # Pizza Perfection items
        menu_items.extend([
            {"restaurant_id": str(result.inserted_ids[3]), "name": "Margherita Pizza", "description": "Tomato sauce, mozzarella, basil", "price": 14.99, "image": "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400", "category": "Pizza", "is_available": True, "created_at": datetime.now(timezone.utc)},
            {"restaurant_id": str(result.inserted_ids[3]), "name": "Pepperoni Pizza", "description": "Tomato sauce, mozzarella, pepperoni", "price": 16.99, "image": "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400", "category": "Pizza", "is_available": True, "created_at": datetime.now(timezone.utc)},
            {"restaurant_id": str(result.inserted_ids[3]), "name": "Garlic Bread", "description": "Toasted bread with garlic butter", "price": 5.99, "image": "https://images.unsplash.com/photo-1573140401552-388e8f0c1c37?w=400", "category": "Sides", "is_available": True, "created_at": datetime.now(timezone.utc)},
        ])
        
        await db.menu_items.insert_many(menu_items)
    
    # Seed drivers
    driver_count = await db.drivers.count_documents({})
    if driver_count == 0:
        sample_drivers = [
            {
                "name": "John Driver",
                "phone": "+1234567890",
                "email": "john.driver@quickbites.com",
                "vehicle_info": "Honda Civic - ABC123",
                "photo_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
                "rating": 4.8,
                "total_deliveries": 245,
                "is_available": True,
                "current_location": {
                    "type": "Point",
                    "coordinates": [-122.4194, 37.7749]  # San Francisco
                },
                "last_updated": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc)
            },
            {
                "name": "Sarah Delivery",
                "phone": "+1234567891",
                "email": "sarah.delivery@quickbites.com",
                "vehicle_info": "Toyota Prius - XYZ789",
                "photo_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
                "rating": 4.9,
                "total_deliveries": 312,
                "is_available": True,
                "current_location": {
                    "type": "Point",
                    "coordinates": [-122.4084, 37.7849]
                },
                "last_updated": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc)
            },
            {
                "name": "Mike Fast",
                "phone": "+1234567892",
                "email": "mike.fast@quickbites.com",
                "vehicle_info": "Motorcycle - FAST01",
                "photo_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
                "rating": 4.7,
                "total_deliveries": 198,
                "is_available": True,
                "current_location": {
                    "type": "Point",
                    "coordinates": [-122.4294, 37.7649]
                },
                "last_updated": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc)
            }
        ]
        await db.drivers.insert_many(sample_drivers)
        await db.drivers.create_index([("current_location", "2dsphere")])

# ==================== Auth Routes ====================
@api_router.post("/auth/register")
async def register(data: RegisterRequest, response: Response):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "phone": data.phone,
        "role": "user",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Send welcome email (mocked)
    await send_welcome_email(email, data.name)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"_id": user_id, "email": email, "name": data.name, "role": "user"}

@api_router.post("/auth/login")
async def login(data: LoginRequest, response: Response, request: Request):
    email = data.email.lower()
    
    # Brute force protection
    client_ip = request.client.host if request.client else "unknown"
    identifier = f"{client_ip}:{email}"
    attempt_doc = await db.login_attempts.find_one({"identifier": identifier})
    
    if attempt_doc and attempt_doc.get("locked_until"):
        if attempt_doc["locked_until"] > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Please try again later.")
    
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        # Increment failed attempts
        if attempt_doc:
            new_attempts = attempt_doc.get("attempts", 0) + 1
            locked_until = None
            if new_attempts >= 5:
                locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
            await db.login_attempts.update_one(
                {"identifier": identifier},
                {"$set": {"attempts": new_attempts, "locked_until": locked_until}}
            )
        else:
            await db.login_attempts.insert_one({"identifier": identifier, "attempts": 1, "locked_until": None})
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Clear failed attempts
    await db.login_attempts.delete_one({"identifier": identifier})
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"_id": user_id, "email": user["email"], "name": user["name"], "role": user.get("role", "user")}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token not found")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])}, {"password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_id = str(user["_id"])
        new_access_token = create_access_token(user_id, user["email"])
        
        response.set_cookie(key="access_token", value=new_access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}
    
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "email": email,
        "token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        "used": False
    })
    
    print(f"Password reset link: http://localhost:3000/reset-password?token={token}")
    return {"message": "If the email exists, a reset link has been sent"}

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    reset_doc = await db.password_reset_tokens.find_one({"token": data.token})
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    if reset_doc["used"]:
        raise HTTPException(status_code=400, detail="Token already used")
    
    if reset_doc["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")
    
    await db.users.update_one(
        {"email": reset_doc["email"]},
        {"$set": {"password_hash": hash_password(data.new_password)}}
    )
    
    await db.password_reset_tokens.update_one(
        {"token": data.token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successfully"}

# ==================== Restaurant Routes ====================
@api_router.get("/restaurants")
async def get_restaurants(
    cuisine: Optional[str] = None,
    min_rating: Optional[float] = None,
    search: Optional[str] = None
):
    query = {"is_active": True}
    if cuisine:
        query["cuisine_type"] = cuisine
    if min_rating:
        query["rating"] = {"$gte": min_rating}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    restaurants = await db.restaurants.find(query).limit(100).to_list(100)
    for r in restaurants:
        r["_id"] = str(r["_id"])
    return restaurants

@api_router.get("/restaurants/{restaurant_id}")
async def get_restaurant(restaurant_id: str):
    if not ObjectId.is_valid(restaurant_id):
        raise HTTPException(status_code=400, detail="Invalid restaurant ID")
    
    restaurant = await db.restaurants.find_one({"_id": ObjectId(restaurant_id)})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    restaurant["_id"] = str(restaurant["_id"])
    return restaurant

@api_router.get("/restaurants/{restaurant_id}/menu")
async def get_restaurant_menu(restaurant_id: str):
    menu_items = await db.menu_items.find(
        {"restaurant_id": restaurant_id, "is_available": True}
    ).limit(100).to_list(100)
    for item in menu_items:
        item["_id"] = str(item["_id"])
    return menu_items

@api_router.get("/restaurants/{restaurant_id}/reviews")
async def get_restaurant_reviews(restaurant_id: str):
    pipeline = [
        {"$match": {"restaurant_id": restaurant_id}},
        {"$sort": {"created_at": -1}},
        {"$limit": 50},
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user_data"
            }
        },
        {
            "$addFields": {
                "user_name": {
                    "$ifNull": [{"$arrayElemAt": ["$user_data.name", 0]}, "Unknown"]
                }
            }
        },
        {"$project": {"user_data": 0, "_id": 0}}
    ]
    reviews = await db.reviews.aggregate(pipeline).to_list(None)
    return reviews

# ==================== Order Routes ====================
@api_router.post("/orders")
async def create_order(data: OrderCreate, request: Request):
    user = await get_current_user(request)
    
    # Validate address
    if not ObjectId.is_valid(data.delivery_address_id):
        raise HTTPException(status_code=400, detail="Invalid address ID")
    
    address = await db.addresses.find_one({"_id": ObjectId(data.delivery_address_id), "user_id": user["_id"]})
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # Calculate total
    total_amount = sum(item.price * item.quantity for item in data.items)
    
    order_doc = {
        "user_id": user["_id"],
        "restaurant_id": data.restaurant_id,
        "items": [item.model_dump() for item in data.items],
        "delivery_address": {
            "street": address["street"],
            "city": address["city"],
            "state": address["state"],
            "zip_code": address["zip_code"]
        },
        "total_amount": total_amount,
        "status": "pending",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.orders.insert_one(order_doc)
    order_id = str(result.inserted_id)
    
    return {"order_id": order_id, "total_amount": total_amount}

@api_router.get("/orders")
async def get_user_orders(request: Request):
    user = await get_current_user(request)
    
    pipeline = [
        {"$match": {"user_id": user["_id"]}},
        {"$sort": {"created_at": -1}},
        {"$limit": 50},
        {
            "$addFields": {
                "restaurant_oid": {
                    "$cond": {
                        "if": {"$eq": [{"$type": "$restaurant_id"}, "objectId"]},
                        "then": "$restaurant_id",
                        "else": None
                    }
                }
            }
        },
        {
            "$lookup": {
                "from": "restaurants",
                "localField": "restaurant_oid",
                "foreignField": "_id",
                "as": "restaurant_data"
            }
        },
        {
            "$addFields": {
                "order_id": {"$toString": "$_id"},
                "restaurant_name": {
                    "$ifNull": [
                        {"$arrayElemAt": ["$restaurant_data.name", 0]},
                        "$restaurant_id"
                    ]
                }
            }
        },
        {"$project": {"restaurant_data": 0, "restaurant_oid": 0, "_id": 0}}
    ]
    
    orders = await db.orders.aggregate(pipeline).to_list(None)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, request: Request):
    user = await get_current_user(request)
    
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    order = await db.orders.find_one({"_id": ObjectId(order_id), "user_id": user["_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order

# ==================== Review Routes ====================
@api_router.post("/reviews")
async def create_review(data: ReviewCreate, request: Request):
    user = await get_current_user(request)
    
    # Validate order exists and belongs to user
    if not ObjectId.is_valid(data.order_id):
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    order = await db.orders.find_one({"_id": ObjectId(data.order_id), "user_id": user["_id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    review_doc = {
        "user_id": user["_id"],
        "restaurant_id": data.restaurant_id,
        "order_id": data.order_id,
        "rating": data.rating,
        "comment": data.comment,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.reviews.insert_one(review_doc)
    
    # Update restaurant rating using aggregation
    pipeline = [
        {"$match": {"restaurant_id": data.restaurant_id}},
        {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}
    ]
    result = await db.reviews.aggregate(pipeline).to_list(None)
    
    if result and ObjectId.is_valid(data.restaurant_id):
        avg_rating = result[0]["avg_rating"]
        await db.restaurants.update_one(
            {"_id": ObjectId(data.restaurant_id)},
            {"$set": {"rating": round(avg_rating, 1)}}
        )
    
    return {"message": "Review created successfully"}

# ==================== Address Routes ====================
@api_router.get("/addresses")
async def get_addresses(request: Request):
    user = await get_current_user(request)
    addresses = await db.addresses.find({"user_id": user["_id"]}, {"_id": 1, "label": 1, "street": 1, "city": 1, "state": 1, "zip_code": 1, "is_default": 1}).to_list(50)
    
    for addr in addresses:
        addr["_id"] = str(addr["_id"])
    
    return addresses

@api_router.post("/addresses")
async def create_address(data: AddressCreate, request: Request):
    user = await get_current_user(request)
    
    # Check if this is the first address
    count = await db.addresses.count_documents({"user_id": user["_id"]})
    is_default = count == 0
    
    address_doc = {
        "user_id": user["_id"],
        "label": data.label,
        "street": data.street,
        "city": data.city,
        "state": data.state,
        "zip_code": data.zip_code,
        "is_default": is_default,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.addresses.insert_one(address_doc)
    return {"address_id": str(result.inserted_id)}

@api_router.put("/addresses/{address_id}")
async def update_address(address_id: str, data: AddressUpdate, request: Request):
    user = await get_current_user(request)
    
    if not ObjectId.is_valid(address_id):
        raise HTTPException(status_code=400, detail="Invalid address ID")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if data.is_default:
        # Unset other defaults
        await db.addresses.update_many(
            {"user_id": user["_id"]},
            {"$set": {"is_default": False}}
        )
    
    result = await db.addresses.update_one(
        {"_id": ObjectId(address_id), "user_id": user["_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    
    return {"message": "Address updated successfully"}

@api_router.delete("/addresses/{address_id}")
async def delete_address(address_id: str, request: Request):
    user = await get_current_user(request)
    
    if not ObjectId.is_valid(address_id):
        raise HTTPException(status_code=400, detail="Invalid address ID")
    
    result = await db.addresses.delete_one({"_id": ObjectId(address_id), "user_id": user["_id"]})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    
    return {"message": "Address deleted successfully"}

# ==================== Payment Routes ====================
@api_router.post("/payments/checkout/session")
async def create_checkout_session(data: CheckoutRequest, request: Request):
    user = await get_current_user(request)
    
    # Get order
    if not ObjectId.is_valid(data.order_id):
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    order = await db.orders.find_one({"_id": ObjectId(data.order_id), "user_id": user["_id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Create Stripe checkout session
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    host_url = data.origin_url
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    success_url = f"{host_url}/order-success?session_id={{{{CHECKOUT_SESSION_ID}}}}"
    cancel_url = f"{host_url}/cart"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(order["total_amount"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"order_id": data.order_id, "user_id": user["_id"]}
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["_id"],
        "order_id": data.order_id,
        "amount": float(order["total_amount"]),
        "currency": "usd",
        "payment_status": "pending",
        "metadata": {"order_id": data.order_id, "user_id": user["_id"]},
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, request: Request):
    user = await get_current_user(request)
    
    # Check existing transaction
    transaction = await db.payment_transactions.find_one({"session_id": session_id, "user_id": user["_id"]})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # If already processed, return cached status
    if transaction.get("payment_status") == "paid":
        return {
            "status": "complete",
            "payment_status": "paid",
            "amount_total": int(transaction["amount"] * 100),
            "currency": transaction["currency"]
        }
    
    # Fetch from Stripe
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    checkout_status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction and order if paid
    if checkout_status.payment_status == "paid" and transaction.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid"}}
        )
        
        order_id = transaction.get("order_id")
        if order_id and ObjectId.is_valid(order_id):
            await db.orders.update_one(
                {"_id": ObjectId(order_id)},
                {"$set": {"payment_status": "paid", "status": "confirmed", "updated_at": datetime.now(timezone.utc)}}
            )
    
    return {
        "status": checkout_status.status,
        "payment_status": checkout_status.payment_status,
        "amount_total": checkout_status.amount_total,
        "currency": checkout_status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    stripe_signature = request.headers.get("Stripe-Signature")
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, stripe_signature)
        
        if webhook_response.payment_status == "paid":
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {"payment_status": "paid"}}
            )
            
            # Update order
            transaction = await db.payment_transactions.find_one({"session_id": webhook_response.session_id})
            if transaction and transaction.get("order_id"):
                order_id = transaction["order_id"]
                if ObjectId.is_valid(order_id):
                    await db.orders.update_one(
                        {"_id": ObjectId(order_id)},
                        {"$set": {"payment_status": "paid", "status": "confirmed", "updated_at": datetime.now(timezone.utc)}}
                    )
        
        return {"message": "Webhook processed"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== Recommendation Routes ====================
@api_router.get("/recommendations/personalized")
async def get_user_recommendations(request: Request, limit: int = 6):
    """Get personalized recommendations for logged-in user"""
    user = await get_current_user(request)
    recommendations = await get_personalized_recommendations(db, user["_id"], limit)
    return recommendations

@api_router.get("/recommendations/popular")
async def get_popular_recommendations(limit: int = 6):
    """Get popular items across platform"""
    items = await get_popular_items(db, limit)
    return items

@api_router.get("/recommendations/trending")
async def get_trending_recommendations(days: int = 7, limit: int = 6):
    """Get trending items from recent orders"""
    items = await get_trending_items(db, days, limit)
    return items

@api_router.get("/recommendations/similar/{item_id}")
async def get_similar_recommendations(item_id: str, limit: int = 4):
    """Get similar items to the given item"""
    items = await get_similar_items(db, item_id, limit)
    return items

@api_router.get("/recommendations/frequently-bought-together/{item_id}")
async def get_bought_together_recommendations(item_id: str, limit: int = 3):
    """Get items frequently bought together with given item"""
    items = await get_frequently_bought_together(db, item_id, limit)
    return items

@api_router.get("/recommendations/reorder")
async def get_reorder_recommendations(request: Request, limit: int = 6):
    """Get items user has ordered before"""
    user = await get_current_user(request)
    items = await get_reorder_suggestions(db, user["_id"], limit)
    return items

# ==================== Driver Routes ====================
@api_router.get("/drivers")
async def get_available_drivers():
    """Get all available drivers"""
    drivers = await db.drivers.find({"is_available": True}).to_list(50)
    for driver in drivers:
        driver["_id"] = str(driver["_id"])
    return drivers

@api_router.get("/drivers/{driver_id}")
async def get_driver(driver_id: str):
    """Get driver details"""
    if not ObjectId.is_valid(driver_id):
        raise HTTPException(status_code=400, detail="Invalid driver ID")
    
    driver = await db.drivers.find_one({"_id": ObjectId(driver_id)})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    driver["_id"] = str(driver["_id"])
    return driver

@api_router.post("/orders/{order_id}/assign-driver")
async def assign_driver_to_order(order_id: str, data: AssignDriverRequest, request: Request):
    """Assign a driver to an order (Admin only)"""
    await get_current_admin(request)
    
    if not ObjectId.is_valid(order_id) or not ObjectId.is_valid(data.driver_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # Check if driver exists and is available
    driver = await db.drivers.find_one({"_id": ObjectId(data.driver_id), "is_available": True})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not available")
    
    # Update order with driver info
    result = await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {
                "driver_id": data.driver_id,
                "driver_name": driver["name"],
                "driver_phone": driver["phone"],
                "driver_vehicle": driver.get("vehicle_info", ""),
                "status": "on_the_way",
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Mark driver as busy
    await db.drivers.update_one(
        {"_id": ObjectId(data.driver_id)},
        {"$set": {"is_available": False, "current_order_id": order_id}}
    )
    
    # Broadcast update
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if order:
        order_data = {
            "order_id": order_id,
            "status": "on_the_way",
            "driver": {
                "id": data.driver_id,
                "name": driver["name"],
                "phone": driver["phone"],
                "vehicle": driver.get("vehicle_info", ""),
                "photo": driver.get("photo_url", "")
            },
            "updated_at": datetime.now(timezone.utc)
        }
        await broadcast_order_update(order_id, order_data)
    
    return {"message": "Driver assigned successfully", "driver_name": driver["name"]}

@api_router.get("/orders/{order_id}/driver-location")
async def get_driver_location(order_id: str, request: Request):
    """Get current driver location for an order"""
    user = await get_current_user(request)
    
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    order = await db.orders.find_one({"_id": ObjectId(order_id), "user_id": user["_id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    driver_id = order.get("driver_id")
    if not driver_id or not ObjectId.is_valid(driver_id):
        return {"driver_assigned": False}
    
    driver = await db.drivers.find_one({"_id": ObjectId(driver_id)})
    if not driver:
        return {"driver_assigned": False}
    
    location = driver.get("current_location", {})
    coordinates = location.get("coordinates", [0, 0])
    
    return {
        "driver_assigned": True,
        "driver": {
            "id": str(driver["_id"]),
            "name": driver["name"],
            "phone": driver["phone"],
            "vehicle": driver.get("vehicle_info", ""),
            "photo": driver.get("photo_url", ""),
            "rating": driver.get("rating", 0)
        },
        "location": {
            "latitude": coordinates[1] if len(coordinates) > 1 else 0,
            "longitude": coordinates[0] if len(coordinates) > 0 else 0
        },
        "last_updated": driver.get("last_updated", datetime.now(timezone.utc)).isoformat() if driver.get("last_updated") else datetime.now(timezone.utc).isoformat()
    }

# ==================== Admin Routes ====================
@api_router.get("/admin/restaurants")
async def admin_get_restaurants(request: Request):
    await get_current_admin(request)
    restaurants = await db.restaurants.find({}).limit(100).to_list(None)
    
    for r in restaurants:
        r["_id"] = str(r["_id"])
    
    return restaurants

@api_router.post("/admin/restaurants")
async def admin_create_restaurant(data: RestaurantCreate, request: Request):
    await get_current_admin(request)
    
    restaurant_doc = {
        **data.model_dump(),
        "rating": 0.0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.restaurants.insert_one(restaurant_doc)
    return {"restaurant_id": str(result.inserted_id)}

@api_router.put("/admin/restaurants/{restaurant_id}")
async def admin_update_restaurant(restaurant_id: str, data: RestaurantUpdate, request: Request):
    await get_current_admin(request)
    
    if not ObjectId.is_valid(restaurant_id):
        raise HTTPException(status_code=400, detail="Invalid restaurant ID")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    result = await db.restaurants.update_one(
        {"_id": ObjectId(restaurant_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    return {"message": "Restaurant updated successfully"}

@api_router.delete("/admin/restaurants/{restaurant_id}")
async def admin_delete_restaurant(restaurant_id: str, request: Request):
    await get_current_admin(request)
    
    if not ObjectId.is_valid(restaurant_id):
        raise HTTPException(status_code=400, detail="Invalid restaurant ID")
    
    result = await db.restaurants.delete_one({"_id": ObjectId(restaurant_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    return {"message": "Restaurant deleted successfully"}

@api_router.get("/admin/menu-items")
async def admin_get_menu_items(request: Request, restaurant_id: Optional[str] = None):
    await get_current_admin(request)
    
    query = {}
    if restaurant_id:
        query["restaurant_id"] = restaurant_id
    
    items = await db.menu_items.find(query).limit(500).to_list(None)
    
    for item in items:
        item["_id"] = str(item["_id"])
    
    return items

@api_router.post("/admin/menu-items")
async def admin_create_menu_item(data: MenuItemCreate, request: Request):
    await get_current_admin(request)
    
    item_doc = {
        **data.model_dump(),
        "is_available": True,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.menu_items.insert_one(item_doc)
    return {"menu_item_id": str(result.inserted_id)}

@api_router.put("/admin/menu-items/{item_id}")
async def admin_update_menu_item(item_id: str, data: MenuItemUpdate, request: Request):
    await get_current_admin(request)
    
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    result = await db.menu_items.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    return {"message": "Menu item updated successfully"}

@api_router.delete("/admin/menu-items/{item_id}")
async def admin_delete_menu_item(item_id: str, request: Request):
    await get_current_admin(request)
    
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
    
    result = await db.menu_items.delete_one({"_id": ObjectId(item_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    return {"message": "Menu item deleted successfully"}

@api_router.get("/admin/orders")
async def admin_get_orders(request: Request):
    await get_current_admin(request)
    
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$limit": 100},
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user_data"
            }
        },
        {
            "$addFields": {
                "restaurant_oid": {
                    "$cond": {
                        "if": {"$eq": [{"$type": "$restaurant_id"}, "objectId"]},
                        "then": "$restaurant_id",
                        "else": None
                    }
                }
            }
        },
        {
            "$lookup": {
                "from": "restaurants",
                "localField": "restaurant_oid",
                "foreignField": "_id",
                "as": "restaurant_data"
            }
        },
        {
            "$addFields": {
                "user_name": {"$ifNull": [{"$arrayElemAt": ["$user_data.name", 0]}, "Unknown"]},
                "user_email": {"$ifNull": [{"$arrayElemAt": ["$user_data.email", 0]}, "Unknown"]},
                "restaurant_name": {
                    "$ifNull": [
                        {"$arrayElemAt": ["$restaurant_data.name", 0]},
                        "$restaurant_id"
                    ]
                }
            }
        },
        {"$project": {"user_data": 0, "restaurant_data": 0, "restaurant_oid": 0}}
    ]
    
    orders = await db.orders.aggregate(pipeline).to_list(None)
    
    for order in orders:
        order["_id"] = str(order["_id"])
    
    return orders

@api_router.put("/admin/orders/{order_id}")
async def admin_update_order_status(order_id: str, status: str, request: Request):
    await get_current_admin(request)
    
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    valid_statuses = ["pending", "confirmed", "preparing", "ready", "on_the_way", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get updated order and broadcast via WebSocket
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if order:
        # Get user info for notifications
        user = await db.users.find_one({"_id": ObjectId(order["user_id"])}, {"email": 1, "phone": 1, "_id": 0})
        
        # Send notifications (mocked)
        if user:
            await notify_order_status_change(
                order, 
                status, 
                user.get("email"), 
                user.get("phone")
            )
        
        # Prepare order data for broadcast
        order_data = {
            "order_id": order_id,
            "status": status,
            "updated_at": order.get("updated_at"),
            "total_amount": order.get("total_amount"),
            "items": order.get("items", [])
        }
        
        # Broadcast to WebSocket clients
        await broadcast_order_update(order_id, order_data)
    
    return {"message": "Order status updated successfully"}

@api_router.get("/admin/analytics")
async def admin_get_analytics(request: Request):
    await get_current_admin(request)
    
    total_orders = await db.orders.count_documents({})
    total_revenue = await db.orders.aggregate([
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    
    total_users = await db.users.count_documents({"role": "user"})
    total_restaurants = await db.restaurants.count_documents({})
    
    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue[0]["total"] if total_revenue else 0,
        "total_users": total_users,
        "total_restaurants": total_restaurants
    }

@api_router.get("/admin/users")
async def admin_get_users(request: Request):
    await get_current_admin(request)
    users = await db.users.find({}, {"password_hash": 0}).to_list(100)
    
    for user in users:
        user["_id"] = str(user["_id"])
    
    return users

# Include router
fastapi_app.include_router(api_router)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

@fastapi_app.on_event("startup")
async def startup():
    logger.info("FastAPI server starting with WebSocket support")

@fastapi_app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("MongoDB connection closed")

# Wrap FastAPI with Socket.IO
socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=fastapi_app,
    socketio_path='/api/socket.io'
)

# Export the Socket.IO wrapped app
app = socket_app
