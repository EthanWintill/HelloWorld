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
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#171d16',
          headerTitleStyle: {
            fontFamily: 'Poppins-SemiBold',
            fontWeight: '600',
            fontSize: 17,
          },
          headerShadowVisible: true,
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              className="ml-1 h-10 w-10 rounded-full bg-gg-surfaceContainer items-center justify-center"
            >
              <Ionicons name="arrow-back" size={22} color="#171d16" />
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
          name="setup-checklist" 
          options={{ 
            title: 'Setup Checklist',
          }} 
        />
        <Stack.Screen 
          name="organization" 
          options={{ 
            title: 'Manage Organization',
          }} 
        />
        <Stack.Screen 
          name="study-locations" 
          options={{ 
            title: 'Study Locations',
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
          name="add-user" 
          options={{ 
            title: 'Add New User',
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
