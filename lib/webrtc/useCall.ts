'use client';

import { useEffect, useState, useRef } from 'react';
import { useSocket } from '@/lib/socket/SocketProvider';
import { useAuth } from '@/lib/auth/useAuth';
import CallManager from './CallManager';
import toast from 'react-hot-toast';

type CallType = 'audio' | 'video';

interface CallState {
  isIncomingCall: boolean;
  isCallActive: boolean;
  callType: CallType | null;
  remoteUserId: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

const initialCallState: CallState = {
  isIncomingCall: false,
  isCallActive: false,
  callType: null,
  remoteUserId: null,
  localStream: null,
  remoteStream: null,
};

export const useCall = () => {
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>(initialCallState);
  const callManagerRef = useRef<CallManager | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  
  // Initialize call manager
  useEffect(() => {
    callManagerRef.current = new CallManager();
    
    return () => {
      // Clean up on unmount
      if (callState.isCallActive && callState.remoteUserId) {
        callManagerRef.current?.endCall(callState.remoteUserId);
      }
    };
  }, []);
  
  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !connected || !user) return;
    
    // Handle incoming call request
    const handleCallRequest = async (data: any) => {
      if (data.to === user.uid) {
        // Update call state for incoming call
        setCallState({
          isIncomingCall: true,
          isCallActive: false,
          callType: data.type,
          remoteUserId: data.from,
          localStream: null,
          remoteStream: null,
        });
        
        // Play ringtone or notification
        // ...
      }
    };
    
    // Handle call signals
    const handleCallSignal = (data: any) => {
      if (data.to === user.uid) {
        // The signal will be processed by the CallManager
        // when the call is accepted
      }
    };
    
    // Handle call ended
    const handleCallEnded = (data: any) => {
      if (data.to === user.uid) {
        endCall();
      }
    };
    
    // Register event listeners
    socket.on('call_request', handleCallRequest);
    socket.on('call_signal', handleCallSignal);
    socket.on('call_ended', handleCallEnded);
    
    return () => {
      // Clean up event listeners
      socket.off('call_request', handleCallRequest);
      socket.off('call_signal', handleCallSignal);
      socket.off('call_ended', handleCallEnded);
    };
  }, [socket, connected, user]);
  
  // Start a call
  const startCall = async (receiverId: string, callType: CallType) => {
    try {
      if (!socket || !connected || !user) {
        toast.error('Not connected to server');
        return;
      }
      
      // Get local media stream
      const localStream = await callManagerRef.current?.getLocalStream(callType);
      
      if (!localStream) {
        throw new Error('Failed to get local stream');
      }
      
      // Update call state
      setCallState({
        isIncomingCall: false,
        isCallActive: false,  // Will be set to true when connected
        callType,
        remoteUserId: receiverId,
        localStream,
        remoteStream: null,
      });
      
      // Send call request to receiver
      socket.emit('call_request', {
        from: user.uid,
        to: receiverId,
        type: callType,
      });
      
      // Wait for the call to be accepted
      // The actual connection will be established when the receiver accepts
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
      resetCallState();
    }
  };
  
  // Accept an incoming call
  const acceptCall = async () => {
    try {
      if (!socket || !connected || !user || !callState.isIncomingCall || !callState.remoteUserId || !callState.callType) {
        toast.error('Cannot accept call');
        return;
      }
      
      // Get local media stream
      const localStream = await callManagerRef.current?.getLocalStream(callState.callType);
      
      if (!localStream) {
        throw new Error('Failed to get local stream');
      }
      
      // Update the call state with local stream
      setCallState((prev) => ({
        ...prev,
        localStream,
      }));
      
      // Notify the caller that the call is accepted
      socket.emit('call_accepted', {
        from: user.uid,
        to: callState.remoteUserId,
      });
      
      // Establish the peer connection
      // This will be handled in the onCallSignal event
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call');
      resetCallState();
    }
  };
  
  // Reject an incoming call
  const rejectCall = () => {
    if (!socket || !connected || !user || !callState.remoteUserId) {
      resetCallState();
      return;
    }
    
    // Notify the caller that the call is rejected
    socket.emit('call_rejected', {
      from: user.uid,
      to: callState.remoteUserId,
    });
    
    // Reset call state
    resetCallState();
  };
  
  // End an active call
  const endCall = () => {
    try {
      if (callState.remoteUserId) {
        callManagerRef.current?.endCall(callState.remoteUserId);
      }
      resetCallState();
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };
  
  // Toggle mute/unmute
  const toggleMute = () => {
    if (!callManagerRef.current) return;
    
    const newMuteState = !isMuted;
    callManagerRef.current.toggleAudio(newMuteState);
    setIsMuted(newMuteState);
  };
  
  // Toggle video on/off
  const toggleVideo = () => {
    if (!callManagerRef.current || callState.callType !== 'video') return;
    
    const newVideoState = !isVideoEnabled;
    callManagerRef.current.toggleVideo(!newVideoState);
    setIsVideoEnabled(newVideoState);
  };
  
  // Switch camera (if multiple cameras available)
  const switchCamera = async () => {
    if (!callManagerRef.current || callState.callType !== 'video') return;
    
    try {
      await callManagerRef.current.switchCamera();
    } catch (error) {
      console.error('Error switching camera:', error);
      toast.error('Failed to switch camera');
    }
  };
  
  // Reset call state
  const resetCallState = () => {
    // Stop local stream tracks
    if (callState.localStream) {
      callState.localStream.getTracks().forEach((track) => {
        track.stop();
      });
    }
    
    setCallState(initialCallState);
    setIsMuted(false);
    setIsVideoEnabled(true);
  };
  
  return {
    callState,
    isMuted,
    isVideoEnabled,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
  };
};