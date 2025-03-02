import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native'
import React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'

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

  const navigateToAdmin = () => {
    router.push('/(admin)');
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
        <View>
          <View className="bg-white p-4 rounded-lg shadow mb-4">
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

          {data.is_staff && (
            <TouchableOpacity 
              onPress={navigateToAdmin}
              className="bg-green-600 p-4 rounded-lg shadow mb-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <Ionicons name="settings-outline" size={24} color="white" />
                <Text className="text-white font-bold text-lg ml-2">Admin Dashboard</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="white" />
            </TouchableOpacity>
          )}

          <View className="bg-white p-4 rounded-lg shadow mb-4">
            <Text className="text-lg font-bold mb-3">Account Settings</Text>
            
            <TouchableOpacity className="flex-row items-center py-2 border-b border-gray-200">
              <Ionicons name="person-outline" size={20} color="#4B5563" className="mr-2" />
              <Text className="text-gray-700 ml-2">Edit Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-row items-center py-2 border-b border-gray-200">
              <Ionicons name="lock-closed-outline" size={20} color="#4B5563" className="mr-2" />
              <Text className="text-gray-700 ml-2">Change Password</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-row items-center py-2 border-b border-gray-200">
              <Ionicons name="notifications-outline" size={20} color="#4B5563" className="mr-2" />
              <Text className="text-gray-700 ml-2">Notification Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-row items-center py-2">
              <Ionicons name="help-circle-outline" size={20} color="#4B5563" className="mr-2" />
              <Text className="text-gray-700 ml-2">Help & Support</Text>
            </TouchableOpacity>
          </View>
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