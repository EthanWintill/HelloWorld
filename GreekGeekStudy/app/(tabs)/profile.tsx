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
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="bg-white mx-4 mt-4 p-8 rounded-2xl shadow-sm">
          <View className="items-center mb-6">
            <View className="bg-green-100 p-6 rounded-full mb-4 relative">
              <Ionicons name="person" size={48} color="#16A34A" />
              {/* Live indicator */}
              {data.live && (
                <View className="absolute -top-1 -right-1 bg-red-500/75 w-5 h-5 rounded-full border-2 border-white" />
              )}
            </View>
            <Text className="text-3xl font-bold text-gray-900 text-center mb-2">
              {data.first_name} {data.last_name}
            </Text>
            {data.is_staff && (
              <View className="bg-green-600 px-4 py-2 rounded-full">
                <Text className="text-white font-semibold">Staff Member</Text>
              </View>
            )}
          </View>
        </View>

        <View className="px-4 mt-4">
          {/* Admin Dashboard */}
          {data.is_staff && (
            <TouchableOpacity 
              onPress={navigateToAdmin}
              className="bg-green-600 p-6 rounded-2xl shadow-sm mb-8"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="bg-white/20 p-3 rounded-full mr-4">
                    <Ionicons name="settings" size={28} color="white" />
                  </View>
                  <View>
                    <Text className="text-white font-bold text-xl">Admin Dashboard</Text>
                    <Text className="text-white/90 text-base">Manage your organization settings</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={28} color="white" />
              </View>
            </TouchableOpacity>
          )}

          {/* Contact Information */}
          <View className="bg-white p-6 rounded-2xl shadow-sm mb-8">
            <Text className="text-xl font-bold text-gray-900 mb-6">Contact Information</Text>
            
            <View className="space-y-4">
              <View className="flex-row items-center p-4 bg-gray-50 rounded-xl">
                <View className="bg-green-100 p-3 rounded-full mr-4">
                  <Ionicons name="mail" size={24} color="#16A34A" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Email Address</Text>
                  <Text className="text-gray-900 font-medium text-lg">{data.email}</Text>
                </View>
              </View>
              
              <View className="flex-row items-center p-4 bg-gray-50 rounded-xl">
                <View className="bg-green-100 p-3 rounded-full mr-4">
                  <Ionicons name="call" size={24} color="#16A34A" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Phone Number</Text>
                  <Text className="text-gray-900 font-medium text-lg">{data.phone_number}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Organization Information */}
          <View className="bg-white p-6 rounded-2xl shadow-sm mb-8">
            <Text className="text-xl font-bold text-gray-900 mb-6">Organization</Text>
            
            <View className="flex-row items-center p-4 bg-gray-50 rounded-xl">
              <View className="bg-green-100 p-3 rounded-full mr-4">
                <Ionicons name="business" size={24} color="#16A34A" />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-500 mb-1">Organization Name</Text>
                <Text className="text-gray-900 font-medium text-xl">{data.org?.name}</Text>
              </View>
            </View>
          </View>

          {/* Group Information */}
          {data.group && (
            <View className="bg-white p-6 rounded-2xl shadow-sm mb-8">
              <Text className="text-xl font-bold text-gray-900 mb-6">Group</Text>
              
              <View className="flex-row items-center p-4 bg-gray-50 rounded-xl">
                <View className="bg-green-100 p-3 rounded-full mr-4">
                  <Ionicons name="people" size={24} color="#16A34A" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Group Name</Text>
                  <Text className="text-gray-900 font-medium text-xl">{data.group.name}</Text>
                </View>
              </View>
            </View>
          )}

        </View>

        {/* Sign Out Button */}
        <View className="px-4 pt-8 pb-8">
          <TouchableOpacity 
            onPress={signout}
            className="bg-white p-6 rounded-2xl shadow-sm border-2 border-red-200"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={24} color="#EF4444" />
              <Text className="text-red-500 font-bold text-xl ml-3">Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Profile

const styles = StyleSheet.create({})