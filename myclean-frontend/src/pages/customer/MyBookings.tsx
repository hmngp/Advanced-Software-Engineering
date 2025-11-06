import React, { useEffect, useMemo, useState } from 'react';
import { FaCalendar, FaClock, FaMapMarkerAlt, FaStar, FaComments } from 'react-icons/fa';
import { format } from 'date-fns';
import axios from 'axios';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

interface Booking {
  id: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  status: string;
  totalPrice: number;
  specialInstructions?: string | null;
  service: {
    id: number;
    name: string;
    description?: string | null;
  };
  provider: {
    id: number;
    name: string;
    email: string;
    phone: string;
    profileImage?: string | null;
  };
  customer: {
    id: number;
    name: string;
  };
  review?: any;
}

interface Message {
  id: number;
  bookingId: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
}

const STATUS_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'DECLINED', label: 'Declined' },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]['key'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
};

const getStatusClass = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'ACCEPTED':
      return 'bg-blue-100 text-blue-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    case 'DECLINED':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'ACCEPTED':
      return 'Accepted';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'DECLINED':
      return 'Declined';
    default:
      return status;
  }
};

const getAvatar = (name: string, profileImage?: string | null) => {
  if (profileImage && profileImage.trim()) return profileImage;
  const encodedName = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encodedName}&background=1d4ed8&color=ffffff`;
};

const MyBookings: React.FC = () => {
  const { user, isCustomer } = useAuth();
  const location = useLocation();
  const bookingState = location.state as { bookingSuccess?: boolean; providerName?: string; serviceName?: string } | null;
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
  const [message, setMessage] = useState('');
  const [bookingMessages, setBookingMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [pageMessage, setPageMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (bookingState?.bookingSuccess) {
      const providerName = bookingState.providerName ?? 'your provider';
      const serviceName = bookingState.serviceName ?? 'the service';
      setPageMessage({
        type: 'success',
        text: `Booking request sent successfully for ${serviceName} with ${providerName}.`,
      });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [bookingState, location.pathname, navigate]);

  useEffect(() => {
    if (!pageMessage) return;
    const timer = window.setTimeout(() => setPageMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [pageMessage]);

  useEffect(() => {
    if (!user) return;

    const fetchBookings = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(`/api/bookings/user/${user.id}?role=CUSTOMER`);
        const allBookings: Booking[] = response.data?.bookings ?? [];
        setBookings(allBookings);
      } catch (err) {
        console.error('Error fetching bookings', err);
        setError('Failed to load bookings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user]);

  const filteredBookings = useMemo(() => {
    if (filter === 'ALL') return bookings;
    return bookings.filter((booking) => booking.status === filter);
  }, [bookings, filter]);

  const handleReview = (booking: Booking) => {
    setSelectedBooking(booking);
    setRating(0);
    setReview('');
    setReviewPhotos([]);
    setShowReviewModal(true);
  };

  const submitReview = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ bookingId: selectedBooking?.id, rating, review, reviewPhotos });
    setShowReviewModal(false);
    setRating(0);
    setReview('');
    setReviewPhotos([]);
  };

  const loadMessages = async (booking: Booking) => {
    if (!user) return;
    setMessagesLoading(true);
    setMessagesError(null);

    try {
      const response = await axios.get(`/api/messages/booking/${booking.id}`);
      const messages: Message[] = response.data?.messages ?? [];
      setBookingMessages(messages);

      await axios.patch(`/api/messages/booking/${booking.id}/read`, { userId: user.id }).catch((err) => {
        console.error('Failed to mark messages as read', err);
      });
    } catch (err) {
      console.error('Failed to load booking messages', err);
      setMessagesError('Failed to load messages.');
      setBookingMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleMessageProvider = (booking: Booking) => {
    setSelectedBooking(booking);
    setMessage('');
    setShowMessageModal(true);
    void loadMessages(booking);
  };

  const submitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !user) return;

    const trimmed = message.trim();
    if (!trimmed) return;

    try {
      const response = await axios.post('/api/messages', {
        bookingId: selectedBooking.id,
        senderId: user.id,
        receiverId: selectedBooking.provider.id,
        content: trimmed,
      });

      const sent: Message | undefined = response.data?.message;
      if (sent) {
        setBookingMessages((prev) => [...prev, sent]);
      }

      setMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleReschedule = (booking: Booking) => {
    setSelectedBooking(booking);
    setNewDate(booking.bookingDate ? booking.bookingDate.split('T')[0] : '');
    setNewTime(booking.startTime);
    setShowRescheduleModal(true);
  };

  const submitReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    console.log({
      bookingId: selectedBooking.id,
      newDate,
      newTime,
    });

    alert('Reschedule request submitted successfully!');
    setShowRescheduleModal(false);
    setNewDate('');
    setNewTime('');
  };

  const handleCancelBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const submitCancellation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !user) return;

    console.log({ bookingId: selectedBooking.id, cancelReason });
    alert('Booking cancellation request submitted.');
    setShowCancelModal(false);
    setCancelReason('');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Please log in to view your bookings.</p>
      </div>
    );
  }

  if (!isCustomer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Bookings are only available for customers.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Bookings</h1>

        {pageMessage && (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${
              pageMessage.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : pageMessage.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}
          >
            {pageMessage.text}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600">No bookings found for this filter.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <Card key={booking.id}>
                <div className="flex flex-col md:flex-row justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <img
                      src={getAvatar(booking.provider.name, booking.provider.profileImage)}
                      alt={booking.provider.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{booking.provider.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(booking.status)}`}>
                          {statusLabel(booking.status)}
                        </span>
                      </div>

                      <p className="text-gray-600 mb-3">{booking.service.name}</p>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <FaCalendar className="mr-2 text-blue-600" />
                          {booking.bookingDate ? format(new Date(booking.bookingDate), 'MMMM d, yyyy') : 'TBD'}
                        </div>
                        <div className="flex items-center">
                          <FaClock className="mr-2 text-blue-600" />
                          {booking.startTime} - {booking.endTime}
                        </div>
                        <div className="flex items-center">
                          <FaMapMarkerAlt className="mr-2 text-blue-600" />
                          {`${booking.address}, ${booking.city}, ${booking.state} ${booking.zipCode}`}
                        </div>
                      </div>

                      {booking.specialInstructions && (
                        <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
                          <p className="font-medium">Special Instructions</p>
                          <p>{booking.specialInstructions}</p>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          onClick={() => handleMessageProvider(booking)}
                          className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <FaComments className="mr-2" />
                          Message Provider
                        </button>

                        <button
                          onClick={() => handleReschedule(booking)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Reschedule
                        </button>

                        <button
                          onClick={() => handleCancelBooking(booking)}
                          className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Cancel Booking
                        </button>

                        {booking.status === 'COMPLETED' && !booking.review && (
                          <button
                            onClick={() => handleReview(booking)}
                            className="inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
                          >
                            <FaStar className="mr-2" />
                            Leave Review
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 md:mt-0 md:w-48">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600">Total Price</p>
                      <p className="text-2xl font-semibold text-blue-700">{formatCurrency(booking.totalPrice)}</p>
                      <p className="text-xs text-blue-500 mt-2">Includes GST and service fees</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={`Rate ${selectedBooking?.provider.name}`}
      >
        <form onSubmit={submitReview} className="space-y-6">
          <div>
            <p className="text-sm text-gray-600 mb-3">How satisfied were you with the service?</p>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-3xl focus:outline-none ${
                    star <= rating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
              required
              placeholder="Share your experience..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Add Photos (Optional)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setReviewPhotos(Array.from(e.target.files || []))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">Upload photos of the completed work</p>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rating === 0}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Review
            </button>
          </div>
        </form>
      </Modal>

      {/* Message Provider Modal */}
      <Modal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title={`Conversation with ${selectedBooking?.provider.name}`}
      >
        <div className="space-y-4">
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
            {messagesLoading ? (
              <p className="text-gray-500">Loading messages...</p>
            ) : messagesError ? (
              <p className="text-red-600">{messagesError}</p>
            ) : bookingMessages.length === 0 ? (
              <p className="text-gray-500 text-center">No messages yet. Start the conversation.</p>
            ) : (
              bookingMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex mb-3 ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg ${
                      msg.senderId === user.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className="text-xs mt-1 text-gray-200">
                      {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={submitMessage} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
                placeholder="Type your message to the provider..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowMessageModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Send Message
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        title="Reschedule Booking"
      >
        <form onSubmit={submitReschedule} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Date</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Time</label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Reschedule requests are subject to provider availability. We will notify you once the provider responds.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setShowRescheduleModal(false)}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Booking"
      >
        <form onSubmit={submitCancellation} className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 mb-2">
              Cancelling a booking may incur a cancellation fee if done within 24 hours of the scheduled time.
            </p>
            <p className="text-sm text-red-700">
              Please provide a reason for the cancellation so we can inform the provider.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Cancellation</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              required
              placeholder="Let the provider know why you're cancelling..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setShowCancelModal(false)}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Keep Booking
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Confirm Cancellation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MyBookings;
