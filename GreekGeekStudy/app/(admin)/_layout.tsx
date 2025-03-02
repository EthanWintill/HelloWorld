import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { DashboardProvider } from '../../context/DashboardContext'

const AdminLayout = () => {
  const router = useRouter()

  return (
    <DashboardProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#16A34A',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              className="ml-2"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          ),
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Admin Dashboard',
          }} 
        />
        <Stack.Screen 
          name="organization" 
          options={{ 
            title: 'Manage Organization',
          }} 
        />
        <Stack.Screen 
          name="groups" 
          options={{ 
            title: 'Manage Groups',
          }} 
        />
        <Stack.Screen 
          name="users" 
          options={{ 
            title: 'Manage Users',
          }} 
        />
        <Stack.Screen 
          name="user-detail" 
          options={{ 
            title: 'User Details',
          }} 
        />
        <Stack.Screen 
          name="study-periods" 
          options={{ 
            title: 'Study Periods',
          }} 
        />
        <Stack.Screen 
          name="reports" 
          options={{ 
            title: 'Reports',
          }} 
        />
        <Stack.Screen 
          name="settings" 
          options={{ 
            title: 'Admin Settings',
          }} 
        />
      </Stack>
    </DashboardProvider>
  )
}

export default AdminLayout 