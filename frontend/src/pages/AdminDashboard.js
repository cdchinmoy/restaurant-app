import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, DollarSign, Package, Users, ShoppingBag } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    description: '',
    cuisine_type: '',
    image: '',
    delivery_time: '',
    min_order: 0,
  });
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    try {
      const [analyticsRes, restaurantsRes, ordersRes, usersRes, driversRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/admin/analytics`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/admin/restaurants`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/admin/orders`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/admin/users`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/drivers`, { withCredentials: true }),
      ]);
      setAnalytics(analyticsRes.data);
      setRestaurants(restaurantsRes.data);
      setOrders(ordersRes.data);
      setUsers(usersRes.data);
      setDrivers(driversRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleRestaurantFormChange = (field, value) => {
    setRestaurantForm({ ...restaurantForm, [field]: value });
  };

  const resetForm = () => {
    setRestaurantForm({
      name: '',
      description: '',
      cuisine_type: '',
      image: '',
      delivery_time: '',
      min_order: 0,
    });
    setEditingRestaurant(null);
  };

  const handleAddRestaurant = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/admin/restaurants`, restaurantForm, {
        withCredentials: true,
      });
      toast.success('Restaurant added successfully');
      setDialogOpen(false);
      resetForm();
      fetchAllData();
    } catch (error) {
      toast.error('Failed to add restaurant');
    }
  };

  const handleUpdateRestaurant = async () => {
    try {
      await axios.put(
        `${BACKEND_URL}/api/admin/restaurants/${editingRestaurant}`,
        restaurantForm,
        { withCredentials: true }
      );
      toast.success('Restaurant updated successfully');
      setDialogOpen(false);
      resetForm();
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update restaurant');
    }
  };

  const handleDeleteRestaurant = async (id) => {
    if (!window.confirm('Are you sure you want to delete this restaurant?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/admin/restaurants/${id}`, {
        withCredentials: true,
      });
      toast.success('Restaurant deleted successfully');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete restaurant');
    }
  };

  const handleEditRestaurant = (restaurant) => {
    setEditingRestaurant(restaurant._id);
    setRestaurantForm({
      name: restaurant.name,
      description: restaurant.description,
      cuisine_type: restaurant.cuisine_type,
      image: restaurant.image,
      delivery_time: restaurant.delivery_time,
      min_order: restaurant.min_order,
    });
    setDialogOpen(true);
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(
        `${BACKEND_URL}/api/admin/orders/${orderId}?status=${status}`,
        {},
        { withCredentials: true }
      );
      toast.success('Order status updated');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const handleAssignDriver = async (orderId, driverId) => {
    try {
      await axios.post(
        `${BACKEND_URL}/api/orders/${orderId}/assign-driver`,
        { driver_id: driverId },
        { withCredentials: true }
      );
      toast.success('Driver assigned successfully');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to assign driver');
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  const statusColors = {
    pending: 'bg-warning text-white',
    confirmed: 'bg-secondary text-white',
    preparing: 'bg-blue-500 text-white',
    ready: 'bg-green-500 text-white',
    on_the_way: 'bg-purple-500 text-white',
    delivered: 'bg-success text-white',
    cancelled: 'bg-destructive text-white',
  };

  return (
    <div className="min-h-screen">
      <Header cartCount={0} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold tracking-tight mb-2">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Manage your food delivery platform</p>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-card p-6 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <p className="text-2xl font-heading font-bold">
                ${analytics.total_revenue.toFixed(2)}
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-heading font-bold">{analytics.total_orders}</p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total Users</p>
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <p className="text-2xl font-heading font-bold">{analytics.total_users}</p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Restaurants</p>
                <Package className="h-5 w-5 text-warning" />
              </div>
              <p className="text-2xl font-heading font-bold">{analytics.total_restaurants}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="restaurants" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="restaurants" data-testid="restaurants-tab">Restaurants</TabsTrigger>
            <TabsTrigger value="orders" data-testid="orders-tab">Orders</TabsTrigger>
            <TabsTrigger value="users" data-testid="users-tab">Users</TabsTrigger>
          </TabsList>

          {/* Restaurants Tab */}
          <TabsContent value="restaurants" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-heading font-bold">Manage Restaurants</h2>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => resetForm()}
                    className="bg-primary hover:bg-primary/90 text-white"
                    data-testid="add-restaurant-button"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Restaurant
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingRestaurant ? 'Edit Restaurant' : 'Add New Restaurant'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Restaurant Name</Label>
                      <Input
                        value={restaurantForm.name}
                        onChange={(e) => handleRestaurantFormChange('name', e.target.value)}
                        placeholder="Pizza Palace"
                        data-testid="restaurant-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={restaurantForm.description}
                        onChange={(e) =>
                          handleRestaurantFormChange('description', e.target.value)
                        }
                        placeholder="Delicious pizzas..."
                        data-testid="restaurant-description-input"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cuisine Type</Label>
                        <Input
                          value={restaurantForm.cuisine_type}
                          onChange={(e) =>
                            handleRestaurantFormChange('cuisine_type', e.target.value)
                          }
                          placeholder="Italian"
                          data-testid="restaurant-cuisine-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Delivery Time</Label>
                        <Input
                          value={restaurantForm.delivery_time}
                          onChange={(e) =>
                            handleRestaurantFormChange('delivery_time', e.target.value)
                          }
                          placeholder="25-35 min"
                          data-testid="restaurant-delivery-time-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Image URL</Label>
                      <Input
                        value={restaurantForm.image}
                        onChange={(e) => handleRestaurantFormChange('image', e.target.value)}
                        placeholder="https://..."
                        data-testid="restaurant-image-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Minimum Order ($)</Label>
                      <Input
                        type="number"
                        value={restaurantForm.min_order}
                        onChange={(e) =>
                          handleRestaurantFormChange('min_order', parseFloat(e.target.value))
                        }
                        placeholder="15.00"
                        data-testid="restaurant-min-order-input"
                      />
                    </div>
                    <Button
                      onClick={editingRestaurant ? handleUpdateRestaurant : handleAddRestaurant}
                      className="w-full bg-primary hover:bg-primary/90 text-white"
                      data-testid="save-restaurant-button"
                    >
                      {editingRestaurant ? 'Update Restaurant' : 'Add Restaurant'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant, index) => (
                <div
                  key={restaurant._id}
                  className="bg-card rounded-lg border border-border overflow-hidden"
                  data-testid={`admin-restaurant-${index}`}
                >
                  <img
                    src={restaurant.image}
                    alt={restaurant.name}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-heading font-bold mb-1">{restaurant.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {restaurant.description}
                    </p>
                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="text-muted-foreground">{restaurant.cuisine_type}</span>
                      <span className="font-semibold">Min ${restaurant.min_order}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRestaurant(restaurant)}
                        className="flex-1"
                        data-testid={`edit-restaurant-${index}`}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRestaurant(restaurant._id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`delete-restaurant-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <h2 className="text-2xl font-heading font-bold">Manage Orders</h2>
            <div className="space-y-4">
              {orders.map((order, index) => (
                <div
                  key={order._id}
                  className="bg-card p-6 rounded-lg border border-border"
                  data-testid={`admin-order-${index}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-heading font-bold mb-1">
                        {order.restaurant_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {order.user_name} ({order.user_email})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        ${order.total_amount.toFixed(2)}
                      </p>
                      <Badge
                        className={statusColors[order.status] || 'bg-gray-500 text-white'}
                      >
                        {order.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm font-semibold mb-1">Items:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {order.items.map((item, i) => (
                        <li key={i}>
                          {item.quantity}x {item.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Update Status</Label>
                      <Select
                        value={order.status}
                        onValueChange={(status) => handleUpdateOrderStatus(order._id, status)}
                      >
                        <SelectTrigger data-testid={`order-status-select-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="preparing">Preparing</SelectItem>
                          <SelectItem value="ready">Ready</SelectItem>
                          <SelectItem value="on_the_way">On the Way</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Assign Driver</Label>
                      <Select
                        value={order.driver_id || ''}
                        onValueChange={(driverId) => handleAssignDriver(order._id, driverId)}
                      >
                        <SelectTrigger data-testid={`driver-assign-select-${index}`}>
                          <SelectValue placeholder={order.driver_name || 'Select Driver'} />
                        </SelectTrigger>
                        <SelectContent>
                          {drivers.map((driver) => (
                            <SelectItem key={driver._id} value={driver._id}>
                              {driver.name} - {driver.vehicle_info}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <h2 className="text-2xl font-heading font-bold">Users</h2>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 font-heading">Name</th>
                    <th className="text-left p-4 font-heading">Email</th>
                    <th className="text-left p-4 font-heading">Phone</th>
                    <th className="text-left p-4 font-heading">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, index) => (
                    <tr key={u._id} className="border-t border-border" data-testid={`user-row-${index}`}>
                      <td className="p-4">{u.name}</td>
                      <td className="p-4">{u.email}</td>
                      <td className="p-4">{u.phone || 'N/A'}</td>
                      <td className="p-4">
                        <Badge
                          className={
                            u.role === 'admin'
                              ? 'bg-primary text-white'
                              : 'bg-secondary text-white'
                          }
                        >
                          {u.role}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
