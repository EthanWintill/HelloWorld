import { View, ActivityIndicator, Text } from 'react-native';
import React from 'react';

export const LoadingScreen = () => (
  <View className="flex-1 justify-center items-center bg-gg-bg">
    <ActivityIndicator size="large" color="#006b2c" />
    <Text className="mt-4 font-pregular text-gg-muted">Loading...</Text>
  </View>
);
