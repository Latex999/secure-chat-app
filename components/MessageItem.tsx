'use client';

import { useState, useEffect } from 'react';
import { Message } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
}

export default function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  const [decryptedContent, setDecryptedContent] = useState('');

  // In a real app, we would decrypt the message content here
  // For demo purposes, we'll just use the encrypted content directly
  useEffect(() => {
    setDecryptedContent(message.encryptedContent);
  }, [message.encryptedContent]);

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`relative max-w-md ${isOwnMessage ? 'order-1' : 'order-2'}`}>
        <div
          className={
            isOwnMessage
              ? 'message-bubble-outgoing'
              : 'message-bubble-incoming'
          }
        >
          <p className={`text-sm ${isOwnMessage ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>
            {decryptedContent}
          </p>
        </div>
        
        <div className={`flex items-center mt-1 text-xs space-x-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          <span className="text-gray-500 dark:text-gray-400">
            {message.timestamp instanceof Date
              ? formatDistanceToNow(message.timestamp, { addSuffix: true })
              : formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </span>
          
          {isOwnMessage && (
            <span className="ml-2">
              {message.status === 'sending' && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="text-gray-400"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                  <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z" />
                </svg>
              )}
              {message.status === 'sent' && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="text-gray-400"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                  <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z" />
                </svg>
              )}
              {message.status === 'delivered' && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="text-gray-400"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                  <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z" />
                </svg>
              )}
              {message.status === 'read' && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="text-blue-500"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                  <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z" />
                </svg>
              )}
              {message.status === 'failed' && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="text-red-500"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                  <path d="M7.5 7.793V2.5a.5.5 0 0 1 1 0v5.293l4.146-4.147a.5.5 0 0 1 .708.708L9.207 8l4.147 4.146a.5.5 0 0 1-.708.708L8.5 8.207l-4.146 4.147a.5.5 0 0 1-.708-.708L7.793 8 3.646 3.854a.5.5 0 0 1 .708-.708L8.5 7.293z" />
                </svg>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}