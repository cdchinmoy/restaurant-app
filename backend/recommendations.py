# Food Recommendation Engine
# Analyzes user behavior and provides personalized suggestions

from typing import List, Dict, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from collections import defaultdict, Counter

async def get_user_preferences(db, user_id: str) -> Dict:
    """Analyze user's order history to determine preferences"""
    orders = await db.orders.find({"user_id": user_id}).to_list(100)
    
    if not orders:
        return {
            "favorite_cuisines": [],
            "avg_price_range": (0, 50),
            "favorite_categories": [],
            "favorite_restaurants": [],
            "total_orders": 0
        }
    
    cuisines = []
    categories = []
    restaurants = []
    prices = []
    
    for order in orders:
        # Get restaurant info
        restaurant_id = order.get("restaurant_id")
        if restaurant_id and ObjectId.is_valid(restaurant_id):
            restaurant = await db.restaurants.find_one({"_id": ObjectId(restaurant_id)})
            if restaurant:
                cuisines.append(restaurant.get("cuisine_type"))
                restaurants.append(restaurant_id)
        
        # Get item categories and prices
        for item in order.get("items", []):
            prices.append(item.get("price", 0))
            # Get category from menu item
            menu_item_id = item.get("menu_item_id")
            if menu_item_id and ObjectId.is_valid(menu_item_id):
                menu_item = await db.menu_items.find_one({"_id": ObjectId(menu_item_id)})
                if menu_item:
                    categories.append(menu_item.get("category"))
    
    # Calculate preferences
    cuisine_counts = Counter(cuisines)
    category_counts = Counter(categories)
    restaurant_counts = Counter(restaurants)
    
    avg_price = sum(prices) / len(prices) if prices else 25
    price_range = (max(0, avg_price - 10), avg_price + 10)
    
    return {
        "favorite_cuisines": [c for c, _ in cuisine_counts.most_common(3)],
        "avg_price_range": price_range,
        "favorite_categories": [c for c, _ in category_counts.most_common(3)],
        "favorite_restaurants": [r for r, _ in restaurant_counts.most_common(3)],
        "total_orders": len(orders)
    }

async def get_personalized_recommendations(db, user_id: str, limit: int = 6) -> List[Dict]:
    """Get personalized menu item recommendations based on user preferences"""
    prefs = await get_user_preferences(db, user_id)
    
    if prefs["total_orders"] == 0:
        # New user - return popular items
        return await get_popular_items(db, limit)
    
    # Build query based on preferences
    query = {"is_available": True}
    
    # Get items from favorite restaurants
    restaurant_items = []
    if prefs["favorite_restaurants"]:
        restaurant_items = await db.menu_items.find({
            "restaurant_id": {"$in": prefs["favorite_restaurants"]},
            "is_available": True,
            "price": {"$gte": prefs["avg_price_range"][0], "$lte": prefs["avg_price_range"][1]}
        }).limit(limit).to_list(limit)
    
    # Get items from favorite categories
    category_items = []
    if prefs["favorite_categories"] and len(restaurant_items) < limit:
        category_items = await db.menu_items.find({
            "category": {"$in": prefs["favorite_categories"]},
            "is_available": True,
            "price": {"$gte": prefs["avg_price_range"][0], "$lte": prefs["avg_price_range"][1]}
        }).limit(limit - len(restaurant_items)).to_list(limit)
    
    # Combine and deduplicate
    items = restaurant_items + category_items
    seen_ids = set()
    unique_items = []
    
    for item in items:
        item_id = str(item["_id"])
        if item_id not in seen_ids:
            seen_ids.add(item_id)
            item["_id"] = item_id
            # Get restaurant name
            if ObjectId.is_valid(item["restaurant_id"]):
                restaurant = await db.restaurants.find_one({"_id": ObjectId(item["restaurant_id"])})
                item["restaurant_name"] = restaurant["name"] if restaurant else "Unknown"
            unique_items.append(item)
    
    return unique_items[:limit]

