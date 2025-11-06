import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaCircle, FaPaperPlane, FaSearch } from 'react-icons/fa';
import { format } from 'date-fns';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

const SOCKET_BASE_RAW = process.env.REACT_APP_API_URL || 'http://localhost:4000';
const SOCKET_URL = SOCKET_BASE_RAW.replace(/\/+$/, '');

interface Message {
  id: number;
  bookingId: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: number;
    name: string | null;
    profileImage: string | null;
  };
  receiver?: {
    id: number;
    name: string | null;
    profileImage: string | null;
  };
}

interface Conversation {
  bookingId: number;
  customer: {
    id: number;
    name: string;
    profileImage?: string | null;
  };
  serviceName?: string | null;
  bookingDate?: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  messages: Message[];
}

interface BookingSummary {
  id: number;
  customer: {
    id: number;
    name: string;
    profileImage?: string | null;
  };
  serviceName?: string | null;
  bookingDate?: string | null;
}

const sortConversations = (items: Conversation[]): Conversation[] => {
  return [...items].sort((a, b) => {
    const aDate = a.lastMessageAt ?? a.bookingDate ?? null;
    const bDate = b.lastMessageAt ?? b.bookingDate ?? null;
    const aTime = aDate ? new Date(aDate).getTime() : 0;
    const bTime = bDate ? new Date(bDate).getTime() : 0;
    return bTime - aTime;
  });
};

