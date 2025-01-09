import { View, Text, ScrollView } from 'react-native'
import React, { useEffect } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import AsyncStorage from '@react-native-async-storage/async-storage'

const Study = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState

  const getAllAsyncStorageData = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      
      console.log('All AsyncStorage Data:');
      console.log('--------------------');
      items.forEach(([key, value]) => {
        console.log(`${key}:`, value);
      });
      console.log('--------------------');
      
      return items;
      
    } catch (error) {
      console.error('Error getting AsyncStorage data:', error);
      return [];
    }
  };
  useEffect(() => {
    getAllAsyncStorageData(); // Log all storage data
  }, []);

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <ScrollView className="flex-1 p-4">
        <Text className="text-red-500 text-lg font-bold">Error:</Text>
        <Text className="text-red-500">{JSON.stringify(error, null, 2)}</Text>
      </ScrollView>
    )
  }

  return (
    <ScrollView className="flex-1 p-4">
      <Text className="text-lg font-bold mb-2">Dashboard Data:</Text>
      <Text className="font-mono">{JSON.stringify(data, null, 2)}</Text>
      
      <Text className="text-lg font-bold mt-4 mb-2">Full Dashboard State:</Text>
      <Text className="font-mono">{JSON.stringify(dashboardState, null, 2)}</Text>
    </ScrollView>
  )
}

export default Study