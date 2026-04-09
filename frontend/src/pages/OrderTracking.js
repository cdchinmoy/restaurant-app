import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Header } from '../components/Header';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Phone, Clock, MapPin, User, Car } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Custom Icons
const restaurantIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const deliveryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const statusColors = {
  pending: 'bg-warning text-white',
  confirmed: 'bg-secondary text-white',
  preparing: 'bg-blue-500 text-white',
  ready: 'bg-green-500 text-white',
  on_the_way: 'bg-purple-500 text-white',
  delivered: 'bg-success text-white',
  cancelled: 'bg-destructive text-white',
};

export const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isConnected, joinOrderRoom, leaveOrderRoom, orderUpdates } = useWebSocket();
  
  const [order, setOrder] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const mapRef = useRef(null);

  // Default locations (San Francisco area)
  const restaurantLocation = [37.7749, -122.4194];
  const deliveryLocation = [37.7849, -122.4084];

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
    fetchOrderDetails();
  }, [user, orderId]);

  useEffect(() => {
    if (orderId && isConnected) {
      joinOrderRoom(orderId);
      return () => leaveOrderRoom(orderId);
    }
  }, [orderId, isConnected]);

  // Listen for real-time order updates
  useEffect(() => {
    if (orderUpdates[orderId]) {
      const update = orderUpdates[orderId];
      setOrder((prev) => ({
        ...prev,
        status: update.status,
        ...update.data,
      }));
    }
  }, [orderUpdates, orderId]);

  // Poll driver location
  useEffect(() => {
    if (order && order.status === 'on_the_way' && order.driver_id) {
      fetchDriverLocation();
      const interval = setInterval(fetchDriverLocation, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [order]);

  const fetchOrderDetails = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/orders/${orderId}`, {
        withCredentials: true,
      });
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverLocation = async () => {
    try {
      const { data } = await axios.get(
        `${BACKEND_URL}/api/orders/${orderId}/driver-location`,
        { withCredentials: true }
      );
      if (data.driver_assigned) {
        setDriverLocation(data);
      }
    } catch (error) {
      console.error('Error fetching driver location:', error);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header cartCount={cart.length} />
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen">
        <Header cartCount={cart.length} />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-heading font-bold">Order not found</h1>
          <Button onClick={() => navigate('/orders')} className="mt-4">
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  const driverPos = driverLocation?.location
    ? [driverLocation.location.latitude, driverLocation.location.longitude]
    : null;

  return (
    <div className="min-h-screen">
      <Header cartCount={cart.length} />

      <div className="container mx-auto px-4 py-8">
        <Button
          variant="outline"
          onClick={() => navigate('/orders')}
          className="mb-4"
          data-testid="back-to-orders"
        >
          ← Back to Orders
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map View */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="text-xl font-heading font-bold">Live Tracking</h2>
                <div className="flex items-center space-x-2">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`}
                  ></div>
                  <span className="text-sm text-muted-foreground">
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
              </div>

              <div style={{ height: '500px', width: '100%' }}>
                <MapContainer
                  center={restaurantLocation}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  ref={mapRef}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Restaurant Marker */}
                  <Marker position={restaurantLocation} icon={restaurantIcon}>
                    <Popup>
                      <strong>Restaurant</strong>
                      <br />
                      Pickup Location
                    </Popup>
                  </Marker>

                  {/* Delivery Address Marker */}
                  <Marker position={deliveryLocation} icon={deliveryIcon}>
                    <Popup>
                      <strong>Delivery Address</strong>
                      <br />
                      {order.delivery_address?.street}
                    </Popup>
                  </Marker>

                  {/* Driver Marker (if available) */}
                  {driverPos && (
                    <>
                      <Marker position={driverPos} icon={driverIcon}>
                        <Popup>
                          <strong>{driverLocation.driver?.name}</strong>
                          <br />
                          {driverLocation.driver?.vehicle}
                        </Popup>
                      </Marker>

                      {/* Route line */}
                      <Polyline
                        positions={[driverPos, deliveryLocation]}
                        color="#8B5CF6"
                        weight={3}
                        opacity={0.7}
                        dashArray="10, 10"
                      />
                    </>
                  )}
                </MapContainer>
              </div>
            </div>
          </div>

          {/* Order Details Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status Card */}
            <div className="bg-card p-6 rounded-2xl border border-border">
              <h3 className="text-lg font-heading font-bold mb-4">Order Status</h3>
              <Badge className={`${statusColors[order.status]} text-base px-4 py-2`}>
                {order.status.replace('_', ' ').toUpperCase()}
              </Badge>

              <div className="mt-6 space-y-3">
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {order.delivery_address?.street}, {order.delivery_address?.city}
                  </span>
                </div>
              </div>
            </div>

            {/* Driver Info Card */}
            {driverLocation?.driver_assigned && (
              <div className="bg-card p-6 rounded-2xl border border-border">
                <h3 className="text-lg font-heading font-bold mb-4">Your Driver</h3>
                <div className="flex items-start space-x-4">
                  <img
                    src={driverLocation.driver.photo || 'https://via.placeholder.com/60'}
                    alt={driverLocation.driver.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold">{driverLocation.driver.name}</h4>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Car className="h-3 w-3 mr-1" />
                      {driverLocation.driver.vehicle}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <span className="text-warning">★</span>
                      <span className="ml-1">{driverLocation.driver.rating}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => window.open(`tel:${driverLocation.driver.phone}`)}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call Driver
                </Button>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-card p-6 rounded-2xl border border-border">
              <h3 className="text-lg font-heading font-bold mb-4">Order Items</h3>
              <div className="space-y-2">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-semibold">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-4 pt-4">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">${order.total_amount?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* ETA Card */}
            {order.status === 'on_the_way' && (
              <div className="bg-gradient-to-r from-primary to-secondary p-6 rounded-2xl text-white">
                <h3 className="text-lg font-heading font-bold mb-2">Estimated Arrival</h3>
                <p className="text-3xl font-bold">15-20 min</p>
                <p className="text-sm opacity-90 mt-1">Your food is on the way!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