async def get_popular_items(db, limit: int = 6) -> List[Dict]:
    """Get most popular items across all orders"""
    # Aggregate orders to find most ordered items
    pipeline = [
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.menu_item_id",
            "count": {"$sum": "$items.quantity"},
            "name": {"$first": "$items.name"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": limit}
    ]
    
    popular = await db.orders.aggregate(pipeline).to_list(limit)
    
    # Get full item details
    items = []
    for pop in popular:
        if pop["_id"] and ObjectId.is_valid(pop["_id"]):
            item = await db.menu_items.find_one({"_id": ObjectId(pop["_id"]), "is_available": True})
            if item:
                item["_id"] = str(item["_id"])
                item["order_count"] = pop["count"]
                # Get restaurant name
                if ObjectId.is_valid(item["restaurant_id"]):
                    restaurant = await db.restaurants.find_one({"_id": ObjectId(item["restaurant_id"])})
                    item["restaurant_name"] = restaurant["name"] if restaurant else "Unknown"
                items.append(item)
    
    return items

async def get_similar_items(db, item_id: str, limit: int = 4) -> List[Dict]:
    """Get similar items based on category and price"""
    if not ObjectId.is_valid(item_id):
        return []
    
    item = await db.menu_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        return []
    
    # Find similar items (same category, similar price)
    price = item.get("price", 0)
    price_range = (price * 0.7, price * 1.3)  # ±30% price range
    
    similar = await db.menu_items.find({
        "_id": {"$ne": ObjectId(item_id)},
        "category": item.get("category"),
        "price": {"$gte": price_range[0], "$lte": price_range[1]},
        "is_available": True
    }).limit(limit).to_list(limit)
    
    for s in similar:
        s["_id"] = str(s["_id"])
        # Get restaurant name
        if ObjectId.is_valid(s["restaurant_id"]):
            restaurant = await db.restaurants.find_one({"_id": ObjectId(s["restaurant_id"])})
            s["restaurant_name"] = restaurant["name"] if restaurant else "Unknown"
    
    return similar

async def get_frequently_bought_together(db, item_id: str, limit: int = 3) -> List[Dict]:
    """Get items frequently ordered together with the given item"""
    if not ObjectId.is_valid(item_id):
        return []
    
    # Find orders containing this item
    orders_with_item = await db.orders.find({
        "items.menu_item_id": item_id
    }).to_list(100)
    
    # Count other items in those orders
    item_counts = Counter()
    for order in orders_with_item:
        for item in order.get("items", []):
            other_id = item.get("menu_item_id")
            if other_id != item_id:
                item_counts[other_id] += item.get("quantity", 1)
    
    # Get top items
    top_items = []
    for other_id, count in item_counts.most_common(limit):
        if ObjectId.is_valid(other_id):
            item = await db.menu_items.find_one({"_id": ObjectId(other_id), "is_available": True})
            if item:
                item["_id"] = str(item["_id"])
                item["bought_together_count"] = count
                # Get restaurant name
                if ObjectId.is_valid(item["restaurant_id"]):
                    restaurant = await db.restaurants.find_one({"_id": ObjectId(item["restaurant_id"])})
                    item["restaurant_name"] = restaurant["name"] if restaurant else "Unknown"
                top_items.append(item)
    
    return top_items

async def get_trending_items(db, days: int = 7, limit: int = 6) -> List[Dict]:
    """Get trending items based on recent orders"""
    since_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Aggregate recent orders
    pipeline = [
        {"$match": {"created_at": {"$gte": since_date}}},
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.menu_item_id",
            "count": {"$sum": "$items.quantity"},
            "name": {"$first": "$items.name"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": limit}
    ]
    
    trending = await db.orders.aggregate(pipeline).to_list(limit)
    
    # Get full item details
    items = []
    for trend in trending:
        if trend["_id"] and ObjectId.is_valid(trend["_id"]):
            item = await db.menu_items.find_one({"_id": ObjectId(trend["_id"]), "is_available": True})
            if item:
                item["_id"] = str(item["_id"])
                item["trend_count"] = trend["count"]
                # Get restaurant name
                if ObjectId.is_valid(item["restaurant_id"]):
                    restaurant = await db.restaurants.find_one({"_id": ObjectId(item["restaurant_id"])})
                    item["restaurant_name"] = restaurant["name"] if restaurant else "Unknown"
                items.append(item)
    
    return items

async def get_reorder_suggestions(db, user_id: str, limit: int = 6) -> List[Dict]:
    """Get items user has ordered before for easy reordering"""
    orders = await db.orders.find({"user_id": user_id}).sort("created_at", -1).limit(5).to_list(5)
    
    # Get all items from recent orders
    item_ids = set()
    for order in orders:
        for item in order.get("items", []):
            item_id = item.get("menu_item_id")
            if item_id:
                item_ids.add(item_id)
    
    # Get full item details
    items = []
    for item_id in list(item_ids)[:limit]:
        if ObjectId.is_valid(item_id):
            item = await db.menu_items.find_one({"_id": ObjectId(item_id), "is_available": True})
            if item:
                item["_id"] = str(item["_id"])
                # Get restaurant name
                if ObjectId.is_valid(item["restaurant_id"]):
                    restaurant = await db.restaurants.find_one({"_id": ObjectId(item["restaurant_id"])})
                    item["restaurant_name"] = restaurant["name"] if restaurant else "Unknown"
                items.append(item)
    
    return items
