import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Trash2, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

export const Cart = () => {
  const [cart, setCart] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
  };

  const updateQuantity = (index, delta) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;

    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }

    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const removeItem = (index) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    toast.success('Item removed from cart');
  };

  const clearCart = () => {
    setCart([]);
    localStorage.setItem('cart', JSON.stringify([]));
    toast.success('Cart cleared');
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen">
      <Header cartCount={cart.length} />

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">Your Cart</h1>
          <p className="text-muted-foreground">
            {cart.length} item{cart.length !== 1 ? 's' : ''} in your cart
          </p>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-4">Your cart is empty</p>
            <Button
              onClick={() => navigate('/browse')}
              className="bg-primary hover:bg-primary/90 text-white"
              data-testid="browse-restaurants-from-cart"
            >
              Browse Restaurants
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item, index) => (
                <div
                  key={index}
                  className="bg-card p-6 rounded-2xl border border-border"
                  data-testid={`cart-item-${index}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-heading font-bold mb-1">
                        {item.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {item.restaurant_name}
                      </p>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => updateQuantity(index, -1)}
                            data-testid={`decrease-quantity-${index}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="font-semibold w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => updateQuantity(index, 1)}
                            data-testid={`increase-quantity-${index}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`remove-item-${index}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${item.price.toFixed(2)} each
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                onClick={clearCart}
                className="w-full"
                data-testid="clear-cart-button"
              >
                Clear Cart
              </Button>
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
                        ${(getTotal() + 3.99 + getTotal() * 0.1).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleCheckout}
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  data-testid="proceed-to-checkout-button"
                >
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
