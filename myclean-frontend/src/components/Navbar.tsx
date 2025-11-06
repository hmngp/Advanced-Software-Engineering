import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaBars, FaTimes, FaUser, FaCalendar, FaChartBar, FaSignOutAlt, FaBell } from 'react-icons/fa';
import axios from 'axios';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string;
  createdAt: string;
}

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = React.useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await axios.get(`/api/notifications/${user.id}`);
      const notifs = response.data.notifications || [];
      setNotifications(notifs.slice(0, 5)); // Show only last 5
      setUnreadCount(notifs.filter((n: Notification) => !n.isRead).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  const markAsRead = async (notificationId: number) => {
    try {
      await axios.patch(`/api/notifications/${notificationId}/read`);
      fetchNotifications(); // Refresh notifications
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setShowNotifications(false);
    navigate(notification.link);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-blue-600">MyClean</span>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {user.role === 'CUSTOMER' && (
                  <>
                    <Link to="/search" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                      Find Cleaners
                    </Link>
                    <Link to="/my-bookings" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                      My Bookings
                    </Link>
                  </>
                )}
                {user.role === 'PROVIDER' && (
                  <>
                    <Link to="/provider/home" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
                      Home
                    </Link>
                    <Link to="/provider/dashboard" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center">
                      <FaChartBar className="mr-2" /> Dashboard
                    </Link>
                    <Link to="/provider/calendar" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center">
                      <FaCalendar className="mr-2" /> Calendar
                    </Link>
                    <Link to="/provider/messages" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
                      Messages
                    </Link>
                  </>
                )}
                {user.role === 'ADMIN' && (
                  <Link to="/admin" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                    Admin Panel
                  </Link>
                )}
                <div className="flex items-center space-x-2">
                  {/* Notification Bell */}
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md relative"
                    >
                      <FaBell size={20} />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    
                    {/* Notifications Dropdown */}
                    {showNotifications && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="p-3 border-b border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              No notifications yet
                            </div>
                          ) : (
                            notifications.map((notification) => (
                              <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                                  !notification.isRead ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <p className="text-sm font-medium text-gray-900">
                                    {notification.title}
                                  </p>
                                  {!notification.isRead && (
                                    <span className="h-2 w-2 bg-blue-600 rounded-full"></span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(notification.createdAt).toLocaleString()}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {user.role === 'PROVIDER' ? (
                    <Link to="/provider/profile-setup" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center">
                      <FaUser className="mr-2" /> {user.name}
                    </Link>
                  ) : (
                    <span className="text-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center">
                      <FaUser className="mr-2" /> {user.name}
                    </span>
                  )}
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 flex items-center"
                  >
                    <FaSignOutAlt className="mr-2" /> Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Login
                </Link>
                <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 hover:text-blue-600 p-2"
            >
              {mobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {user ? (
              <>
                {user.role === 'CUSTOMER' && (
                  <>
                    <Link to="/search" className="block text-gray-700 hover:bg-blue-50 px-3 py-2 rounded-md text-base font-medium">
                      Find Cleaners
                    </Link>
                    <Link to="/my-bookings" className="block text-gray-700 hover:bg-blue-50 px-3 py-2 rounded-md text-base font-medium">
                      My Bookings
                    </Link>
                  </>
                )}
                {user.role === 'PROVIDER' && (
                  <>
                    <Link to="/provider/home" className="block text-gray-700 hover:bg-blue-50 px-3 py-2 rounded-md text-base font-medium">
                      Home
                    </Link>
                    <Link to="/provider/dashboard" className="block text-gray-700 hover:bg-blue-50 px-3 py-2 rounded-md text-base font-medium">
                      Dashboard
                    </Link>
                    <Link to="/provider/calendar" className="block text-gray-700 hover:bg-blue-50 px-3 py-2 rounded-md text-base font-medium">
                      Calendar
                    </Link>
                    <Link to="/provider/messages" className="block text-gray-700 hover:bg-blue-50 px-3 py-2 rounded-md text-base font-medium">
                      Messages
                    </Link>
                  </>
                )}
                {user.role === 'PROVIDER' && (
                  <Link to="/provider/profile-setup" className="block text-gray-700 hover:bg-blue-50 px-3 py-2 rounded-md text-base font-medium">
                    Edit Profile
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left text-red-600 hover:bg-red-50 px-3 py-2 rounded-md text-base font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block text-gray-700 hover:bg-blue-50 px-3 py-2 rounded-md text-base font-medium">
                  Login
                </Link>
                <Link to="/register" className="block text-gray-700 hover:bg-blue-50 px-3 py-2 rounded-md text-base font-medium">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

