import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCalendar, FaDollarSign, FaCheckCircle, FaClock, FaChartLine, FaStar, FaUserEdit, FaComments, FaBell } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/Card';
import { format } from 'date-fns';
import axios from 'axios';

interface Booking {
  id: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  address: string;
  city: string;
  state: string;
  status: string;
  totalPrice: number;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  service: {
    name: string;
  };
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const ProviderDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState({
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    completedJobs: 0,
    averageRating: 0,
    responseRate: 0,
    upcomingJobs: 0,
  });

  const fetchData = React.useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch provider profile
      let providerProfile = null;
      try {
        const profileResponse = await axios.get(`/api/providers/profile/${user.id}`);
        providerProfile = profileResponse.data.profile;
        setProfileComplete(providerProfile?.profileComplete || false);
      } catch (error) {
        // Profile doesn't exist yet
        setProfileComplete(false);
      }

      // Fetch bookings
      const bookingsResponse = await axios.get(`/api/bookings/user/${user.id}?role=PROVIDER`);
      const allBookings = bookingsResponse.data.bookings || [];
      setBookings(allBookings);

      // Fetch notifications
      const notificationsResponse = await axios.get(`/api/notifications/${user.id}`);
      const allNotifications = notificationsResponse.data.notifications || [];
      setNotifications(allNotifications.filter((n: Notification) => !n.isRead).slice(0, 3));

      // Calculate stats
      const completed = allBookings.filter((b: Booking) => b.status === 'COMPLETED');
      const accepted = allBookings.filter((b: Booking) => b.status === 'ACCEPTED');

      const totalEarnings = completed.reduce((sum: number, b: Booking) => sum + b.totalPrice, 0);
      
