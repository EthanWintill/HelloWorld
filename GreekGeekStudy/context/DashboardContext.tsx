import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';
import { router } from 'expo-router';
import { API_URL } from '@/constants';
import eventEmitter, { EVENTS } from '@/services/EventEmitter';

type DashboardState = {
  isLoading: boolean;
  error: string | null;
  data: any | null;
};

type DashboardContextType = {
  dashboardState: DashboardState;
  refreshDashboard: () => Promise<void>;
  checkIsStudying: () => boolean;
  handleUnauthorized: () => Promise<void>;
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    isLoading: true,
    error: null,
    data: null,
  });

  const handleUnauthorized = async () => {
    try {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'dashboardData']);
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');

      const response = await axios.get(API_URL + 'api/dashboard/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setDashboardState(prev => ({
        isLoading: false,
        error: null,
        data: response.data,
      }));
      console.log(response.data.org_locations);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        console.log(error.response)
        await handleUnauthorized();
      }
      
      setDashboardState(prev => ({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
        data: prev.data,
      }));
    }
  };

  const refreshDashboard = async () => {
    setDashboardState(prev => ({ 
      ...prev, 
      isLoading: true,
    }));
    await fetchDashboardData();
  };

  const checkIsStudying = (): boolean => {
    const { data } = dashboardState;
    if (data && data.user_sessions && data.user_sessions.length > 0) {
      const lastSession = data.user_sessions[data.user_sessions.length - 1];
      
      return lastSession.hours === null;
    }
    return false;
  };

  useEffect(() => {
    // Initial data fetch
    fetchDashboardData();
    
    // Subscribe to dashboard refresh events
    const unsubscribe = eventEmitter.subscribe(EVENTS.DASHBOARD_REFRESH, () => {
      console.log('Dashboard refresh event received');
      refreshDashboard();
    });
    
    // Clean up subscription when component unmounts
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <DashboardContext.Provider value={{dashboardState, refreshDashboard, checkIsStudying, handleUnauthorized }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}; 