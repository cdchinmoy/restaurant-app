import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const Checkout = () => {
  const [cart, setCart] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [newAddress, setNewAddress] = useState({
    label: '',
    street: '',
    city: '',
    state: '',
    zip_code: '',
  });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadCart();
    fetchAddresses();
  }, [user]);

  const loadCart = () => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
  };

  const fetchAddresses = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/addresses`, {
        withCredentials: true,
      });
      setAddresses(data);
      if (data.length > 0) {
        const defaultAddr = data.find((a) => a.is_default);
        setSelectedAddress(defaultAddr ? defaultAddr._id : data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const handleAddressChange = (e) => {
    setNewAddress({ ...newAddress, [e.target.name]: e.target.value });
  };

  const addAddress = async () => {
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/addresses`,
        newAddress,
        { withCredentials: true }
      );
      toast.success('Address added successfully');
      await fetchAddresses();
      setSelectedAddress(data.address_id);
      setShowAddressForm(false);
      setNewAddress({ label: '', street: '', city: '', state: '', zip_code: '' });
    } catch (error) {
      toast.error('Failed to add address');
    }
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getFinalTotal = () => {
    const subtotal = getTotal();
    const deliveryFee = 3.99;
    const tax = subtotal * 0.1;
    return subtotal + deliveryFee + tax;
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setProcessing(true);

    try {
      // Group cart items by restaurant
      const restaurantGroups = cart.reduce((acc, item) => {
        const restId = item.restaurant_id;
        if (!acc[restId]) {
          acc[restId] = [];
        }
        acc[restId].push(item);
        return acc;
      }, {});

      // Create order for the first restaurant (simplified for MVP)
      const restaurantId = Object.keys(restaurantGroups)[0];
      const items = restaurantGroups[restaurantId];

      const { data: orderData } = await axios.post(
        `${BACKEND_URL}/api/orders`,
        {
          restaurant_id: restaurantId,
          items: items,
          delivery_address_id: selectedAddress,
        },
        { withCredentials: true }
      );

      // Create checkout session
      const originUrl = window.location.origin;
      const { data: sessionData } = await axios.post(
        `${BACKEND_URL}/api/payments/checkout/session`,
        {
          order_id: orderData.order_id,
          origin_url: originUrl,
        },
        { withCredentials: true }
      );

      // Redirect to Stripe
      if (sessionData.url) {
        window.location.href = sessionData.url;
      } else {
        toast.error('Failed to create payment session');
        setProcessing(false);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
      setProcessing(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Header cartCount={cart.length} />

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Checkout</h1>
          <p className="text-muted-foreground">Complete your order</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Delivery Address */}
            <div className="bg-card p-6 rounded-2xl border border-border">
              <h2 className="text-xl font-heading font-bold mb-4">Delivery Address</h2>

              {addresses.length > 0 && (
                <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
                  {addresses.map((address) => (
                    <div
                      key={address._id}
                      className="flex items-start space-x-3 p-4 border border-border rounded-lg mb-3"
                    >
                      <RadioGroupItem
                        value={address._id}
                        id={address._id}
                        data-testid={`address-option-${address._id}`}
                      />
                      <div className="flex-1">
                        <Label htmlFor={address._id} className="font-semibold cursor-pointer">
                          {address.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {address.street}, {address.city}, {address.state} {address.zip_code}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {!showAddressForm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowAddressForm(true)}
                  className="w-full"
                  data-testid="add-new-address-button"
                >
                  Add New Address
                </Button>
              ) : (
                <div className="space-y-4 mt-4 p-4 border border-border rounded-lg">
                  <div className="space-y-2">
                    <Label>Label (e.g., Home, Work)</Label>
                    <Input
                      name="label"
                      value={newAddress.label}
                      onChange={handleAddressChange}
                      placeholder="Home"
                      data-testid="address-label-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Street Address</Label>
                    <Input
                      name="street"
                      value={newAddress.street}
                      onChange={handleAddressChange}
                      placeholder="123 Main St"
                      data-testid="address-street-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        name="city"
                        value={newAddress.city}
                        onChange={handleAddressChange}
                        placeholder="New York"
                        data-testid="address-city-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        name="state"
                        value={newAddress.state}
                        onChange={handleAddressChange}
                        placeholder="NY"
                        data-testid="address-state-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP Code</Label>
                    <Input
                      name="zip_code"
                      value={newAddress.zip_code}
                      onChange={handleAddressChange}
                      placeholder="10001"
                      data-testid="address-zip-input"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={addAddress} data-testid="save-address-button">
                      Save Address
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddressForm(false)}
                      data-testid="cancel-address-button"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-card p-6 rounded-2xl border border-border">
              <h2 className="text-xl font-heading font-bold mb-4">Order Items</h2>
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity} × ${item.price.toFixed(2)}
                      </p>
                    </div>
                    <p className="font-semibold">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card p-6 rounded-2xl border border-border sticky top-24">
              <h3 className="text-xl font-heading font-bold mb-4">Order Summary</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">${getTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span className="font-semibold">$3.99</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-semibold">${(getTotal() * 0.1).toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between text-lg">
                    <span className="font-heading font-bold">Total</span>
                    <span className="font-heading font-bold text-primary">
                      ${getFinalTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                onClick={handlePlaceOrder}
                disabled={processing || !selectedAddress}
                className="w-full bg-primary hover:bg-primary/90 text-white"
                data-testid="place-order-button"
              >
                {processing ? 'Processing...' : 'Place Order & Pay'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
