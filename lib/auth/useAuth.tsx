'use client';

import { useContext } from 'react';
import { AuthContext } from './AuthProvider';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const authContext = useContext(AuthContext);

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName
        });
      }

      // Create user document in Firestore
      await setDoc(doc(db, 'users', result.user.uid), {
        email: email,
        displayName: displayName,
        createdAt: new Date(),
        lastSeen: new Date()
      });

      return result;
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Update last seen
      await setDoc(doc(db, 'users', result.user.uid), {
        lastSeen: new Date()
      }, { merge: true });

      return result;
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Create/update user document in Firestore
      await setDoc(doc(db, 'users', result.user.uid), {
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        createdAt: new Date(),
        lastSeen: new Date()
      }, { merge: true });

      return result;
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (authContext.user) {
        // Update last seen
        await setDoc(doc(db, 'users', authContext.user.uid), {
          lastSeen: new Date()
        }, { merge: true });
      }
      
      await firebaseSignOut(auth);
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  return {
    ...authContext,
    signUp,
    signIn,
    signInWithGoogle,
    signOut
  };
};