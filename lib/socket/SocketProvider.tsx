'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth/useAuth';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // For development, we're simulating a socket connection
    // In production, you'd connect to your socket server
    const socketInstance = io('https://your-socketio-server.com', {
      auth: {
        token: user.uid,
      },
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('Socket connected');
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
      console.log('Socket disconnected');
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error('Connection error. Please refresh the page.');
    });

    // Listen for incoming messages
    socketInstance.on('new_message', (data) => {
      // This will be handled by the chat context
      console.log('New message received via socket', data);
    });

    // Listen for message status updates
    socketInstance.on('message_status_update', (data) => {
      console.log('Message status update', data);
    });

    // Listen for call requests
    socketInstance.on('call_request', (data) => {
      console.log('Call request', data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};