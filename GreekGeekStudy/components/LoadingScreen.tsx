import { View, ActivityIndicator, Text } from 'react-native';
import React from 'react';

export const LoadingScreen = () => (
  <View className="flex-1 justify-center items-center">
    <ActivityIndicator size="large" color="#FFA001" />
    <Text className="mt-4">Loading...</Text>
  </View>
); 