import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Star, Clock, DollarSign, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const Home = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    fetchRestaurants();
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
  }, []);

  const fetchRestaurants = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/restaurants`);
      setRestaurants(data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  };

  return (
    <div className="min-h-screen">
      <Header cartCount={cart.length} />

      {/* Hero Section */}
      <section
        className="relative h-[600px] bg-cover bg-center flex items-center"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1768697358705-c1b60333da35?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNTl8MHwxfHNlYXJjaHwyfHxyZXN0YXVyYW50JTIwaW50ZXJpb3IlMjB3YXJtJTIwbGlnaHRpbmd8ZW58MHx8fHwxNzc1NzA3NDU2fDA&ixlib=rb-4.1.0&q=85)',
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl text-white"
          >
            <h1 className="text-5xl lg:text-6xl font-heading font-bold tracking-tight mb-6">
              Delicious Food,
              <br />
              Delivered Fast
            </h1>
            <p className="text-xl mb-8 leading-relaxed">
              Order from the best restaurants in your area and get it delivered to your doorstep
            </p>
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg rounded-2xl"
              data-testid="browse-restaurants-button"
            >
              <Link to="/browse">
                <Search className="mr-2 h-5 w-5" />
                Browse Restaurants
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Featured Restaurants */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-4xl font-heading font-bold tracking-tight mb-2">
              Featured Restaurants
            </h2>
            <p className="text-muted-foreground text-lg">Popular choices near you</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {restaurants.slice(0, 4).map((restaurant, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Link
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
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-2xl"
              data-testid="view-all-restaurants-button"
            >
              <Link to="/browse">View All Restaurants</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-heading font-bold tracking-tight mb-2">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg">Order in 3 simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Choose Restaurant',
                description: 'Browse from hundreds of restaurants and cuisines',
              },
              {
                step: '2',
                title: 'Select Your Food',
                description: 'Add your favorite dishes to cart',
              },
              {
                step: '3',
                title: 'Fast Delivery',
                description: 'Get your order delivered hot and fresh',
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-white text-2xl font-heading font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-heading font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
