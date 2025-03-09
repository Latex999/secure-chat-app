// User model
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  publicKey: string;
  createdAt: Date;
  lastSeen: Date;
  status?: 'online' | 'offline' | 'away';
}

// Message status types
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

// Message model for encrypted messages
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  encryptedContent: string;
  iv: string; // Initialization vector for decryption
  timestamp: Date;
  status: MessageStatus;
  messageType: 'text' | 'image' | 'file' | 'audio' | 'location';
  replyTo?: string; // ID of message being replied to
  attachmentUrl?: string; // URL for media or file attachments
  attachmentThumbnail?: string; // Thumbnail for media attachments
  attachmentMetadata?: {
    name?: string;
    size?: number;
    type?: string;
    duration?: number; // For audio/video
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

// Conversation model for 1:1 and group chats
export interface Conversation {
  id: string;
  name?: string; // For group conversations
  photoURL?: string; // For group conversations
  participants: string[]; // User IDs
  lastMessage?: {
    senderId: string;
    preview: string; // Encrypted preview
    timestamp: Date;
    status: MessageStatus;
  };
  createdAt: Date;
  updatedAt: Date;
  encryptedKeys: {
    [userId: string]: string; // Map of user IDs to their encrypted conversation keys
  };
  isGroup: boolean;
  groupAdmin?: string; // User ID of group admin (if group)
  typingUsers?: string[]; // IDs of users currently typing
}

// Contact model
export interface Contact {
  uid: string; // User ID
  displayName: string;
  email: string;
  photoURL?: string;
  publicKey: string;
  addedAt: Date;
  conversationId?: string; // ID of conversation with this contact
}

// Call record model
export interface CallRecord {
  id: string;
  participants: string[]; // User IDs
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  callType: 'audio' | 'video';
  initiator: string; // User ID
  status: 'missed' | 'declined' | 'completed';
}

// Notification model
export interface Notification {
  id: string;
  userId: string; // Recipient
  type: 'message' | 'call' | 'contact_request' | 'group_invite';
  senderId?: string;
  conversationId?: string;
  messageId?: string;
  callId?: string;
  read: boolean;
  title: string;
  body: string;
  timestamp: Date;
  data?: any; // Additional data
}