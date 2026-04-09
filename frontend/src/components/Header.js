import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingCart, User, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export const Header = ({ cartCount = 0 }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-heading font-bold tracking-tight text-primary">
              QuickBites
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              data-testid="nav-home"
              className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
            >
              Home
            </Link>
            <Link
              to="/browse"
              data-testid="nav-browse"
              className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
            >
              Browse
            </Link>
            {user && (
              <Link
                to="/orders"
                data-testid="nav-orders"
                className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
              >
                My Orders
              </Link>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {user && (
              <Link to="/cart" data-testid="cart-button">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </Link>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="user-menu-trigger">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm font-medium">
                    {user.name}
                  </div>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" data-testid="profile-link" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {user.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" data-testid="admin-dashboard-link" className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout} data-testid="logout-button" className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild data-testid="login-button">
                <Link to="/login">Login</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
