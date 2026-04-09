# Mocked Notification Service for Email and SMS
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Mock SendGrid Email
async def send_email_notification(to_email: str, subject: str, message: str):
    """
    Mocked SendGrid email notification
    In production, integrate with SendGrid API
    """
    logger.info(f"[MOCKED EMAIL] To: {to_email}, Subject: {subject}, Message: {message}")
    return {"status": "mocked", "service": "email", "recipient": to_email}

# Mock Twilio SMS
async def send_sms_notification(to_phone: str, message: str):
    """
    Mocked Twilio SMS notification
    In production, integrate with Twilio API
    """
    logger.info(f"[MOCKED SMS] To: {to_phone}, Message: {message}")
    return {"status": "mocked", "service": "sms", "recipient": to_phone}

# Order Status Notifications
async def notify_order_status_change(order: dict, new_status: str, user_email: str, user_phone: Optional[str] = None):
    """
    Send notifications when order status changes
    """
    status_messages = {
        "confirmed": "Your order has been confirmed! 🎉",
        "preparing": "Your food is being prepared 👨‍🍳",
        "ready": "Your order is ready for pickup/delivery! ✅",
        "on_the_way": "Your order is on the way! 🚗",
        "delivered": "Your order has been delivered. Enjoy! 🍽️",
        "cancelled": "Your order has been cancelled."
    }
    
    message = status_messages.get(new_status, f"Order status updated to: {new_status}")
    subject = f"Order Update - {new_status.replace('_', ' ').title()}"
    
    # Send email
    await send_email_notification(user_email, subject, message)
    
    # Send SMS if phone available
    if user_phone:
        await send_sms_notification(user_phone, message)
    
    return {"email_sent": True, "sms_sent": bool(user_phone)}

# Welcome Email
async def send_welcome_email(user_email: str, user_name: str):
    """
    Send welcome email to new users
    """
    subject = "Welcome to QuickBites! 🍔"
    message = f"Hi {user_name}, Welcome to QuickBites! Start ordering delicious food from the best restaurants."
    
    await send_email_notification(user_email, subject, message)
    return {"email_sent": True}

# Order Confirmation
async def send_order_confirmation(order: dict, user_email: str, user_phone: Optional[str] = None):
    """
    Send order confirmation notification
    """
    subject = f"Order Confirmation - Order Total: ${order['total_amount']:.2f}"
    message = f"Your order has been placed successfully! Order total: ${order['total_amount']:.2f}. We'll notify you when your food is ready."
    
    # Send email
    await send_email_notification(user_email, subject, message)
    
    # Send SMS
    if user_phone:
        sms_message = f"Order confirmed! Total: ${order['total_amount']:.2f}. Track your order in the app."
        await send_sms_notification(user_phone, sms_message)
    
    return {"email_sent": True, "sms_sent": bool(user_phone)}

# Loyalty Points Notification
async def notify_points_earned(user_email: str, points_earned: int, new_balance: int):
    """
    Notify user when they earn loyalty points
    """
    subject = f"You earned {points_earned} points! ⭐"
    message = f"Congratulations! You've earned {points_earned} loyalty points. Your new balance: {new_balance} points."
    
    await send_email_notification(user_email, subject, message)
    return {"email_sent": True}
