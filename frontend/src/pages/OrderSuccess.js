import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (sessionId) {
      pollPaymentStatus(sessionId, 0);
    }
  }, [sessionId, user]);

  const pollPaymentStatus = async (sessionId, attempts) => {
    const maxAttempts = 5;

    if (attempts >= maxAttempts) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.get(
        `${BACKEND_URL}/api/payments/checkout/status/${sessionId}`,
        { withCredentials: true }
      );

      setPaymentStatus(data);

      if (data.payment_status === 'paid') {
        // Clear cart
        localStorage.setItem('cart', JSON.stringify([]));
        setLoading(false);
      } else if (data.status === 'expired') {
        setLoading(false);
      } else {
        setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Header cartCount={0} />

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {loading ? (
            <div>
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-6" />
              <h1 className="text-3xl font-heading font-bold mb-4">Processing Payment...</h1>
              <p className="text-muted-foreground">
                Please wait while we confirm your payment
              </p>
            </div>
          ) : paymentStatus?.payment_status === 'paid' ? (
            <div>
              <CheckCircle className="h-16 w-16 text-success mx-auto mb-6" />
              <h1 className="text-4xl font-heading font-bold tracking-tight mb-4">
                Order Placed Successfully!
              </h1>
              <p className="text-muted-foreground text-lg mb-8">
                Thank you for your order. Your food will be delivered soon.
              </p>
              <div className="space-x-4">
                <Button
                  onClick={() => navigate('/orders')}
                  className="bg-primary hover:bg-primary/90 text-white"
                  data-testid="view-orders-button"
                >
                  View My Orders
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  data-testid="continue-shopping-button"
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-heading font-bold mb-4">Payment Status Unknown</h1>
              <p className="text-muted-foreground mb-6">
                We're having trouble verifying your payment. Please check your orders or contact
                support.
              </p>
              <Button onClick={() => navigate('/orders')} data-testid="check-orders-button">
                Check Orders
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
