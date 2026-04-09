import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Star, Clock, DollarSign, Plus } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const RestaurantDetail = () => {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
    fetchRestaurantData();
  }, [id]);

  const fetchRestaurantData = async () => {
    try {
      const { data: restaurants } = await axios.get(`${BACKEND_URL}/api/restaurants`);
      const foundRestaurant = restaurants.find(
        (r) => r.name.toLowerCase().replace(/\s+/g, '-') === id
      );

      if (foundRestaurant) {
        setRestaurant(foundRestaurant);
        
        const restaurantId = foundRestaurant._id || foundRestaurant.name;
        const { data: menu } = await axios.get(
          `${BACKEND_URL}/api/restaurants/${restaurantId}/menu`
        );
        setMenuItems(menu);

        const { data: reviewsData } = await axios.get(
          `${BACKEND_URL}/api/restaurants/${restaurantId}/reviews`
        );
        setReviews(reviewsData);
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    const cartItem = {
      menu_item_id: item._id || item.name,
      restaurant_id: restaurant._id || restaurant.name,
      restaurant_name: restaurant.name,
      name: item.name,
      price: item.price,
      quantity: 1,
    };

    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingIndex = existingCart.findIndex(
      (ci) => ci.menu_item_id === cartItem.menu_item_id
    );

    if (existingIndex >= 0) {
      existingCart[existingIndex].quantity += 1;
    } else {
      existingCart.push(cartItem);
    }

    localStorage.setItem('cart', JSON.stringify(existingCart));
    setCart(existingCart);
    toast.success(`${item.name} added to cart`);
  };

  const groupedMenuItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

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

  if (!restaurant) {
    return (
      <div className="min-h-screen">
        <Header cartCount={cart.length} />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-heading font-bold">Restaurant not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header cartCount={cart.length} />

      {/* Restaurant Header */}
      <div
        className="relative h-96 bg-cover bg-center"
        style={{ backgroundImage: `url(${restaurant.image})` }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="container mx-auto">
            <h1 className="text-5xl font-heading font-bold tracking-tight mb-4">
              {restaurant.name}
            </h1>
            <div className="flex items-center space-x-6 text-lg">
              <div className="flex items-center">
                <Star className="h-5 w-5 text-warning fill-warning mr-1" />
                <span className="font-semibold">{restaurant.rating}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-1" />
                {restaurant.delivery_time}
              </div>
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 mr-1" />
                Min order ${restaurant.min_order}
              </div>
              <span className="bg-secondary px-3 py-1 rounded-full text-sm">
                {restaurant.cuisine_type}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-heading font-bold tracking-tight mb-2">Menu</h2>
          <p className="text-muted-foreground">{restaurant.description}</p>
        </div>

        <div className="space-y-12">
          {Object.entries(groupedMenuItems).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-2xl font-heading font-bold mb-6">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-card rounded-2xl overflow-hidden border border-border"
                    data-testid={`menu-item-${index}`}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-heading font-bold">{item.name}</h4>
                        <span className="text-lg font-bold text-primary">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-4">
                        {item.description}
                      </p>
                      <Button
                        onClick={() => addToCart(item)}
                        className="w-full bg-primary hover:bg-primary/90 text-white"
                        data-testid={`add-to-cart-${index}`}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="mt-16">
            <h3 className="text-3xl font-heading font-bold tracking-tight mb-6">
              Customer Reviews
            </h3>
            <div className="space-y-4">
              {reviews.slice(0, 5).map((review, index) => (
                <div
                  key={index}
                  className="bg-card p-6 rounded-2xl border border-border"
                >
                  <div className="flex items-center mb-2">
                    <div className="flex items-center mr-4">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? 'text-warning fill-warning'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-semibold">{review.user_name}</span>
                  </div>
                  <p className="text-muted-foreground">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
