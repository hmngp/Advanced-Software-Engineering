// src/pages/customer/ProviderProfile.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaStar, FaMapMarkerAlt, FaDollarSign, FaCheckCircle, FaClock, FaCalendar, FaCar, FaTools, FaShieldAlt } from 'react-icons/fa';
import Modal from '../../components/Modal';
import { format } from 'date-fns';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { fetchProvider, type ProviderProfile as ProviderDTO } from '../../Services/providers';

// ---- UI types ----
type ServiceUI = {
  id: number;
  name: string;
  description?: string;
  pricePerHourCents: number; // cents from backend
  durationMin: number;
};

type ReviewUI = {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  customerName?: string;
  serviceName?: string;
};

type ProviderUI = {
  id: number;
  name: string;
  profileImage: string | null;
  profile: {
    bio?: string;
    yearsExperience?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    address?: string;
    averageRating?: number;
    totalReviews?: number;
    totalBookings?: number;
    hasInsurance?: boolean;
    insuranceProvider?: string;
    hasVehicle?: boolean;
    hasEquipment?: boolean;
    certifications?: string;
  };
  services: ServiceUI[];
  availability: Array<{ dayOfWeek: string; startTime: string; endTime: string }>;
  reviews: ReviewUI[];
};

const ProviderProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [provider, setProvider] = useState<ProviderUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceUI | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateAU, setStateAU] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [selectedTab, setSelectedTab] = useState<'about' | 'services' | 'reviews'>('services');
  const [submittingBooking, setSubmittingBooking] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const dto: ProviderDTO = await fetchProvider(Number(id));
        const mapped: ProviderUI = {
          id: dto.id,
          name: dto.user?.name ?? 'Cleaner',
          profileImage: dto.user?.profileImage ?? null,
          profile: {
            bio: dto.bio ?? '',
            yearsExperience: dto.yearsExperience ?? '',
            city: dto.city ?? '',
            state: dto.state ?? '',
            zipCode: dto.zipCode ?? '',
            address: dto.address ?? '',
            averageRating: dto.averageRating ?? 0,
            totalReviews: dto.totalReviews ?? 0,
            totalBookings: dto.totalBookings ?? 0,
            hasInsurance: dto.hasInsurance ?? false,
          
            hasVehicle: dto.hasVehicle ?? false,
            hasEquipment: dto.hasEquipment ?? false,
            
          },
          services: (dto.services ?? []).map(s => ({
            id: s.id,
            name: s.serviceName,
            description: s.description,
            pricePerHourCents: s.pricePerHour ?? 0, // cents
            durationMin: s.durationMin,
          })),
          availability: [], // backend doesn't include it in this route yet
          reviews: [],      // backend doesn't include it in this route yet
        };

        setProvider(mapped);
        setError('');
      } catch (e) {
        console.error(e);
        setError('Failed to load provider details');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const calculateDurationHours = () => {
    if (!selectedTime || !endTime) return 0;
    const start = new Date(`2000-01-01T${selectedTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return hours > 0 ? hours : 0;
  };

  const calculateTotalPriceCents = () => {
    if (!selectedService) return 0;
    const duration = calculateDurationHours();
    return Math.round(duration * selectedService.pricePerHourCents); // cents
  };

  const handleBookService = (service: ServiceUI) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'CUSTOMER') {
      alert('Only customers can book services');
      return;
    }
    setSelectedService(service);
    setShowBookingModal(true);
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !provider || !selectedService) return;

    const duration = calculateDurationHours();
    if (duration <= 0) {
      alert('End time must be after start time');
      return;
    }

    try {
      setSubmittingBooking(true);
      const totalPrice = calculateTotalPriceCents(); // cents

      const bookingData = {
        customerId: user.id,
        providerId: provider.id,
        serviceId: selectedService.id,
        bookingDate: selectedDate, // your backend accepts string/Date; keep consistent with your bookings route
        startTime: selectedTime,
        endTime,
        address,
        city,
        state: stateAU,
        zipCode,
        specialInstructions,
        totalPrice, // cents
      };

      await axios.post('/api/bookings', bookingData);
      setShowBookingModal(false);
      alert('Booking request sent successfully! The provider will review and respond soon.');
      navigate('/my-bookings');
    } catch (err) {
      console.error('Error creating booking:', err);
      alert('Failed to create booking. Please try again.');
    } finally {
      setSubmittingBooking(false);
    }
  };

  const availableTimes = [
    '06:00','07:00','08:00','09:00','10:00','11:00',
    '12:00','13:00','14:00','15:00','16:00','17:00','18:00'
  ];
  const australianStates = ['NSW','VIC','QLD','WA','SA','TAS','ACT','NT'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading provider details...</p>
        </div>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error || 'Provider not found'}</p>
          <button
            onClick={() => navigate('/search')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  const minPriceCents =
    provider.services.length > 0
      ? Math.min(...provider.services.map(s => s.pricePerHourCents))
      : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <img
              src={provider.profileImage || '/api/placeholder/150/150'}
              alt={provider.name}
              className="w-32 h-32 rounded-full object-cover"
            />

            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold text-gray-900">{provider.name}</h1>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                  <FaCheckCircle className="mr-1" /> Verified
                </span>
              </div>

              <div className="flex items-center mt-2 text-gray-600">
                <FaMapMarkerAlt className="mr-2" />
                {provider.profile.city || '—'}, {provider.profile.state || '—'} {provider.profile.zipCode || ''}
              </div>

              <div className="flex items-center mt-2">
                <FaStar className="text-yellow-400 mr-1" />
                <span className="font-semibold text-lg">
                  {provider.profile.averageRating?.toFixed(1) || 'New'}
                </span>
                {provider.profile.totalReviews && provider.profile.totalReviews > 0 && (
                  <span className="text-gray-500 ml-2">
                    ({provider.profile.totalReviews} reviews)
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              {provider.services.length > 0 && (
                <>
                  <div className="text-sm text-gray-600 mb-2">Services from</div>
                  <div className="text-3xl font-bold text-blue-600 flex items-center">
                    <FaDollarSign />
                    {(minPriceCents / 100).toFixed(2)}/hr
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setSelectedTab('services')}
                className={`px-6 py-4 font-medium ${selectedTab === 'services' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Services
              </button>
              <button
                onClick={() => setSelectedTab('about')}
                className={`px-6 py-4 font-medium ${selectedTab === 'about' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                About
              </button>
              <button
                onClick={() => setSelectedTab('reviews')}
                className={`px-6 py-4 font-medium ${selectedTab === 'reviews' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Reviews ({provider.reviews.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            {selectedTab === 'services' && (
              <div className="space-y-4">
                {provider.services.map(service => (
                  <div key={service.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900">{service.name}</h3>
                        {service.description && <p className="text-gray-600 mt-2">{service.description}</p>}
                        <div className="flex items-center mt-3 text-sm text-gray-500">
                          <FaClock className="mr-1" />
                          <span>Minimum {service.durationMin} minutes</span>
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-2xl font-bold text-blue-600 flex items-center">
                          <FaDollarSign />
                          {(service.pricePerHourCents / 100).toFixed(2)}/hr
                        </div>
                        <button
                          onClick={() => handleBookService(service)}
                          className="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {provider.services.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No services available</p>
                )}
              </div>
            )}

            {selectedTab === 'about' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">About Me</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {provider.profile.bio || 'No bio provided yet.'}
                  </p>
                </div>

                {(provider.profile.hasInsurance || provider.profile.hasVehicle || provider.profile.hasEquipment) && (
                  <div className="flex flex-wrap gap-2">
                    {provider.profile.hasInsurance && (
                      <span className="flex items-center bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                        <FaShieldAlt className="mr-1" /> Insured
                      </span>
                    )}
                    {provider.profile.hasVehicle && (
                      <span className="flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                        <FaCar className="mr-1" /> Has Vehicle
                      </span>
                    )}
                    {provider.profile.hasEquipment && (
                      <span className="flex items-center bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm">
                        <FaTools className="mr-1" /> Brings Equipment
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'reviews' && (
              <div className="space-y-6">
                {provider.reviews.map(review => (
                  <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{review.customerName ?? 'Customer'}</h4>
                        <div className="flex items-center mt-1">
                          {[...Array(5)].map((_, i) => (
                            <FaStar
                              key={i}
                              className={`${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {review.serviceName ?? 'Service'} • {format(new Date(review.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-gray-700">{review.comment}</p>
                  </div>
                ))}

                {provider.reviews.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No reviews yet</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        title={`Book ${selectedService?.name ?? 'service'}`}
        size="lg"
      >
        <form onSubmit={handleBooking} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaCalendar className="inline mr-2" />
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaClock className="inline mr-2" />
                Start Time
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose time...</option>
                {availableTimes.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaClock className="inline mr-2" />
                End Time
              </label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose end time...</option>
                {availableTimes.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              placeholder="Street address"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <select
                value={stateAU}
                onChange={(e) => setStateAU(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select state</option>
                {australianStates.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Instructions (Optional)
            </label>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={3}
              placeholder="Any special requests or instructions..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {selectedService && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">Hourly Rate:</span>
                <span className="font-semibold">
                  ${(selectedService.pricePerHourCents / 100).toFixed(2)}/hour
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">Duration:</span>
                <span className="font-semibold">{calculateDurationHours().toFixed(1)} hours</span>
              </div>
              <div className="border-t border-blue-200 mt-2 pt-2 flex justify-between items-center">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${(calculateTotalPriceCents() / 100).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setShowBookingModal(false)}
              disabled={submittingBooking}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingBooking}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submittingBooking ? 'Submitting...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProviderProfile;
