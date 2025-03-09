'use client';

import React, { createContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { generateKeyPair } from '@/lib/encryption/keyGeneration';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      
      if (authUser) {
        // Check if user has encryption keys
        const userDocRef = doc(db, 'users', authUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists() || !userDoc.data()?.publicKey) {
          // User doesn't have keys, generate them
          const { publicKey, privateKey } = await generateKeyPair();
          
          // Store public key in Firestore
          await setDoc(userDocRef, {
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
            publicKey: publicKey,
            createdAt: new Date(),
            lastSeen: new Date(),
          }, { merge: true });
          
          // Store private key securely in local storage
          localStorage.setItem(`privateKey_${authUser.uid}`, privateKey);
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};