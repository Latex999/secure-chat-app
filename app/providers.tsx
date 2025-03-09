'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { SocketProvider } from '@/lib/socket/SocketProvider';

// Combine all providers
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SocketProvider>
        {children}
      </SocketProvider>
    </AuthProvider>
  );
}