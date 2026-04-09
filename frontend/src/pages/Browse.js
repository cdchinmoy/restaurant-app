import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Star, Clock, DollarSign, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const Browse = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [search, setSearch] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [cart, setCart] = useState([]);

  useEffect(() => {
    fetchRestaurants();
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
  }, []);

  useEffect(() => {
    filterRestaurants();
  }, [restaurants, search, cuisineFilter, ratingFilter]);

  const fetchRestaurants = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/restaurants`);
      setRestaurants(data);
      setFilteredRestaurants(data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  };

  const filterRestaurants = () => {
    let filtered = restaurants;

    if (search) {
      filtered = filtered.filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (cuisineFilter !== 'all') {
      filtered = filtered.filter((r) => r.cuisine_type === cuisineFilter);
    }

    if (ratingFilter !== 'all') {
      const minRating = parseFloat(ratingFilter);
      filtered = filtered.filter((r) => r.rating >= minRating);
    }

    setFilteredRestaurants(filtered);
  };

  const cuisines = [...new Set(restaurants.map((r) => r.cuisine_type))];

  return (
    <div className="min-h-screen">
      <Header cartCount={cart.length} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">
            Browse Restaurants
          </h1>
          <p className="text-muted-foreground text-lg">
            Discover delicious food from {restaurants.length} restaurants
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 p-6 bg-card rounded-2xl border border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search restaurants..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="search-input"
                  className="pl-10 border-border focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cuisine Type</label>
              <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
                <SelectTrigger data-testid="cuisine-filter">
                  <SelectValue placeholder="All Cuisines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cuisines</SelectItem>
                  {cuisines.map((cuisine) => (
                    <SelectItem key={cuisine} value={cuisine}>
                      {cuisine}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Minimum Rating</label>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger data-testid="rating-filter">
                  <SelectValue placeholder="Any Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Rating</SelectItem>
                  <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  <SelectItem value="4.0">4.0+ Stars</SelectItem>
                  <SelectItem value="3.5">3.5+ Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mb-4">
          <p className="text-muted-foreground">
            Showing {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredRestaurants.map((restaurant, index) => (
            <Link
              key={index}
              to={`/restaurant/${restaurant.name.toLowerCase().replace(/\s+/g, '-')}`}
              data-testid={`restaurant-card-${index}`}
            >
              <div className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-[0_8px_30px_rgba(26,31,22,0.08)] hover:-translate-y-1 transition-all duration-300">
                <div className="relative h-48">
                  <img
                    src={restaurant.image}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center space-x-1">
                    <Star className="h-4 w-4 text-warning fill-warning" />
                    <span className="text-sm font-semibold">{restaurant.rating}</span>
                  </div>
                  <div className="absolute top-4 left-4 bg-secondary text-white px-3 py-1 rounded-full text-sm font-medium">
                    {restaurant.cuisine_type}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-heading font-bold mb-2">
                    {restaurant.name}
                  </h3>
                  <p className="text-muted-foreground mb-4 line-clamp-2">
                    {restaurant.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      {restaurant.delivery_time}
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <DollarSign className="h-4 w-4 mr-1" />
                      Min ${restaurant.min_order}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredRestaurants.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No restaurants found</p>
          </div>
        )}
      </div>
    </div>
  );
};
