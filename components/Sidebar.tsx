'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Conversation } from '@/lib/types';

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Fetch conversations from Firestore
  useEffect(() => {
    if (!user) return;

    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
      const conversationsData: Conversation[] = [];
      snapshot.forEach((doc) => {
        conversationsData.push({ id: doc.id, ...doc.data() } as Conversation);
      });
      setConversations(conversationsData);
    });

    return () => unsubscribe();
  }, [user]);

  // Filter conversations based on search term
  const filteredConversations = conversations.filter((conversation) => {
    if (!searchTerm) return true;
    return conversation.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <aside className="w-80 h-full bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center space-x-2">
          {user?.photoURL ? (
            <Image
              src={user.photoURL}
              alt={user.displayName || 'User'}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
              {user?.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <div>
            <h2 className="font-medium text-gray-900 dark:text-white">{user?.displayName}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
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
                d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
              />
            </svg>
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-700 rounded-md shadow-lg z-10 border border-gray-200 dark:border-dark-600">
              <div className="py-1">
                <Link
                  href="/chat/profile"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-600"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/chat/settings"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-600"
                  onClick={() => setMenuOpen(false)}
                >
                  Settings
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleSignOut();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-dark-600"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200 dark:border-dark-700">
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-dark-700 border-0 rounded-lg focus:ring-1 focus:ring-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute left-3 top-2.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-dark-700">
            {filteredConversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/chat/${conversation.id}`}
                className={`block p-4 hover:bg-gray-50 dark:hover:bg-dark-700 ${
                  pathname === `/chat/${conversation.id}`
                    ? 'bg-gray-100 dark:bg-dark-700'
                    : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  {conversation.photoURL ? (
                    <Image
                      src={conversation.photoURL}
                      alt={conversation.name || 'Conversation'}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 font-medium">
                      {conversation.name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {conversation.name || 'Unnamed Chat'}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {conversation.lastMessage?.timestamp
                          ? new Date(conversation.lastMessage.timestamp.toString()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {conversation.lastMessage?.preview || 'No messages yet'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {searchTerm
              ? 'No conversations found'
              : 'No conversations yet. Start chatting!'}
          </div>
        )}
      </div>
      
      {/* New Chat Button */}
      <div className="p-4 border-t border-gray-200 dark:border-dark-700">
        <Link href="/chat/new">
          <button className="w-full flex items-center justify-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg py-2 px-4 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            <span>New Chat</span>
          </button>
        </Link>
      </div>
    </aside>
  );
}