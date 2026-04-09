import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const Profile = () => {
  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState({
    label: '',
    street: '',
    city: '',
    state: '',
    zip_code: '',
  });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [cart, setCart] = useState([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
    fetchAddresses();
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/addresses`, {
        withCredentials: true,
      });
      setAddresses(data);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const handleAddressChange = (e) => {
    setNewAddress({ ...newAddress, [e.target.name]: e.target.value });
  };

  const addAddress = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/addresses`, newAddress, {
        withCredentials: true,
      });
      toast.success('Address added successfully');
      await fetchAddresses();
      setShowAddressForm(false);
      setNewAddress({ label: '', street: '', city: '', state: '', zip_code: '' });
    } catch (error) {
      toast.error('Failed to add address');
    }
  };

  const deleteAddress = async (addressId) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/addresses/${addressId}`, {
        withCredentials: true,
      });
      toast.success('Address deleted successfully');
      await fetchAddresses();
    } catch (error) {
      toast.error('Failed to delete address');
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
          <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">My Profile</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <div className="bg-card p-6 rounded-2xl border border-border">
              <h2 className="text-xl font-heading font-bold mb-4">Account Info</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-semibold">{user.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-semibold">{user.email}</p>
                </div>
                {user.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-semibold">{user.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-semibold capitalize">{user.role}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Saved Addresses */}
          <div className="lg:col-span-2">
            <div className="bg-card p-6 rounded-2xl border border-border">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-heading font-bold">Saved Addresses</h2>
                {!showAddressForm && (
                  <Button
                    onClick={() => setShowAddressForm(true)}
                    data-testid="add-address-button"
                  >
                    Add New
                  </Button>
                )}
              </div>

              {showAddressForm && (
                <div className="mb-6 p-4 border border-border rounded-lg space-y-4">
                  <div className="space-y-2">
                    <Label>Label (e.g., Home, Work)</Label>
                    <Input
                      name="label"
                      value={newAddress.label}
                      onChange={handleAddressChange}
                      placeholder="Home"
                      data-testid="profile-address-label"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Street Address</Label>
                    <Input
                      name="street"
                      value={newAddress.street}
                      onChange={handleAddressChange}
                      placeholder="123 Main St"
                      data-testid="profile-address-street"
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
                        data-testid="profile-address-city"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        name="state"
                        value={newAddress.state}
                        onChange={handleAddressChange}
                        placeholder="NY"
                        data-testid="profile-address-state"
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
                      data-testid="profile-address-zip"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={addAddress} data-testid="save-profile-address-button">
                      Save Address
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddressForm(false)}
                      data-testid="cancel-profile-address-button"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {addresses.length === 0 ? (
                  <p className="text-muted-foreground">No saved addresses</p>
                ) : (
                  addresses.map((address, index) => (
                    <div
                      key={address._id}
                      className="flex justify-between items-start p-4 border border-border rounded-lg"
                      data-testid={`saved-address-${index}`}
                    >
                      <div>
                        <p className="font-semibold">{address.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {address.street}, {address.city}, {address.state} {address.zip_code}
                        </p>
                        {address.is_default && (
                          <span className="text-xs bg-primary text-white px-2 py-1 rounded mt-1 inline-block">
                            Default
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAddress(address._id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`delete-address-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
