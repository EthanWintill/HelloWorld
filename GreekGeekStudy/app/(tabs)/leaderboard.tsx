import { View, Text, ScrollView, SafeAreaView } from 'react-native'
import React from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
}

const Leaderboard = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1">
        <ScrollView className="p-4">
          <Text className="text-red-500 text-lg font-bold">Error:</Text>
          <Text className="text-red-500">{JSON.stringify(error, null, 2)}</Text>
        </ScrollView>
      </SafeAreaView>
    )
  }

  const otherUsers = data?.org_users?.filter((user: User) => user.id !== data.id) || []

  return (
    <SafeAreaView className="flex-1">
      <ScrollView className="p-4">
        <Text className="text-xl font-bold mb-4">Organization Members</Text>
        {otherUsers.map((user: User) => (
          <View key={user.id} className="bg-white p-4 mb-2 rounded-lg shadow">
            <Text className="font-bold">
              {user.first_name} {user.last_name}
            </Text>
            <Text className="text-gray-600">{user.email}</Text>
            {user.is_staff && (
              <Text className="text-blue-600">Staff Member</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

export default Leaderboard