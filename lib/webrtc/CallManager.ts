/**
 * WebRTC Call Manager for handling voice and video calls
 */

import SimplePeer from 'simple-peer';
import { Socket } from 'socket.io-client';

type CallType = 'audio' | 'video';

interface PeerConnection {
  peer: SimplePeer.Instance;
  stream: MediaStream;
  userId: string;
}

interface CallOptions {
  socket: Socket;
  userId: string;
  receiverId: string;
  localStream: MediaStream;
  onRemoteStream: (stream: MediaStream) => void;
  onCallEnded: () => void;
  onError: (error: Error) => void;
}

class CallManager {
  private peerConnections: Map<string, PeerConnection> = new Map();
  private socket: Socket | null = null;
  private localStream: MediaStream | null = null;
  private currentCallType: CallType | null = null;
  private userId: string | null = null;

  // Initialize call manager with ice servers
  constructor() {
    this.setupIceServers();
  }

  // Configure ICE servers from environment variables
  private setupIceServers(): RTCIceServer[] {
    try {
      // Parse ICE servers from environment variable
      const iceServers = JSON.parse(process.env.NEXT_PUBLIC_ICE_SERVERS || '[]');
      
      // Add TURN server if configured
      if (process.env.NEXT_PUBLIC_TURN_SERVER_URL) {
        iceServers.push({
          urls: process.env.NEXT_PUBLIC_TURN_SERVER_URL,
          username: process.env.NEXT_PUBLIC_TURN_SERVER_USERNAME,
          credential: process.env.NEXT_PUBLIC_TURN_SERVER_CREDENTIAL,
        });
      }
      
      return iceServers;
    } catch (error) {
      console.error('Error parsing ICE servers:', error);
      // Return default STUN servers
      return [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ];
    }
  }

  // Get user media (audio/video)
  public async getLocalStream(callType: CallType): Promise<MediaStream> {
    try {
      this.currentCallType = callType;
      
      // Request audio or audio+video based on call type
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      
      this.localStream = stream;
      return stream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      throw new Error('Failed to access microphone/camera');
    }
  }

  // Initialize a call
  public async initiateCall(options: CallOptions): Promise<void> {
    try {
      const { socket, userId, receiverId, localStream, onRemoteStream, onCallEnded, onError } = options;
      
      this.socket = socket;
      this.userId = userId;
      this.localStream = localStream;
      
      // Create a new peer connection as initiator
      const peer = new SimplePeer({
        initiator: true,
        stream: localStream,
        trickle: true,
        config: { iceServers: this.setupIceServers() },
      });
      
      // Handle signals
      peer.on('signal', (data) => {
        // Send signal to the receiver via socket
        socket.emit('call_signal', {
          signal: data,
          from: userId,
          to: receiverId,
          type: this.currentCallType,
        });
      });
      
      // Handle remote stream
      peer.on('stream', (stream) => {
        onRemoteStream(stream);
      });
      
      // Handle errors
      peer.on('error', (err) => {
        console.error('Peer connection error:', err);
        onError(err);
        this.endCall(receiverId);
      });
      
      // Handle call end
      peer.on('close', () => {
        console.log('Peer connection closed');
        onCallEnded();
        this.endCall(receiverId);
      });
      
      // Store the peer connection
      this.peerConnections.set(receiverId, {
        peer,
        stream: localStream,
        userId: receiverId,
      });
      
      // Setup socket event listeners
      this.setupSocketEvents(socket, onCallEnded, onRemoteStream, onError);
    } catch (error) {
      console.error('Error initiating call:', error);
      throw new Error('Failed to initiate call');
    }
  }

