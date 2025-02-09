import { View, Text, ScrollView } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaView } from 'react-native-safe-area-context'
import numberToWords from 'number-to-words';
import Geolocation from 'react-native-geolocation-service';
import * as Location from 'expo-location'


const Study = () => {
  const {startInterval, stopInterval, dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState
  const [locationGranted, setLocationGranted] = useState('UNKNOWN');


  const handleLocationPermission = async () => {
    const res = await Location.requestForegroundPermissionsAsync();
    console.log('Location Permission:', res);
    if (res.status === 'granted') {
      setLocationGranted('GRANTED');
    } else if (!res.canAskAgain){
      setLocationGranted('BLOCKED');
    } else {
      setLocationGranted('DENIED');
    }
  };

  const startStudying = () => {
    handleLocationPermission();
    startInterval('kkk');
    setTimeout(() => {
      stopInterval();
    }, 10000);
  }
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
  const studyHoursLeft = () => {
    const hoursSoFar = data['user_sessions'].reduce((acc: number, session: any) => acc + session['hours'], 0);
    return numberToWords.toWords(data['org']['study_req'] - hoursSoFar);
  }

  useEffect(() => {
    getAllAsyncStorageData(); // Log all storage data
    handleLocationPermission();
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
    <SafeAreaView className="flex-1 flex-col">
      <View className='basis-2/3'>
      <View className="flex-1 justify-center items-center">
        <View className="w-16 h-16 bg-gray-500 rounded-full justify-center items-center" onTouchEnd={() => {startStudying()}}>
          {locationGranted==='GRANTED' || locationGranted==='DENIED' ? (
            <Text className="text-white text-lg">Start</Text>
          ) : (
            <Text className="text-white text-lg">Please enable locations</Text>
          )}
        </View>
      </View>
      </View>
      <View className='basis-1/3'>
        <Text className="text-center text-xl">
          <Text className="font-bold underline text-green-600">{studyHoursLeft()}</Text> more hours to reach goal of <Text className="font-bold underline text-green-600">{numberToWords.toWords(data['org']['study_req'])}</Text> hours per week
        </Text>
      </View>
    </SafeAreaView>
  )
}

export default Study