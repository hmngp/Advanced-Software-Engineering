import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaSearch, FaCircle, FaEllipsisV } from 'react-icons/fa';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import axios from 'axios';

interface Message {
  id: number;
  bookingId?: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  isRead: boolean;
  sender?: {
    id: number;
    name: string;
    profileImage: string | null;
  };
}

interface Booking {
  id: number;
  customer: {
    id: number;
    name: string;
    email: string;
    profileImage: string | null;
  };
  provider: {
    id: number;
    name: string;
    profileImage?: string | null;
  };
  service: {
    name: string;
  };
  bookingDate: string;
  status: string;
}

interface Conversation {
  booking: Booking;
  messages: Message[];
  unreadCount: number;
  lastMessage?: Message;
}

const MessagesRealtime: React.FC = () => {
  const { user } = useAuth();
  const { socket, isConnected, onlineUsers } = useSocket();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch conversations
  useEffect(() => {
    fetchConversations();
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Fetch all bookings for this provider
      const response = await axios.get(`/api/bookings/user/${user.id}?role=PROVIDER`);
      const bookings: Booking[] = response.data.bookings || [];

      // Fetch messages for each booking
      const conversationsData = await Promise.all(
        bookings.map(async (booking) => {
          try {
            const messagesResponse = await axios.get(`/api/messages/booking/${booking.id}`);
            const messages: Message[] = messagesResponse.data.messages || [];
            
            const unreadCount = messages.filter(
              (m) => m.receiverId === user.id && !m.isRead
            ).length;

            return {
              booking,
              messages,
              unreadCount,
              lastMessage: messages[messages.length - 1],
            };
          } catch {
            return {
              booking,
              messages: [],
              unreadCount: 0,
            };
          }
        })
      );

      // Filter out conversations with no messages and sort by last message time
      const validConversations = conversationsData
        .filter((conv) => conv.messages.length > 0)
        .sort((a, b) => {
          const timeA = a.lastMessage?.createdAt || '0';
          const timeB = b.lastMessage?.createdAt || '0';
          return new Date(timeB).getTime() - new Date(timeA).getTime();
        });

      setConversations(validConversations);

      // Auto-select first conversation if none selected
      if (!selectedBookingId && validConversations.length > 0) {
        setSelectedBookingId(validConversations[0].booking.id);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Join booking room when conversation is selected
  useEffect(() => {
    if (socket && selectedBookingId) {
      socket.emit('join_room', selectedBookingId);
      console.log(`Joined room: booking_${selectedBookingId}`);
      
      // Mark all messages as read
      socket.emit('mark_all_as_read', {
        bookingId: selectedBookingId,
        userId: user?.id,
      });
    }
  }, [socket, selectedBookingId, user]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Receive new message
    const handleReceiveMessage = (message: Message) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.booking.id === message.bookingId) {
            const updatedMessages = [...conv.messages, message];
            return {
              ...conv,
              messages: updatedMessages,
              lastMessage: message,
              unreadCount:
                message.receiverId === user?.id && conv.booking.id !== selectedBookingId
                  ? conv.unreadCount + 1
                  : conv.unreadCount,
            };
          }
          return conv;
        })
      );

      // Auto-mark as read if this conversation is open
      if (message.bookingId === selectedBookingId && message.receiverId === user?.id) {
        socket.emit('mark_as_read', {
          messageId: message.id,
          bookingId: message.bookingId,
        });
      }
    };

    // Handle typing indicator
    const handleUserTyping = (data: { userId: number; userName: string }) => {
      setTypingUsers((prev) => new Map(prev).set(data.userId, data.userName));
    };

    const handleUserStopTyping = (data: { userId: number }) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });
    };

    // Handle messages read
    const handleMessagesRead = (data: { bookingId: number; userId: number }) => {
      if (data.userId !== user?.id) {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.booking.id === data.bookingId
              ? {
                  ...conv,
                  messages: conv.messages.map((m) =>
                    m.senderId === user?.id ? { ...m, isRead: true } : m
                  ),
                }
              : conv
          )
        );
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, selectedBookingId, user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, selectedBookingId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedBookingId || !socket || !user) return;

    const currentConv = conversations.find((c) => c.booking.id === selectedBookingId);
    if (!currentConv) return;

    const receiverId =
      currentConv.booking.customer.id === user.id
        ? currentConv.booking.provider.id
        : currentConv.booking.customer.id;

    // Send via socket
    socket.emit('send_message', {
      bookingId: selectedBookingId,
      senderId: user.id,
      receiverId,
      content: newMessage,
    });

    // Stop typing
    socket.emit('stop_typing', { bookingId: selectedBookingId, userId: user.id });

    setNewMessage('');
  };

  const handleTyping = () => {
    if (!socket || !selectedBookingId || !user) return;

    // Emit typing event
    socket.emit('typing', {
      bookingId: selectedBookingId,
      userId: user.id,
      userName: user.name,
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { bookingId: selectedBookingId, userId: user.id });
    }, 2000);
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.booking.customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentConversation = conversations.find((c) => c.booking.id === selectedBookingId);
  const otherUser = currentConversation
    ? currentConversation.booking.customer.id === user?.id
      ? currentConversation.booking.provider
      : currentConversation.booking.customer
    : null;

  const isOtherUserOnline = otherUser ? onlineUsers.includes(otherUser.id) : false;
  const isTyping = currentConversation
    ? Array.from(typingUsers.entries()).find(
        ([userId]) => userId !== user?.id && typingUsers.has(userId)
      )
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div
          className="bg-white rounded-lg shadow-md overflow-hidden"
          style={{ height: 'calc(100vh - 180px)' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 h-full">
            {/* Conversations List */}
            <div className="border-r border-gray-200 flex flex-col">
              {/* Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Conversation Items */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No conversations yet
                  </div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const customer = conversation.booking.customer;
                    const isOnline = onlineUsers.includes(customer.id);

                    return (
                      <div
                        key={conversation.booking.id}
                        onClick={() => {
                          setSelectedBookingId(conversation.booking.id);
                          // Mark as read
                          setConversations((prev) =>
                            prev.map((c) =>
                              c.booking.id === conversation.booking.id
                                ? { ...c, unreadCount: 0 }
                                : c
                            )
                          );
                        }}
                        className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedBookingId === conversation.booking.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="relative">
                            <img
                              src={
                                customer.profileImage ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  customer.name
                                )}&background=4F46E5&color=fff`
                              }
                              alt={customer.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            {isOnline && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {customer.name}
                              </h3>
                              {conversation.lastMessage && (
                                <span className="text-xs text-gray-500">
                                  {format(
                                    new Date(conversation.lastMessage.createdAt),
                                    'MMM d, h:mm a'
                                  )}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mb-1">
                              {conversation.booking.service.name}
                            </p>
                            <div className="flex justify-between items-center">
                              <p className="text-sm text-gray-600 truncate">
                                {conversation.lastMessage?.content || 'No messages yet'}
                              </p>
                              {conversation.unreadCount > 0 && (
                                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full ml-2">
                                  {conversation.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Message Thread */}
            <div className="md:col-span-2 flex flex-col">
              {currentConversation && otherUser ? (
                <>
                  {/* Header */}
                  <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <img
                            src={
                              otherUser.profileImage ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                otherUser.name
                              )}&background=4F46E5&color=fff`
                            }
                            alt={otherUser.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          {isOtherUserOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{otherUser.name}</h3>
                          <div
                            className={`flex items-center text-sm ${
                              isOtherUserOnline ? 'text-green-600' : 'text-gray-500'
                            }`}
                          >
                            <FaCircle size={8} className="mr-1" />
                            {isOtherUserOnline ? 'Online' : 'Offline'}
                          </div>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <FaEllipsisV />
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {currentConversation.messages.map((message) => {
                      const isOwn = message.senderId === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              isOwn
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}
                          >
                            <p>{message.content}</p>
                            <div className="flex items-center justify-end space-x-2 mt-1">
                              <p
                                className={`text-xs ${
                                  isOwn ? 'text-blue-100' : 'text-gray-500'
                                }`}
                              >
                                {format(new Date(message.createdAt), 'h:mm a')}
                              </p>
                              {isOwn && (
                                <span className="text-xs text-blue-100">
                                  {message.isRead ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white text-gray-500 px-4 py-2 rounded-lg border border-gray-200 text-sm italic">
                          {isTyping[1]} is typing...
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-4 border-t border-gray-200 bg-white"
                  >
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTyping();
                        }}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || !isConnected}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <FaPaperPlane className="mr-2" />
                        Send
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <p className="text-lg mb-2">No conversation selected</p>
                    <p className="text-sm">
                      Select a conversation to start messaging or wait for customers to message
                      you
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesRealtime;

