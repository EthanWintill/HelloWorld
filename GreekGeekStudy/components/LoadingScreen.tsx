import { View, ActivityIndicator, Text, Image } from 'react-native';
import React from 'react';

export const LoadingScreen = () => (
  <View className="flex-1 justify-center items-center bg-gg-bg">
    <Image
      source={require('../assets/images/loading-logo.png')}
      className="h-24 w-24 mb-6"
      resizeMode="contain"
    />
    <ActivityIndicator size="large" color="#006b2c" />
    <Text className="mt-4 font-pregular text-gg-muted">Loading...</Text>
  </View>
);
