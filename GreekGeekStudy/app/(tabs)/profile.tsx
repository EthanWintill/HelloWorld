import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const Profile = () => {
  const signout = async () => {
    try {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'dashboardData']);
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  };

  return (
    <View className="flex-1 justify-center items-center">
      <TouchableOpacity 
        onPress={signout}
        className="bg-red-500 px-8 py-3 rounded-lg"
      >
        <Text className="text-white font-bold text-lg">Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}

export default Profile

const styles = StyleSheet.create({})