import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const WebSocketContext = createContext(null);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const SOCKET_PATH = '/api/socket.io';

export const WebSocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [orderUpdates, setOrderUpdates] = useState({});

  useEffect(() => {
    // Initialize Socket.IO connection
    socketRef.current = io(BACKEND_URL, {
      path: SOCKET_PATH,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // Connection event handlers
    socketRef.current.on('connect', () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
    });

    socketRef.current.on('connection_status', (data) => {
      console.log('Connection status:', data);
    });

    socketRef.current.on('room_joined', (data) => {
      console.log('Joined room for order:', data.order_id);
    });

    // Handle order updates
    socketRef.current.on('order_update', (data) => {
      console.log('📦 Order update received:', data);
      setOrderUpdates((prev) => ({
        ...prev,
        [data.order_id]: {
          status: data.status,
          data: data.data,
          timestamp: new Date().toISOString(),
        },
      }));
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const joinOrderRoom = (orderId) => {
    if (socketRef.current?.connected && orderId) {
      socketRef.current.emit('join_order_room', { order_id: orderId });
      console.log(`Joining order room: ${orderId}`);
    } else {
      console.warn('Cannot join room: Socket not connected or missing orderId');
    }
  };

  const leaveOrderRoom = (orderId) => {
    if (socketRef.current?.connected && orderId) {
      socketRef.current.emit('leave_order_room', { order_id: orderId });
      console.log(`Leaving order room: ${orderId}`);
    }
  };

  const getOrderUpdate = (orderId) => {
    return orderUpdates[orderId] || null;
  };

  const clearOrderUpdate = (orderId) => {
    setOrderUpdates((prev) => {
      const updated = { ...prev };
      delete updated[orderId];
      return updated;
    });
  };

  return (
    <WebSocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        joinOrderRoom,
        leaveOrderRoom,
        getOrderUpdate,
        clearOrderUpdate,
        orderUpdates,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
