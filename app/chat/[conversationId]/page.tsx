'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { useSocket } from '@/lib/socket/SocketProvider';
import { useCall } from '@/lib/webrtc/useCall';
import { collection, doc, getDoc, onSnapshot, query, where, orderBy, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Conversation, Message, User, MessageStatus } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { encryptMessage, decryptMessage, setupConversationEncryption } from '@/lib/encryption/messageEncryption';
import toast from 'react-hot-toast';
import MessageItem from '@/components/MessageItem';
import EmojiPicker from 'emoji-picker-react';

export default function ConversationPage() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { startCall } = useCall();
  
  // State
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [remoteUser, setRemoteUser] = useState<User | null>(null);
  const [conversationKey, setConversationKey] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch conversation data
  useEffect(() => {
    if (!user || !conversationId) return;
    
    const fetchConversation = async () => {
      try {
        const conversationDoc = await getDoc(doc(db, 'conversations', conversationId as string));
        
        if (!conversationDoc.exists()) {
          toast.error('Conversation not found');
          return;
        }
        
        const conversationData = { id: conversationDoc.id, ...conversationDoc.data() } as Conversation;
        setConversation(conversationData);
        
        // If it's a direct chat, get the other user's details
        if (!conversationData.isGroup) {
          const otherUserId = conversationData.participants.find(id => id !== user.uid);
          
          if (otherUserId) {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            if (userDoc.exists()) {
              setRemoteUser(userDoc.data() as User);
            }
          }
        }
        
        // Get the conversation key for this user
        const encryptedKey = conversationData.encryptedKeys[user.uid];
        if (encryptedKey) {
          // In a real app, we would decrypt this key using the user's private key
          // For demo purposes, we'll just use it directly (pretending it's decrypted)
          setConversationKey(encryptedKey);
        } else {
          // Key not found, handle this case (usually means setting up a new conversation key pair)
          console.error('Conversation key not found for this user');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching conversation:', error);
        toast.error('Failed to load conversation');
        setIsLoading(false);
      }
    };
    
    fetchConversation();
    
    // Subscribe to changes in the conversation
    const unsubscribe = onSnapshot(
      doc(db, 'conversations', conversationId as string),
      (doc) => {
        if (doc.exists()) {
          const data = { id: doc.id, ...doc.data() } as Conversation;
          setConversation(data);
        }
      }
    );
    
    return () => unsubscribe();
  }, [user, conversationId]);
  
  // Fetch messages
  useEffect(() => {
    if (!user || !conversationId) return;
    
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData: Message[] = [];
      snapshot.forEach((doc) => {
        messagesData.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(messagesData);
      
      // Mark messages as read
      messagesData.forEach(async (message) => {
        if (message.senderId !== user.uid && message.status !== 'read') {
          await updateDoc(doc(db, 'messages', message.id), {
            status: 'read'
          });
          
          // Notify sender that message was read
          if (socket) {
            socket.emit('message_status_update', {
              messageId: message.id,
              status: 'read',
              conversationId,
              userId: user.uid
            });
          }
        }
      });
    });
    
    return () => unsubscribe();
  }, [user, conversationId, socket]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Handle socket events
  useEffect(() => {
    if (!socket || !conversationId) return;
    
    // Listen for typing indicators
    socket.on('user_typing', (data) => {
      if (data.conversationId === conversationId && data.userId !== user?.uid) {
        setIsTyping(true);
        
        // Clear existing timeout
        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }
        
        // Set new timeout
        const timeout = setTimeout(() => {
          setIsTyping(false);
        }, 3000);
        
        setTypingTimeout(timeout);
      }
    });
    
    return () => {
      socket.off('user_typing');
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [socket, conversationId, user?.uid, typingTimeout]);
  
  // Send a typing indicator
  const sendTypingIndicator = () => {
    if (socket && conversationId) {
      socket.emit('user_typing', {
        conversationId,
        userId: user?.uid
      });
    }
  };
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    sendTypingIndicator();
  };
  
  // Add emoji to input
  const handleEmojiSelect = (emojiData: any) => {
    setMessageInput(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };
  
  // Send message
  const sendMessage = async () => {
    if (!messageInput.trim() || !user || !conversation || !conversationKey) return;
    
    try {
      const messageId = uuidv4();
      const now = new Date();
      
      // In a real app, we would encrypt the message content with the conversation key
      // For demo purposes, we'll simulate encryption
      const encryptedContent = messageInput; // Simulated encryption
      const iv = 'simulated-iv'; // Simulated IV
      
      // Create message object
      const messageData: Message = {
        id: messageId,
        conversationId: conversationId as string,
        senderId: user.uid,
        encryptedContent,
        iv,
        timestamp: now,
        status: 'sending',
        messageType: 'text'
      };
      
      // Add to Firestore
      await addDoc(collection(db, 'messages'), messageData);
      
      // Update conversation's last message
      await updateDoc(doc(db, 'conversations', conversationId as string), {
        lastMessage: {
          senderId: user.uid,
          preview: messageInput.substring(0, 50) + (messageInput.length > 50 ? '...' : ''),
          timestamp: now,
          status: 'sent'
        },
        updatedAt: serverTimestamp()
      });
      
      // Notify recipients via socket
      if (socket) {
        socket.emit('new_message', {
          message: messageData,
          conversationId,
          sender: user.uid,
          recipients: conversation.participants.filter(id => id !== user.uid)
        });
      }
      
      // Clear input
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };
  
  // Start a call
  const handleStartCall = (callType: 'audio' | 'video') => {
    if (!remoteUser || !conversationId) return;
    
    startCall(remoteUser.uid, callType);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">Conversation not found</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {conversation.isGroup ? (
            <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 font-medium">
              {conversation.name?.charAt(0).toUpperCase() || 'G'}
            </div>
          ) : remoteUser?.photoURL ? (
            <Image
              src={remoteUser.photoURL}
              alt={remoteUser.displayName}
              width={48}
              height={48}
              className="rounded-full"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 font-medium">
              {remoteUser?.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          
          <div>
            <h2 className="font-medium text-gray-900 dark:text-white">
              {conversation.isGroup
                ? conversation.name
                : remoteUser?.displayName}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isTyping
                ? 'Typing...'
                : conversation.isGroup
                ? `${conversation.participants.length} members`
                : 'Online'}
            </p>
          </div>
        </div>
        
        {!conversation.isGroup && (
          <div className="flex space-x-2">
            <button
              onClick={() => handleStartCall('audio')}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-gray-600 dark:text-gray-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                />
              </svg>
            </button>
            
            <button
              onClick={() => handleStartCall('video')}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-gray-600 dark:text-gray-300"
              >
                <path
                  strokeLinecap="round"
                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </button>
            
            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-gray-600 dark:text-gray-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-dark-900">
        {messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageItem 
                key={message.id} 
                message={message} 
                isOwnMessage={message.senderId === user?.uid}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="p-4 bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-dark-700">
        <div className="flex items-center space-x-2">
          <button
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-gray-600 dark:text-gray-300"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
              />
            </svg>
          </button>
          
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-gray-600 dark:text-gray-300"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
              />
            </svg>
          </button>
          
          <div className="flex-1 relative">
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0">
                <EmojiPicker onEmojiClick={handleEmojiSelect} />
              </div>
            )}
            
            <input
              type="text"
              placeholder="Type a message..."
              className="w-full py-2 px-4 bg-gray-100 dark:bg-dark-700 border-0 rounded-lg focus:ring-1 focus:ring-primary-500"
              value={messageInput}
              onChange={handleInputChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  sendMessage();
                }
              }}
            />
          </div>
          
          <button
            onClick={sendMessage}
            disabled={!messageInput.trim()}
            className="p-2 rounded-full bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 disabled:cursor-not-allowed"
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
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}