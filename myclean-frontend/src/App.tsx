import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import ProviderRoute from './components/ProviderRoute';
import { useProviderProfile } from './hooks/useProviderProfile';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';

// Customer Pages
import SearchProviders from './pages/customer/SearchProviders';
import ProviderProfile from './pages/customer/ProviderProfile';
import MyBookings from './pages/customer/MyBookings';
import Payment from './pages/customer/Payment';

// Provider Pages
import ProviderDashboard from './pages/provider/Dashboard';
import ProviderLandingPage from './pages/provider/ProviderLandingPage';
import ProviderProfileSetup from './pages/provider/ProviderProfileSetup';
import AvailabilityCalendar from './pages/provider/AvailabilityCalendar';
import MessagesRealtime from './pages/provider/MessagesRealtime';
import PaymentTracking from './pages/provider/PaymentTracking';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

// Other Pages
import Verification from './pages/Verification';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Customer Routes - Providers CANNOT access these */}
            <Route
              path="/search"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <SearchProviders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/:id"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <ProviderProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <MyBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <Payment />
                </ProtectedRoute>
              }
            />

            {/* Provider Routes */}
            <Route
              path="/provider/profile-setup"
              element={
                <ProviderRoute allowIncomplete={true}>
                  <ProviderProfileSetup />
                </ProviderRoute>
              }
            />
            <Route
              path="/provider/home"
              element={
                <ProviderRoute>
                  <ProviderLandingPage />
                </ProviderRoute>
              }
            />
            <Route
              path="/provider/dashboard"
              element={
                <ProviderRoute>
                  <ProviderDashboard />
                </ProviderRoute>
              }
            />
            <Route
              path="/provider/calendar"
              element={
                <ProviderRoute>
                  <AvailabilityCalendar />
                </ProviderRoute>
              }
            />
            <Route
              path="/provider/messages"
              element={
                <ProviderRoute>
                  <MessagesRealtime />
                </ProviderRoute>
              }
            />
            <Route
              path="/provider/payments"
              element={
                <ProviderRoute>
                  <PaymentTracking />
                </ProviderRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Shared Protected Routes */}
            <Route
              path="/verification"
              element={
                <ProtectedRoute allowedRoles={['PROVIDER']}>
                  <Verification />
                </ProtectedRoute>
              }
            />

            {/* Dashboard Redirect based on role */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardRedirect />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

// Component to redirect to appropriate dashboard based on role
const DashboardRedirect: React.FC = () => {
  const { user } = useAuth();
  const { profileComplete, loading } = useProviderProfile();

  if (!user) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  
  if (user.role === 'PROVIDER') {
    // Redirect to profile setup if profile is incomplete
    if (profileComplete === false) {
      return <Navigate to="/provider/profile-setup" replace />;
    }
    return <Navigate to="/provider/home" replace />;
  }
  
  return <Navigate to="/search" replace />;
};

export default App;
