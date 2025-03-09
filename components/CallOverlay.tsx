'use client';

import { useEffect, useRef } from 'react';
import { useCall } from '@/lib/webrtc/useCall';
import Image from 'next/image';
import { collection, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useState } from 'react';
import { User } from '@/lib/types';

export default function CallOverlay() {
  const {
    callState,
    isMuted,
    isVideoEnabled,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
  } = useCall();
  
  const [remoteUser, setRemoteUser] = useState<User | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Get remote user details
  useEffect(() => {
    const fetchRemoteUser = async () => {
      if (!callState.remoteUserId) return;
      
      try {
        const userDoc = await getDoc(doc(collection(db, 'users'), callState.remoteUserId));
        if (userDoc.exists()) {
          setRemoteUser(userDoc.data() as User);
        }
      } catch (error) {
        console.error('Error fetching remote user:', error);
      }
    };
    
    fetchRemoteUser();
  }, [callState.remoteUserId]);
  
  // Set up media streams for video elements
  useEffect(() => {
    if (callState.localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = callState.localStream;
    }
    
    if (callState.remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = callState.remoteStream;
    }
  }, [callState.localStream, callState.remoteStream]);
  
  // Don't render anything if no call is happening
  if (!callState.isIncomingCall && !callState.isCallActive) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
      {/* Incoming Call UI */}
      {callState.isIncomingCall && !callState.isCallActive && (
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-md w-full p-6 text-center">
          <div className="mb-6">
            {remoteUser?.photoURL ? (
              <Image
                src={remoteUser.photoURL}
                alt={remoteUser.displayName}
                width={80}
                height={80}
                className="rounded-full mx-auto"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-2xl font-semibold mx-auto">
                {remoteUser?.displayName?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
          
          <h3 className="text-xl font-bold mb-1 dark:text-white">
            {remoteUser?.displayName || 'Unknown User'}
          </h3>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Incoming {callState.callType === 'video' ? 'video' : 'audio'} call...
          </p>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={rejectCall}
              className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            
            <button
              onClick={acceptCall}
              className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center"
            >
              {callState.callType === 'video' ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-white"
                >
                  <path
                    strokeLinecap="round"
                    d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Active Call UI */}
      {callState.isCallActive && (
        <div className="w-full h-full flex flex-col relative">
          {/* Remote Video (Full Screen) */}
          {callState.callType === 'video' && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          
          {/* Audio-Only Call Background */}
          {callState.callType === 'audio' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-primary-900 to-primary-700">
              <div className="text-center">
                {remoteUser?.photoURL ? (
                  <Image
                    src={remoteUser.photoURL}
                    alt={remoteUser.displayName}
                    width={120}
                    height={120}
                    className="rounded-full mx-auto mb-4"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-4xl font-semibold mx-auto mb-4">
                    {remoteUser?.displayName?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <h2 className="text-2xl font-bold text-white mb-2">
                  {remoteUser?.displayName || 'Unknown User'}
                </h2>
                <p className="text-primary-200">
                  Call in progress...
                </p>
              </div>
            </div>
          )}
          
          {/* Local Video (Picture-in-Picture) */}
          {callState.callType === 'video' && (
            <div className="absolute top-4 right-4 w-36 h-48 rounded-lg overflow-hidden border-2 border-white shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Call Controls */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center space-x-4">
            <button
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isMuted ? 'bg-gray-700' : 'bg-gray-600 bg-opacity-80'
              }`}
            >
              {isMuted ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                  />
                </svg>
              )}
            </button>
            
            {callState.callType === 'video' && (
              <button
                onClick={toggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  !isVideoEnabled ? 'bg-gray-700' : 'bg-gray-600 bg-opacity-80'
                }`}
              >
                {!isVideoEnabled ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6 text-white"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6 text-white"
                  >
                    <path
                      strokeLinecap="round"
                      d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                )}
              </button>
            )}
            
            {callState.callType === 'video' && (
              <button
                onClick={switchCamera}
                className="w-12 h-12 rounded-full bg-gray-600 bg-opacity-80 flex items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              </button>
            )}
            
            <button
              onClick={endCall}
              className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}