const getAvatar = (name: string, profileImage?: string | null) => {
  if (profileImage && profileImage.trim()) return profileImage;
  const encodedName = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encodedName}&background=1d4ed8&color=ffffff`;
};

const Messages: React.FC = () => {
  const { user, isProvider } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sending, setSending] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const bookingLookupRef = useRef<Record<number, BookingSummary>>({});

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const bookingsResponse = await axios.get(`/api/bookings/user/${user.id}?role=PROVIDER`);
      const bookings: any[] = bookingsResponse.data?.bookings ?? [];

      const bookingInfo: Record<number, BookingSummary> = {};
      bookings.forEach((booking) => {
        bookingInfo[booking.id] = {
          id: booking.id,
          customer: {
            id: booking.customer.id,
            name: booking.customer.name,
            profileImage: booking.customer.profileImage,
          },
          serviceName: booking.service?.name ?? null,
          bookingDate: booking.bookingDate ?? null,
        };
      });

      bookingLookupRef.current = bookingInfo;

      const messageResults = await Promise.all(
        bookings.map((booking) =>
          axios
            .get(`/api/messages/booking/${booking.id}`)
            .then((res) => (res.data?.messages ?? []) as Message[])
            .catch((err) => {
              console.error(`Failed to fetch messages for booking ${booking.id}`, err);
              return [] as Message[];
            })
        )
      );

      const hydrated: Conversation[] = bookings.map((booking, index) => {
        const messages = messageResults[index] ?? [];
        const lastMessage = messages.length ? messages[messages.length - 1] : null;
        const unreadCount = messages.filter((msg) => !msg.isRead && msg.receiverId === user.id).length;

        return {
          bookingId: booking.id,
          customer: bookingLookupRef.current[booking.id].customer,
          serviceName: bookingLookupRef.current[booking.id].serviceName,
          bookingDate: bookingLookupRef.current[booking.id].bookingDate ?? null,
          lastMessageAt: lastMessage ? lastMessage.createdAt : null,
          lastMessagePreview: lastMessage ? lastMessage.content : null,
          unreadCount,
          messages,
        };
      });

      const sorted = sortConversations(hydrated);
      setConversations(sorted);

      if (sorted.length === 0) {
        setSelectedBookingId(null);
      } else {
        setSelectedBookingId((prev) => {
          if (prev && sorted.some((conv) => conv.bookingId === prev)) {
            return prev;
          }
          return sorted[0].bookingId;
        });
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
      setError('Failed to load conversations. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const hydrateBooking = useCallback(async (bookingId: number) => {
    if (bookingLookupRef.current[bookingId]) {
      return bookingLookupRef.current[bookingId];
    }

    try {
      const response = await axios.get(`/api/bookings/${bookingId}`);
      const booking = response.data?.booking;
      if (!booking) return null;

      const summary: BookingSummary = {
        id: booking.id,
        customer: {
          id: booking.customer.id,
          name: booking.customer.name,
          profileImage: booking.customer.profileImage,
        },
        serviceName: booking.service?.name ?? null,
        bookingDate: booking.bookingDate ?? null,
      };

      bookingLookupRef.current[bookingId] = summary;
      return summary;
    } catch (err) {
      console.error(`Failed to fetch booking ${bookingId} for incoming message`, err);
      return null;
    }
  }, []);

  const handleIncomingMessage = useCallback(
    async (incoming: Message) => {
      if (!user) return;

      let bookingSummary = bookingLookupRef.current[incoming.bookingId];
      if (!bookingSummary) {
        bookingSummary = await hydrateBooking(incoming.bookingId) ?? undefined;
        if (!bookingSummary) {
          return;
        }
      }

      setConversations((prev) => {
        const existingIndex = prev.findIndex((conv) => conv.bookingId === incoming.bookingId);
        const shouldIncrementUnread = incoming.receiverId === user.id && !incoming.isRead;

        if (existingIndex >= 0) {
          const existing = prev[existingIndex];

          if (existing.messages.some((msg) => msg.id === incoming.id)) {
            return prev;
          }

          const updatedMessages = [...existing.messages, incoming].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

          const updatedConversation: Conversation = {
            ...existing,
            messages: updatedMessages,
            lastMessageAt: incoming.createdAt,
            lastMessagePreview: incoming.content,
            unreadCount: shouldIncrementUnread ? existing.unreadCount + 1 : existing.unreadCount,
          };

          const next = [...prev];
          next[existingIndex] = updatedConversation;
          return sortConversations(next);
        }

        if (!bookingSummary) {
          return prev;
        }

        const nextConversation: Conversation = {
          bookingId: incoming.bookingId,
          customer: bookingSummary.customer,
          serviceName: bookingSummary.serviceName,
          bookingDate: bookingSummary.bookingDate ?? null,
          lastMessageAt: incoming.createdAt,
          lastMessagePreview: incoming.content,
          unreadCount: shouldIncrementUnread ? 1 : 0,
          messages: [incoming],
        };

        return sortConversations([...prev, nextConversation]);
      });
    },
    [hydrateBooking, user]
  );

  useEffect(() => {
    if (!user) return;

    void fetchConversations();
  }, [user, fetchConversations]);

  useEffect(() => {
    if (!user) return;

    const socket: Socket = io(SOCKET_URL, {
      withCredentials: true,
      auth: { userId: user.id },
    });

    const onMessage = (incoming: Message) => {
      if (incoming.senderId !== user.id && incoming.receiverId !== user.id) {
        return;
      }
      void handleIncomingMessage(incoming);
    };

    socket.on('message:new', onMessage);
    socketRef.current = socket;

    return () => {
      socket.off('message:new', onMessage);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, handleIncomingMessage]);

  const filteredConversations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((conv) => conv.customer.name.toLowerCase().includes(term));
  }, [conversations, searchTerm]);

  const currentConversation = useMemo(() => {
    if (!selectedBookingId) return null;
    return conversations.find((conv) => conv.bookingId === selectedBookingId) ?? null;
  }, [conversations, selectedBookingId]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Please log in to view your messages.</p>
      </div>
    );
  }

  if (!isProvider) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Messaging is only available for providers.</p>
      </div>
    );
  }

  const handleSelectConversation = (bookingId: number) => {
    if (!user) return;

    setSelectedBookingId(bookingId);

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.bookingId !== bookingId) return conv;
        if (conv.unreadCount === 0) return conv;
        return {
          ...conv,
          unreadCount: 0,
          messages: conv.messages.map((msg) =>
            msg.receiverId === user.id ? { ...msg, isRead: true } : msg
          ),
        };
      })
    );

    void axios.patch(`/api/messages/booking/${bookingId}/read`, { userId: user.id }).catch((err) => {
      console.error('Failed to mark messages as read', err);
    });
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !currentConversation) return;

    const trimmed = newMessage.trim();
    if (!trimmed || sending) return;

    try {
      setSending(true);
      const response = await axios.post('/api/messages', {
        bookingId: currentConversation.bookingId,
        senderId: user.id,
        receiverId: currentConversation.customer.id,
        content: trimmed,
      });

      const sent: Message | undefined = response.data?.message;
      if (sent) {
        await handleIncomingMessage(sent);
      }

      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const renderTimestamp = (value: string | null | undefined, formatString: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return format(date, formatString);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Messages</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
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
                  <div className="p-6 text-center text-gray-500">
                    <p>No conversations yet.</p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const isSelected = selectedBookingId === conversation.bookingId;
                    const displayDate = conversation.lastMessageAt ?? conversation.bookingDate ?? null;

                    return (
                      <div
                        key={conversation.bookingId}
                        onClick={() => handleSelectConversation(conversation.bookingId)}
                        className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <img
                            src={getAvatar(conversation.customer.name, conversation.customer.profileImage)}
                            alt={conversation.customer.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold text-gray-900 truncate">
                                  {conversation.customer.name}
                                </h3>
                                {conversation.serviceName && (
                                  <p className="text-xs text-gray-500 truncate">{conversation.serviceName}</p>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {renderTimestamp(displayDate, 'MMM d')}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-sm text-gray-600 truncate">
                                {conversation.lastMessagePreview ?? 'No messages yet'}
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
              {currentConversation ? (
                <>
                  {/* Header */}
                  <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center space-x-3">
                      <img
                        src={getAvatar(currentConversation.customer.name, currentConversation.customer.profileImage)}
                        alt={currentConversation.customer.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {currentConversation.customer.name}
                        </h3>
                        <div className="flex items-center text-sm text-green-600">
                          <FaCircle size={8} className="mr-1" />
                          Active
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {currentConversation.messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <p>No messages yet. Start the conversation.</p>
                      </div>
                    ) : (
                      currentConversation.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.senderId === user.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}
                          >
                            <p>{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.senderId === user.id ? 'text-blue-100' : 'text-gray-500'
                              }`}
                            >
                              {renderTimestamp(message.createdAt, 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={sending}
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <FaPaperPlane className="mr-2" />
                        {sending ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <p>Select a conversation to start messaging</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
