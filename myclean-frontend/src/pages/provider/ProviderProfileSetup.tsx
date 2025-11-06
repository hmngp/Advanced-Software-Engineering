// src/pages/provider/ProviderProfileSetup.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUser,
  FaBriefcase,
  FaDollarSign,
  FaCalendar,
  FaCamera,
  FaClock,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaFilter,
  FaTools,
  FaShieldAlt,
  FaCar,
} from "react-icons/fa";
import Card from "../../components/Card";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

// Get API base URL
const API_BASE = process.env.REACT_APP_API_URL?.replace(/\/+$/, '') || 'http://localhost:4000';

type TimeSlot = {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

type Service = {
  name: string;
  rate: string; // dollars/hour in UI
  selected: boolean;
};

const ProviderProfileSetup: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic Information
  const [fullName, setFullName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [bio, setBio] = useState("");

  // Step 2: Professional Details
  const [yearsExperience, setYearsExperience] = useState("");
  const [hasInsurance, setHasInsurance] = useState(false);
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [hasVehicle, setHasVehicle] = useState(false);
  const [hasEquipment, setHasEquipment] = useState(false);
  const [certifications, setCertifications] = useState("");

  // Step 3: Services & Pricing
  const [services, setServices] = useState<Service[]>([
    { name: "Regular Cleaning", rate: "", selected: false },
    { name: "Deep Cleaning", rate: "", selected: false },
    { name: "Move-in/Move-out Cleaning", rate: "", selected: false },
    { name: "Office Cleaning", rate: "", selected: false },
    { name: "Carpet Cleaning", rate: "", selected: false },
    { name: "Window Cleaning", rate: "", selected: false },
    { name: "Pressure Washing", rate: "", selected: false },
    { name: "Post-Construction Cleaning", rate: "", selected: false },
  ]);

  // Step 4: Availability (UI only for now)
  const [availability, setAvailability] = useState<TimeSlot[]>([
    { day: "Monday", enabled: false, startTime: "09:00", endTime: "17:00" },
    { day: "Tuesday", enabled: false, startTime: "09:00", endTime: "17:00" },
    { day: "Wednesday", enabled: false, startTime: "09:00", endTime: "17:00" },
    { day: "Thursday", enabled: false, startTime: "09:00", endTime: "17:00" },
    { day: "Friday", enabled: false, startTime: "09:00", endTime: "17:00" },
    { day: "Saturday", enabled: false, startTime: "09:00", endTime: "17:00" },
    { day: "Sunday", enabled: false, startTime: "09:00", endTime: "17:00" },
  ]);
  const [maxBookingsPerDay, setMaxBookingsPerDay] = useState("3");
  const [advanceBookingDays, setAdvanceBookingDays] = useState("30");

  // Step 5: Photos & Documents (not sent in this version)
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [workPhotos, setWorkPhotos] = useState<File[]>([]);
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [insuranceDocument, setInsuranceDocument] = useState<File | null>(null);
  
  // Avoid unused variable warnings - files will be implemented in future enhancement
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const filesCollected = { profilePhoto, workPhotos, idDocument, insuranceDocument };

  const handleServiceToggle = (index: number) => {
    setServices((prev) => {
      const copy = [...prev];
      copy[index].selected = !copy[index].selected;
      return copy;
    });
  };

  const handleServiceRate = (index: number, rate: string) => {
    setServices((prev) => {
      const copy = [...prev];
      copy[index].rate = rate;
      return copy;
    });
  };

  const handleAvailabilityToggle = (index: number) => {
    setAvailability((prev) => {
      const copy = [...prev];
      copy[index].enabled = !copy[index].enabled;
      return copy;
    });
  };

  const handleTimeChange = (
    index: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setAvailability((prev) => {
      const copy = [...prev];
      copy[index][field] = value;
      return copy;
    });
  };

  const next = () => setCurrentStep((s) => Math.min(totalSteps, s + 1));
  const prev = () => setCurrentStep((s) => Math.max(1, s - 1));

<<<<<<< HEAD
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('User not logged in');
      return;
    }

    // Validate that at least one service is selected
    const selectedServices = services.filter(s => s.selected && s.rate);
    if (selectedServices.length === 0) {
      setError('Please select at least one service and set its rate');
      return;
    }

    // Validate that at least one day is available
    const enabledDays = availability.filter(a => a.enabled);
    if (enabledDays.length === 0) {
      setError('Please set your availability for at least one day');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profileData = {
        userId: user.id,
        basicInfo: { fullName, phone, address, city, state, zipCode, bio },
        professional: { 
          yearsExperience, 
          hasInsurance, 
          insuranceProvider: hasInsurance ? insuranceProvider : undefined,
          hasVehicle, 
          hasEquipment, 
          certifications: certifications || undefined
        },
        services,
        availability,
        settings: { maxBookingsPerDay, advanceBookingDays },
      };

      console.log('=== PROFILE DATA BEING SENT ===');
      console.log('userId:', user.id);
      console.log('basicInfo:', profileData.basicInfo);
      console.log('professional:', profileData.professional);
      console.log('services:', profileData.services);
      console.log('availability:', profileData.availability);
      console.log('settings:', profileData.settings);
      console.log('=== END PROFILE DATA ===');

      const response = await axios.post(`${API_URL}/api/providers/profile`, profileData);

      if (response.data.success) {
        // Show success message
        alert('🎉 Profile created successfully!\n\n✅ You are now visible to customers searching for cleaning services\n✅ You can start accepting bookings immediately\n✅ Customers in your area can find and book you');
        navigate('/provider/dashboard');
      } else {
        setError('Failed to create profile. Please try again.');
      }
    } catch (err: any) {
      console.error('Profile creation error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Full error object:', JSON.stringify(err.response?.data, null, 2));
      
      if (err.response?.data?.details) {
        // Zod validation errors - show detailed message
        const validationErrors = err.response.data.details;
        console.error('Validation errors:', validationErrors);
        const errorMessages = validationErrors.map((e: any) => 
          `${e.path.join('.')}: ${e.message}`
        ).join('\n');
        setError(`Validation errors:\n${errorMessages}`);
      } else if (err.response?.data?.error) {
        // Show backend error message
        setError(`Error: ${err.response.data.error}`);
      } else {
        setError('Failed to create profile. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
=======
  // === MAIN SUBMIT: saves to /api/providers/me/profile then /api/providers/me/services ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!token) {
        alert("You must be logged in to save your profile. Please log in again.");
        navigate("/login");
        return;
      }

      // 1) Save core provider profile (including phone and name updates)
      console.log("💾 Saving provider profile...");
      await axios.post(`${API_BASE}/api/providers/me/profile`, {
        bio,
        yearsExperience,
        hasInsurance,
        insuranceProvider: hasInsurance ? insuranceProvider : null,
        hasVehicle,
        hasEquipment,
        certifications,
        address,
        city,
        state,
        zipCode,
        phone, // Save phone number to User table
        name: fullName, // Update user's name if changed
        isActive: true,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // 2) Save services (convert dollars -> cents)
      const selected = services
        .filter((s) => s.selected && s.rate.trim() !== "")
        .map((s) => ({
          serviceName: s.name,
          pricePerHour: Math.round(Number(s.rate) * 100), // cents
          durationMin: 60, // default; make configurable if you like
        }));

      console.log("💾 Saving provider services...", selected);
      await axios.post(`${API_BASE}/api/providers/me/services`, { services: selected }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log("✅ Profile saved successfully!");
      alert("Profile created successfully! Redirecting to dashboard...");
      // Refresh the page to ensure profileComplete is updated
      window.location.href = "/provider/home";
    } catch (err: any) {
      console.error("❌ Error saving profile:", err);
      const errorMessage = err.response?.data?.error || err.message || "Unknown error";
      console.error("Error details:", errorMessage);
      alert(`Failed to save profile: ${errorMessage}. Please check the console for details.`);
>>>>>>> upstream/main
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center">
              <FaUser className="mr-3 text-indigo-600" />
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="+61 400 000 000"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaMapMarkerAlt className="inline mr-2" />
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Sydney"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <select
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select State</option>
                  <option value="NSW">New South Wales</option>
                  <option value="VIC">Victoria</option>
                  <option value="QLD">Queensland</option>
                  <option value="WA">Western Australia</option>
                  <option value="SA">South Australia</option>
                  <option value="TAS">Tasmania</option>
                  <option value="ACT">Australian Capital Territory</option>
                  <option value="NT">Northern Territory</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zip Code *
                </label>
                <input
                  type="text"
                  required
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="2000"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio / About You *
                </label>
                <textarea
                  required
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Tell customers about yourself, your experience, and what makes you great at what you do..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  {bio.length}/500 characters
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center">
              <FaBriefcase className="mr-3 text-indigo-600" />
              Professional Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience *
                </label>
                <select
                  required
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select experience</option>
                  <option value="0-1">Less than 1 year</option>
                  <option value="1-3">1-3 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="5-10">5-10 years</option>
                  <option value="10+">10+ years</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="hasInsurance"
                    checked={hasInsurance}
                    onChange={(e) => setHasInsurance(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="hasInsurance"
                    className="ml-2 block text-sm font-medium text-gray-900"
                  >
                    I have liability insurance
                  </label>
                </div>

                {hasInsurance && (
                  <input
                    type="text"
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Insurance provider name"
                  />
                )}
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={hasVehicle}
                    onChange={(e) => setHasVehicle(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    I have my own vehicle
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={hasEquipment}
                    onChange={(e) => setHasEquipment(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    I bring my own cleaning equipment and supplies
                  </span>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certifications (Optional)
                </label>
                <textarea
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="List any relevant certifications, training, or qualifications..."
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center">
              <FaDollarSign className="mr-3 text-indigo-600" />
              Services & Pricing
            </h3>

            <p className="text-gray-600">
              Select the services you offer and set your hourly rate for each.
              You can always update these later.
            </p>

            <div className="space-y-4">
              {services.map((service, index) => (
                <div
                  key={service.name}
                  className="border border-gray-300 rounded-lg p-4 hover:border-indigo-500 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center flex-1">
                      <input
                        type="checkbox"
                        checked={service.selected}
                        onChange={() => handleServiceToggle(index)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {service.name}
                      </span>
                    </label>

                    {service.selected && (
                      <div className="flex items-center">
                        <span className="text-gray-700 mr-2">$</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={service.rate}
                          onChange={(e) => handleServiceRate(index, e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="45"
                          required
                        />
                        <span className="text-gray-700 ml-2">/hour</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <p className="text-sm text-indigo-800">
                <strong>Pricing Tip:</strong> Check local competitors. Typical rates range
                from $35 to $65/hour depending on the service and experience.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center">
              <FaCalendar className="mr-3 text-indigo-600" />
              Set Your Availability
            </h3>

            <p className="text-gray-600">
              Set your weekly schedule. (Saving availability can be added later.)
            </p>

            <div className="space-y-3">
              {availability.map((slot, index) => (
                <div key={slot.day} className="border border-gray-300 rounded-lg p-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={slot.enabled}
                        onChange={() => handleAvailabilityToggle(index)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900 w-24">
                        {slot.day}
                      </span>
                    </label>

                    {slot.enabled && (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center">
                          <FaClock className="text-gray-400 mr-2" />
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) =>
                              handleTimeChange(index, "startTime", e.target.value)
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) =>
                            handleTimeChange(index, "endTime", e.target.value)
                          }
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Bookings Per Day
                </label>
                <select
                  value={maxBookingsPerDay}
                  onChange={(e) => setMaxBookingsPerDay(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="1">1 booking</option>
                  <option value="2">2 bookings</option>
                  <option value="3">3 bookings</option>
                  <option value="4">4 bookings</option>
                  <option value="5">5 bookings</option>
                  <option value="unlimited">Unlimited</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Advance Booking Window
                </label>
                <select
                  value={advanceBookingDays}
                  onChange={(e) => setAdvanceBookingDays(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="7">1 week</option>
                  <option value="14">2 weeks</option>
                  <option value="30">1 month</option>
                  <option value="60">2 months</option>
                  <option value="90">3 months</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  How far in advance can customers book?
                </p>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center">
              <FaCamera className="mr-3 text-indigo-600" />
              Photos & Documents
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  A clear, professional headshot helps build trust with customers.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Portfolio Photos (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setWorkPhotos(Array.from(e.target.files || []))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {workPhotos.length > 0 && (
                  <p className="text-sm text-indigo-600 mt-2">
                    {workPhotos.length} photo(s) selected
                  </p>
                )}
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Verification Documents
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Government-Issued ID (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setIdDocument(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  {hasInsurance && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Insurance Certificate
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setInsuranceDocument(e.target.files?.[0] || null)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

<<<<<<< HEAD
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Photos and documents are optional. You can complete your profile without them and start accepting bookings immediately. You can always upload them later to build more trust with customers.
=======
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                  <p className="text-sm text-yellow-800">
                    <strong>Verification:</strong> Document upload is UI-only in this version.
                    We’ll add file upload endpoints next.
>>>>>>> upstream/main
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Complete Your Provider Profile
          </h1>
          <p className="text-lg text-gray-600">
            Let’s get you set up to start accepting bookings
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-indigo-600">
              {Math.round((currentStep / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

<<<<<<< HEAD
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Form Card */}
=======
        {/* Form */}
>>>>>>> upstream/main
        <Card>
          <form
            onSubmit={currentStep === totalSteps ? handleSubmit : (e) => e.preventDefault()}
          >
            {renderStep()}

            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={prev}
                disabled={currentStep === 1}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={next}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                >
                  Next Step
                  <FaCheckCircle className="ml-2" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Saving Profile...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle className="mr-2" />
                      Complete Profile
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </Card>

        {/* Step badges */}
        <div className="mt-8 grid grid-cols-5 gap-4">
          {["Basic Info", "Professional", "Services", "Availability", "Photos"].map(
            (label, i) => (
              <div
                key={label}
                className={`text-center p-3 rounded-lg transition-colors ${
                  currentStep === i + 1
                    ? "bg-indigo-600 text-white"
                    : currentStep > i + 1
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <div className="font-medium text-sm">{label}</div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderProfileSetup;
