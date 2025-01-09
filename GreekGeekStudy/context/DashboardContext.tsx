import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';
import { router } from 'expo-router';
import { API_URL } from '@/constants';

type DashboardState = {
  isLoading: boolean;
  error: string | null;
  data: any | null;
};

type DashboardContextType = {
  dashboardState: DashboardState;
  refreshDashboard: () => Promise<void>;
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

      console.log("TOKEN ", token)


      const response = await axios.get(API_URL + 'api/dashboard/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await AsyncStorage.setItem('dashboardData', JSON.stringify(response.data));
      
      setDashboardState({
        isLoading: false,
        error: null,
        data: response.data,
      });
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        console.log(error.response)
        await handleUnauthorized();
      }
      
      setDashboardState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
        data: null,
      });
    }
  };

  const refreshDashboard = async () => {
    setDashboardState(prev => ({ ...prev, isLoading: true }));
    await fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <DashboardContext.Provider value={{ dashboardState, refreshDashboard }}>
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