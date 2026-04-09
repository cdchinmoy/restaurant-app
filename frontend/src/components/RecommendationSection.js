import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Plus, TrendingUp, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export const RecommendationCard = ({ item, index, onAddToCart, showBadge = null }) => {
  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(item);
    } else {
      // Default add to cart behavior
      const cartItem = {
        menu_item_id: item._id,
        restaurant_id: item.restaurant_id,
        restaurant_name: item.restaurant_name,
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
      toast.success(`${item.name} added to cart`);
      
      // Trigger storage event for cart count update
      window.dispatchEvent(new Event('storage'));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300"
      data-testid={`recommendation-${index}`}
    >
      <div className="relative">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-40 object-cover"
        />
        {showBadge && (
          <div className="absolute top-2 right-2 bg-primary text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
            {showBadge === 'trending' && <TrendingUp className="h-3 w-3" />}
            {showBadge === 'popular' && <Star className="h-3 w-3 fill-current" />}
            <span>{showBadge === 'trending' ? 'Trending' : 'Popular'}</span>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold">
          ${item.price.toFixed(2)}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-heading font-bold text-sm mb-1 line-clamp-1">{item.name}</h3>
        <p className="text-xs text-muted-foreground mb-1">{item.restaurant_name}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {item.description}
        </p>
        <Button
          size="sm"
          onClick={handleAddToCart}
          className="w-full bg-primary hover:bg-primary/90 text-white text-xs"
          data-testid={`add-to-cart-rec-${index}`}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add to Cart
        </Button>
      </div>
    </motion.div>
  );
};

export const RecommendationSection = ({ title, description, items, loading, showBadge = null }) => {
  if (loading) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-heading font-bold mb-6">{title}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border overflow-hidden animate-pulse">
                <div className="h-40 bg-muted"></div>
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-2xl font-heading font-bold mb-1">{title}</h2>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {items.map((item, index) => (
            <RecommendationCard
              key={item._id}
              item={item}
              index={index}
              showBadge={showBadge}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