  // Receive a call
  public async receiveCall(options: CallOptions, incomingSignal: any): Promise<void> {
    try {
      const { socket, userId, receiverId, localStream, onRemoteStream, onCallEnded, onError } = options;
      
      this.socket = socket;
      this.userId = userId;
      this.localStream = localStream;
      
      // Create a new peer connection as receiver
      const peer = new SimplePeer({
        initiator: false,
        stream: localStream,
        trickle: true,
        config: { iceServers: this.setupIceServers() },
      });
      
      // Handle signals
      peer.on('signal', (data) => {
        // Send signal back to the initiator via socket
        socket.emit('call_signal', {
          signal: data,
          from: userId,
          to: receiverId,
          type: this.currentCallType,
        });
      });
      
      // Handle remote stream
      peer.on('stream', (stream) => {
        onRemoteStream(stream);
      });
      
      // Handle errors
      peer.on('error', (err) => {
        console.error('Peer connection error:', err);
        onError(err);
        this.endCall(receiverId);
      });
      
      // Handle call end
      peer.on('close', () => {
        console.log('Peer connection closed');
        onCallEnded();
        this.endCall(receiverId);
      });
      
      // Signal the incoming data
      peer.signal(incomingSignal);
      
      // Store the peer connection
      this.peerConnections.set(receiverId, {
        peer,
        stream: localStream,
        userId: receiverId,
      });
      
      // Setup socket event listeners
      this.setupSocketEvents(socket, onCallEnded, onRemoteStream, onError);
    } catch (error) {
      console.error('Error receiving call:', error);
      throw new Error('Failed to receive call');
    }
  }

  // Setup socket events
  private setupSocketEvents(
    socket: Socket,
    onCallEnded: () => void,
    onRemoteStream: (stream: MediaStream) => void,
    onError: (error: Error) => void
  ): void {
    // Handle incoming signals
    socket.on('call_signal', (data) => {
      if (data.to === this.userId) {
        const peerConnection = this.peerConnections.get(data.from);
        if (peerConnection) {
          peerConnection.peer.signal(data.signal);
        }
      }
    });
    
    // Handle call ended
    socket.on('call_ended', (data) => {
      if (data.to === this.userId) {
        const peerConnection = this.peerConnections.get(data.from);
        if (peerConnection) {
          peerConnection.peer.destroy();
          this.peerConnections.delete(data.from);
          onCallEnded();
        }
      }
    });
  }

  // End a call
  public endCall(receiverId: string): void {
    try {
      const peerConnection = this.peerConnections.get(receiverId);
      if (peerConnection) {
        // Stop all tracks in the local stream
        if (this.localStream) {
          this.localStream.getTracks().forEach((track) => {
            track.stop();
          });
          this.localStream = null;
        }
        
        // Destroy the peer connection
        peerConnection.peer.destroy();
        this.peerConnections.delete(receiverId);
        
        // Notify the other party
        if (this.socket) {
          this.socket.emit('call_ended', {
            from: this.userId,
            to: receiverId,
          });
        }
      }
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }

  // Mute/unmute audio
  public toggleAudio(mute: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !mute;
      });
    }
  }

  // Enable/disable video
  public toggleVideo(disable: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !disable;
      });
    }
  }

  // Switch camera (if multiple available)
  public async switchCamera(): Promise<void> {
    try {
      if (this.localStream && this.currentCallType === 'video') {
        // Get all video devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((device) => device.kind === 'videoinput');
        
        if (videoDevices.length <= 1) {
          return; // Only one camera available
        }
        
        // Get current video track
        const currentTrack = this.localStream.getVideoTracks()[0];
        const currentDeviceId = currentTrack.getSettings().deviceId;
        
        // Find next camera
        const currentIndex = videoDevices.findIndex((device) => device.deviceId === currentDeviceId);
        const nextIndex = (currentIndex + 1) % videoDevices.length;
        const nextDeviceId = videoDevices[nextIndex].deviceId;
        
        // Get new stream with next camera
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: nextDeviceId } },
          audio: false,
        });
        
        // Replace track in all peer connections
        const newTrack = newStream.getVideoTracks()[0];
        
        // Stop the current track
        currentTrack.stop();
        
        // Replace track in local stream
        this.localStream.removeTrack(currentTrack);
        this.localStream.addTrack(newTrack);
        
        // Replace track in all peer connections
        this.peerConnections.forEach((connection) => {
          const sender = connection.peer.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(newTrack);
          }
        });
      }
    } catch (error) {
      console.error('Error switching camera:', error);
    }
  }
}

export default CallManager;