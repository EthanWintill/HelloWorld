import { StyleSheet, Text, View } from 'react-native'
import { SplashScreen, Stack, useRouter } from 'expo-router'
import React from 'react'
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';

import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function _layout() {
  const router = useRouter();
  const [fontsLoaded, error] = useFonts({
    "Poppins-Black": require("../assets/fonts/Poppins-Black.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-ExtraBold": require("../assets/fonts/Poppins-ExtraBold.ttf"),
    "Poppins-ExtraLight": require("../assets/fonts/Poppins-ExtraLight.ttf"),
    "Poppins-Light": require("../assets/fonts/Poppins-Light.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Thin": require("../assets/fonts/Poppins-Thin.ttf"),
  });

  useEffect(() => {
    const checkAuthAndNavigate = async () => {
      if (!fontsLoaded) return;
      
      try {
        const keys = await AsyncStorage.getAllKeys();
        const items = await AsyncStorage.multiGet(keys);
        console.log('All AsyncStorage Items:', items);
        
        const accessToken = await AsyncStorage.getItem('accessToken');
        console.log('AccessToken:', accessToken);
        
        if (accessToken) {
          router.replace('/(tabs)/study');
        }
        
        // Hide splash screen after checking auth
        SplashScreen.hideAsync();
        
      } catch (error) {
        console.error('Error reading AsyncStorage:', error);
        SplashScreen.hideAsync();
      }
    };

    if (error) throw error;
    checkAuthAndNavigate();
  }, [fontsLoaded, error, router]);

  if (!fontsLoaded && !error) return null;
  return (
    <>
      <Stack>
        <Stack.Screen name='index' options={{headerShown: false}}/>
        <Stack.Screen name='(auth)' options={{headerShown: false}}/>
        <Stack.Screen name='(tabs)' options={{headerShown: false}}/>
        
      </Stack>
      <StatusBar style="dark" />
    </>
    
  )
}

const styles = StyleSheet.create({
  container:{
    display:'flex',
    flex:1,
    alignItems: 'center',
    justifyContent: 'center'
  }
})