import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native'
import React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'

const Profile = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState

  const signout = async () => {
    try {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'dashboardData']);
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  };

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
    <SafeAreaView className="flex-1">
      <View className="flex-1 justify-between p-4">
        <View className="bg-white p-4 rounded-lg shadow">
          <Text className="text-2xl font-bold mb-2">
            {data.first_name} {data.last_name}
          </Text>
          <Text className="text-gray-600 mb-1">{data.email}</Text>
          <Text className="text-gray-600 mb-1">{data.phone_number}</Text>
          {data.is_staff && (
            <Text className="text-blue-600 font-semibold">Staff Member</Text>
          )}
          <Text className="text-gray-600 mt-2 font-semibold">
            Organization: {data.org?.name}
          </Text>
        </View>

        <TouchableOpacity 
          onPress={signout}
          className="bg-red-500 px-8 py-3 rounded-lg"
        >
          <Text className="text-white font-bold text-lg text-center">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default Profile

const styles = StyleSheet.create({})