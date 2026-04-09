import requests
import sys
import json
from datetime import datetime

class FoodDeliveryAPITester:
    def __init__(self, base_url="https://quick-bites-844.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.tests_run = 0
        self.tests_passed = 0
        self.user_token = None
        self.admin_token = None
        self.test_user_id = None
        self.test_admin_id = None
        self.test_restaurant_id = None
        self.test_order_id = None
        self.test_address_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, cookies=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, cookies=cookies)
            elif method == 'POST':
                response = self.session.post(url, json=data, cookies=cookies)
            elif method == 'PUT':
                response = self.session.put(url, json=data, cookies=cookies)
            elif method == 'DELETE':
                response = self.session.delete(url, cookies=cookies)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        test_email = f"testuser_{datetime.now().strftime('%H%M%S')}@test.com"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "testpass123",
                "name": "Test User",
                "phone": "+1234567890"
            }
        )
        if success:
            self.test_user_id = response.get('_id')
            # Get cookies from session for future requests
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": "user@test.com",
                "password": "user123"
            }
        )
        if success:
            self.test_user_id = response.get('_id')
            return True
        return False

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": "admin@fooddelivery.com",
                "password": "admin123"
            }
        )
        if success:
            self.test_admin_id = response.get('_id')
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_get_restaurants(self):
        """Test getting restaurants list"""
        success, response = self.run_test(
            "Get Restaurants",
            "GET",
            "restaurants",
            200
        )
        if success and response:
            print(f"   Found {len(response)} restaurants")
            if response:
                self.test_restaurant_id = response[0].get('_id') or str(response[0].get('name', 'Burger Palace'))
        return success

    def test_restaurant_filters(self):
        """Test restaurant filtering"""
        # Test cuisine filter
        success1, _ = self.run_test(
            "Filter by Cuisine",
            "GET",
            "restaurants?cuisine=American",
            200
        )
        
        # Test rating filter
        success2, _ = self.run_test(
            "Filter by Rating",
            "GET",
            "restaurants?min_rating=4.0",
            200
        )
        
        # Test search
        success3, _ = self.run_test(
            "Search Restaurants",
            "GET",
            "restaurants?search=Burger",
            200
        )
        
        return success1 and success2 and success3

    def test_restaurant_menu(self):
        """Test getting restaurant menu"""
        if not self.test_restaurant_id:
            print("❌ No restaurant ID available for menu test")
            return False
            
        success, response = self.run_test(
            "Get Restaurant Menu",
            "GET",
            f"restaurants/{self.test_restaurant_id}/menu",
            200
        )
        if success and response:
            print(f"   Found {len(response)} menu items")
        return success

    def test_create_address(self):
        """Test creating user address"""
        success, response = self.run_test(
            "Create Address",
            "POST",
            "addresses",
            200,
            data={
                "label": "Home",
                "street": "123 Test St",
                "city": "Test City",
                "state": "TS",
                "zip_code": "12345"
            }
        )
        if success:
            self.test_address_id = response.get('address_id')
        return success

    def test_get_addresses(self):
        """Test getting user addresses"""
        success, response = self.run_test(
            "Get Addresses",
            "GET",
            "addresses",
            200
        )
        if success and response:
            print(f"   Found {len(response)} addresses")
            if response and not self.test_address_id:
                self.test_address_id = response[0].get('_id')
        return success

    def test_create_order(self):
        """Test creating an order"""
        if not self.test_address_id:
            print("❌ No address ID available for order test")
            return False
            
        success, response = self.run_test(
            "Create Order",
            "POST",
            "orders",
            200,
            data={
                "restaurant_id": self.test_restaurant_id or "Burger Palace",
                "items": [
                    {
                        "menu_item_id": "test_item_1",
                        "name": "Test Burger",
                        "price": 12.99,
                        "quantity": 2
                    }
                ],
                "delivery_address_id": self.test_address_id
            }
        )
        if success:
            self.test_order_id = response.get('order_id')
        return success

    def test_get_orders(self):
        """Test getting user orders"""
        success, response = self.run_test(
            "Get User Orders",
            "GET",
            "orders",
            200
        )
        if success and response:
            print(f"   Found {len(response)} orders")
        return success

    def test_stripe_checkout_session(self):
        """Test creating Stripe checkout session"""
        if not self.test_order_id:
            print("❌ No order ID available for payment test")
            return False
            
        success, response = self.run_test(
            "Create Stripe Checkout Session",
            "POST",
            "payments/checkout/session",
            200,
            data={
                "order_id": self.test_order_id,
                "origin_url": self.base_url
            }
        )
        if success and response:
            print(f"   Checkout URL: {response.get('url', 'N/A')}")
        return success

    def test_admin_analytics(self):
        """Test admin analytics endpoint"""
        success, response = self.run_test(
            "Admin Analytics",
            "GET",
            "admin/analytics",
            200
        )
        if success and response:
            print(f"   Total Orders: {response.get('total_orders', 0)}")
            print(f"   Total Revenue: ${response.get('total_revenue', 0)}")
            print(f"   Total Users: {response.get('total_users', 0)}")
            print(f"   Total Restaurants: {response.get('total_restaurants', 0)}")
        return success

    def test_admin_restaurants(self):
        """Test admin restaurant management"""
        success, response = self.run_test(
            "Admin Get Restaurants",
            "GET",
            "admin/restaurants",
            200
        )
        return success

    def test_admin_orders(self):
        """Test admin order management"""
        success, response = self.run_test(
            "Admin Get Orders",
            "GET",
            "admin/orders",
            200
        )
        if success and response:
            print(f"   Found {len(response)} orders in admin view")
        return success

    def test_logout(self):
        """Test user logout"""
        success, _ = self.run_test(
            "User Logout",
            "POST",
            "auth/logout",
            200
        )
        return success

def main():
    print("🚀 Starting Food Delivery API Tests...")
    tester = FoodDeliveryAPITester()
    
    # Test user authentication flow
    print("\n" + "="*50)
    print("TESTING USER AUTHENTICATION")
    print("="*50)
    
    if not tester.test_user_login():
        print("❌ User login failed, stopping user tests")
        return 1
    
    if not tester.test_get_current_user():
        print("❌ Get current user failed")
    
    # Test restaurant functionality
    print("\n" + "="*50)
    print("TESTING RESTAURANT FUNCTIONALITY")
    print("="*50)
    
    tester.test_get_restaurants()
    tester.test_restaurant_filters()
    tester.test_restaurant_menu()
    
    # Test address management
    print("\n" + "="*50)
    print("TESTING ADDRESS MANAGEMENT")
    print("="*50)
    
    tester.test_get_addresses()
    if not tester.test_address_id:
        tester.test_create_address()
    
    # Test order functionality
    print("\n" + "="*50)
    print("TESTING ORDER FUNCTIONALITY")
    print("="*50)
    
    tester.test_create_order()
    tester.test_get_orders()
    
    # Test payment functionality
    print("\n" + "="*50)
    print("TESTING PAYMENT FUNCTIONALITY")
    print("="*50)
    
    tester.test_stripe_checkout_session()
    
    # Test admin functionality
    print("\n" + "="*50)
    print("TESTING ADMIN FUNCTIONALITY")
    print("="*50)
    
    # Logout user and login as admin
    tester.test_logout()
    
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping admin tests")
    else:
        tester.test_admin_analytics()
        tester.test_admin_restaurants()
        tester.test_admin_orders()
    
    # Print final results
    print("\n" + "="*50)
    print("TEST RESULTS")
    print("="*50)
    print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())