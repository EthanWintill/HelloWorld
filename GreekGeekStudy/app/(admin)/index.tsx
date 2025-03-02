import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'

interface AdminMenuItemProps {
  title: string;
  icon: any;
  route: string;
  description: string;
}

const AdminMenuItem: React.FC<AdminMenuItemProps> = ({ title, icon, route, description }) => {
  const router = useRouter()
  
  return (
    <TouchableOpacity 
      className="bg-white rounded-lg shadow-sm p-4 mb-4 flex-row items-center"
      onPress={() => router.push(route as any)}
    >
      <View className="bg-green-100 p-3 rounded-full mr-4">
        <Ionicons name={icon} size={24} color="#16A34A" />
      </View>
      <View className="flex-1">
        <Text className="text-lg font-psemibold text-gray-800">{title}</Text>
        <Text className="text-gray-600">{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  )
}

const AdminDashboard = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState
  
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

  // Check if user is admin
  if (!data.is_staff) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-4">
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text className="text-xl font-psemibold text-center mt-4 mb-2">Access Denied</Text>
        <Text className="text-gray-600 text-center">You don't have permission to access the admin panel.</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 p-4">
        

        <Text className="text-lg font-psemibold mb-3 text-gray-800">Organization Management</Text>
        
        <AdminMenuItem 
          title="Organization Settings" 
          icon="business" 
          route="/(admin)/organization" 
          description="Manage organization name, registration code, and school"
        />
        
        <AdminMenuItem 
          title="Manage Groups" 
          icon="people" 
          route="/(admin)/groups" 
          description="Create, edit, and assign users to groups"
        />

        <Text className="text-lg font-psemibold mb-3 mt-4 text-gray-800">User Management</Text>
        
        <AdminMenuItem 
          title="Manage Users" 
          icon="person" 
          route="/(admin)/users" 
          description="View and edit user information"
        />

        <Text className="text-lg font-psemibold mb-3 mt-4 text-gray-800">Study Management</Text>
        
        <AdminMenuItem 
          title="Study Periods" 
          icon="calendar" 
          route="/(admin)/study-periods" 
          description="Create and manage study periods and requirements"
        />
        
        <AdminMenuItem 
          title="Reports" 
          icon="bar-chart" 
          route="/(admin)/reports" 
          description="View reports for current and previous study periods"
        />

        <Text className="text-lg font-psemibold mb-3 mt-4 text-gray-800">Settings</Text>
        
        <AdminMenuItem 
          title="Admin Settings" 
          icon="settings" 
          route="/(admin)/settings" 
          description="Configure study verification and other settings"
        />
      </ScrollView>
    </SafeAreaView>
  )
}

export default AdminDashboard 