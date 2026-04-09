import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Header } from '../components/Header';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Clock, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  pending: 'bg-warning text-white',
  confirmed: 'bg-secondary text-white',
  preparing: 'bg-blue-500 text-white',
  ready: 'bg-green-500 text-white',
  on_the_way: 'bg-purple-500 text-white',
  delivered: 'bg-success text-white',
  cancelled: 'bg-destructive text-white',
};

export const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const { user } = useAuth();
  const { isConnected, joinOrderRoom, leaveOrderRoom, orderUpdates } = useWebSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
    fetchOrders();
  }, [user]);

  // Join WebSocket rooms for all orders
  useEffect(() => {
    if (orders.length > 0 && isConnected) {
      orders.forEach((order) => {
        const orderId = order._id || order.order_id;
        if (orderId) {
          joinOrderRoom(orderId);
        }
      });

      // Cleanup: leave rooms on unmount
      return () => {
        orders.forEach((order) => {
          const orderId = order._id || order.order_id;
          if (orderId) {
            leaveOrderRoom(orderId);
          }
        });
      };
    }
  }, [orders, isConnected]);

  // Listen for real-time order updates
  useEffect(() => {
    Object.keys(orderUpdates).forEach((orderId) => {
      const update = orderUpdates[orderId];
      
      // Update the orders list
      setOrders((prevOrders) =>
        prevOrders.map((order) => {
          const currentOrderId = order._id || order.order_id;
          if (currentOrderId === orderId) {
            // Show toast notification
            const statusLabel = update.status.replace('_', ' ').toUpperCase();
            toast.success(`Order status updated: ${statusLabel}`, {
              description: `Your order is now ${update.status.replace('_', ' ')}`,
            });
            
            return {
              ...order,
              status: update.status,
              updated_at: update.data.updated_at,
            };
          }
          return order;
        })
      );
    });
  }, [orderUpdates]);

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/orders`, {
        withCredentials: true,
      });
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">My Orders</h1>
              <p className="text-muted-foreground">Track your orders and view history</p>
            </div>
            {/* WebSocket Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Live tracking active' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No orders yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order, index) => (
              <div
                key={index}
                className="bg-card p-6 rounded-2xl border border-border"
                data-testid={`order-${index}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-heading font-bold mb-1">
                      {order.restaurant_name || 'Restaurant'}
                    </h3>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={statusColors[order.status] || 'bg-gray-500 text-white'}>
                      {order.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <p className="text-lg font-bold text-primary mt-2">
                      ${order.total_amount.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold mb-2">Items:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {order.items.map((item, itemIndex) => (
                      <li key={itemIndex}>
                        {item.quantity}x {item.name} - ${(item.price * item.quantity).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>

                {order.delivery_address && (
                  <div className="border-t border-border pt-4 mt-4">
                    <h4 className="font-semibold mb-1 text-sm">Delivery Address:</h4>
                    <p className="text-sm text-muted-foreground">
                      {order.delivery_address.street}, {order.delivery_address.city},{' '}
                      {order.delivery_address.state} {order.delivery_address.zip_code}
                    </p>
                  </div>
                )}

                {/* Track Order Button */}
                {['confirmed', 'preparing', 'ready', 'on_the_way'].includes(order.status) && (
                  <div className="border-t border-border pt-4 mt-4">
                    <Link to={`/track-order/${order._id || index}`}>
                      <Button className="w-full bg-primary hover:bg-primary/90 text-white" data-testid={`track-order-${index}`}>
                        <MapPin className="h-4 w-4 mr-2" />
                        Track Order Live
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