      setStats({
        weeklyEarnings: totalEarnings * 0.2, // Mock weekly calculation
        monthlyEarnings: totalEarnings,
        completedJobs: completed.length,
        averageRating: providerProfile?.averageRating || 0,
        responseRate: 98, // TODO: Calculate from response times
        upcomingJobs: accepted.length,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const handleAccept = async (bookingId: number) => {
    if (!user) return;

    try {
      await axios.patch(`/api/bookings/${bookingId}/status`, {
        status: 'ACCEPTED',
        userId: user.id,
      });
      fetchData(); // Refresh data
      alert('Booking accepted successfully!');
    } catch (error) {
      console.error('Error accepting booking:', error);
      alert('Failed to accept booking');
    }
  };

  const handleDecline = async (bookingId: number) => {
    if (!user) return;

    try {
      await axios.patch(`/api/bookings/${bookingId}/status`, {
        status: 'DECLINED',
        userId: user.id,
      });
      fetchData(); // Refresh data
      alert('Booking declined');
    } catch (error) {
      console.error('Error declining booking:', error);
      alert('Failed to decline booking');
    }
  };

  const pendingBookings = bookings.filter(b => b.status === 'PENDING');
  const upcomingBookings = bookings.filter(b => b.status === 'ACCEPTED');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Provider Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}!</p>
        </div>

        {/* Notifications Alert - New Bookings */}
        {notifications.length > 0 && (
          <Card className="mb-6 bg-blue-50 border-2 border-blue-200">
            <div className="flex items-start">
              <FaBell className="text-blue-600 text-3xl mr-4 flex-shrink-0 mt-1 animate-pulse" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {notifications.length} New Notification{notifications.length > 1 ? 's' : ''}
                </h3>
                <div className="space-y-2 mb-4">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="bg-white p-3 rounded-lg border border-blue-100">
                      <p className="font-medium text-gray-900">{notif.title}</p>
                      <p className="text-sm text-gray-600">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
                {pendingBookings.length > 0 && (
                  <p className="text-blue-700 font-medium">
                    You have {pendingBookings.length} pending booking request{pendingBookings.length > 1 ? 's' : ''} to review!
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">This Week</p>
                <p className="text-3xl font-bold text-green-600">${stats.weeklyEarnings}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {profileComplete ? '+15% from last week' : 'Complete profile to start earning'}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <FaDollarSign className="text-green-600 text-2xl" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">This Month</p>
                <p className="text-3xl font-bold text-blue-600">${stats.monthlyEarnings}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {profileComplete ? '+8% from last month' : 'No bookings yet'}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <FaChartLine className="text-blue-600 text-2xl" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed Jobs</p>
                <p className="text-3xl font-bold text-purple-600">{stats.completedJobs}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {profileComplete ? 'All time' : 'No jobs completed'}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <FaCheckCircle className="text-purple-600 text-2xl" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Average Rating</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {profileComplete ? stats.averageRating : '--'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {profileComplete ? `${stats.responseRate}% response rate` : 'No ratings yet'}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <FaStar className="text-yellow-600 text-2xl" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Booking Requests */}
          <div className="lg:col-span-2">
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Booking Requests ({pendingBookings.length})
              </h2>
              
              {pendingBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaCalendar className="mx-auto text-4xl mb-2 text-gray-300" />
                  <p>No pending requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingBookings.map(booking => (
                    <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900">{booking.customer.name}</h3>
                          <p className="text-gray-600">{booking.service.name}</p>
                        </div>
                        <span className="text-xl font-bold text-blue-600">${booking.totalPrice.toFixed(2)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <FaCalendar className="mr-2 text-blue-600" />
                          {format(new Date(booking.bookingDate), 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center">
                          <FaClock className="mr-2 text-blue-600" />
                          {booking.startTime} - {booking.endTime}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {booking.address}, {booking.city}, {booking.state}
                      </p>
                      
                      <p className="text-sm text-gray-500 mb-4">
                        Customer: {booking.customer.phone}
                      </p>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAccept(booking.id)}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDecline(booking.id)}
                          className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Upcoming Schedule */}
          <div className="lg:col-span-1">
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Upcoming Schedule
              </h2>
              
              <div className="space-y-3">
                {upcomingBookings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FaCalendar className="mx-auto text-3xl mb-2 text-gray-300" />
                    <p className="text-sm">No upcoming bookings</p>
                  </div>
                ) : (
                  upcomingBookings.slice(0, 3).map(booking => (
                    <div key={booking.id} className="border-l-4 border-blue-600 bg-blue-50 p-3 rounded">
                      <p className="font-semibold text-gray-900">{booking.customer.name}</p>
                      <p className="text-sm text-gray-600">{booking.service.name}</p>
                      <div className="flex items-center text-sm text-gray-600 mt-2">
                        <FaCalendar className="mr-2" />
                        {format(new Date(booking.bookingDate), 'MMM d')} at {booking.startTime}
                      </div>
                      <p className="text-lg font-bold text-blue-600 mt-2">${booking.totalPrice.toFixed(2)}</p>
                    </div>
                  ))
                )}
                
                <button 
                  onClick={() => navigate('/provider/calendar')}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors mt-4"
                >
                  View Full Calendar
                </button>
              </div>
            </Card>

            <Card className="mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Quick Actions
              </h2>
              
              <div className="space-y-3">
                <Link
                  to="/provider/calendar"
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center">
                    <FaCalendar className="text-xl mr-3" />
                    <div className="text-left">
                      <p className="font-semibold">Update Availability</p>
                      <p className="text-xs text-indigo-100">Manage your schedule</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  to="/provider/messages"
                  className="w-full bg-white border-2 border-indigo-600 text-indigo-600 py-3 px-4 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center">
                    <FaComments className="text-xl mr-3" />
                    <div className="text-left">
                      <p className="font-semibold">View Messages</p>
                      <p className="text-xs text-indigo-500">Chat with customers</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  to="/provider/profile-setup"
                  className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center">
                    <FaUserEdit className="text-xl mr-3" />
                    <div className="text-left">
                      <p className="font-semibold">Edit Profile</p>
                      <p className="text-xs text-gray-500">Update your information</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;

