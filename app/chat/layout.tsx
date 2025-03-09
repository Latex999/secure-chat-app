'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import Sidebar from '@/components/Sidebar';
import CallOverlay from '@/components/CallOverlay';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect due to the useEffect above
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-dark-900">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
      
      {/* Call overlay for incoming/outgoing calls */}
      <CallOverlay />
    </div>
  );
}