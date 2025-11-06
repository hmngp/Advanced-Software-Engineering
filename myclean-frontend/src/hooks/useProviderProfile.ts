// Hook to check if provider profile is complete
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

interface ProviderProfileResponse {
  success: boolean;
  profile: {
    profileComplete: boolean;
  };
}

export const useProviderProfile = () => {
  const { user, isProvider, token } = useAuth();
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isProvider || !user || !token) {
      setProfileComplete(null);
      setLoading(false);
      return;
    }

    // Check if provider profile is complete
    const checkProfile = async () => {
      try {
        const API_BASE = process.env.REACT_APP_API_URL?.replace(/\/+$/, '') || 'http://localhost:4000';
        const response = await axios.get<ProviderProfileResponse>(`${API_BASE}/api/providers/me/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setProfileComplete(response.data.profile?.profileComplete ?? false);
      } catch (error) {
        // If profile doesn't exist or error, assume incomplete
        console.error('Error checking profile:', error);
        setProfileComplete(false);
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, [user, isProvider, token]);

  return { profileComplete, loading };
};

