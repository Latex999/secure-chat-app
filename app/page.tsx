'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/chat');
      } else {
        router.push('/auth/login');
      }
    }
  }, [user, loading, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 lg:p-24">
      <div className="relative flex place-items-center">
        <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex flex-col">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-primary-600 mb-6">Secure Chat</h1>
            <p className="text-xl mb-8">Loading your secure environment...</p>
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    </main>
  );
}