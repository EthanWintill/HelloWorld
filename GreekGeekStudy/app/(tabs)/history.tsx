import { View, Text, ScrollView, SafeAreaView } from 'react-native'
import React from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'

interface Location {
  id: number;
  name: string;
}

interface Session {
  id: number;
  start_time: string;
  hours: number;
  location: number;
}

const History = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getLocationName = (locationId: number) => {
    const location = data?.org_locations?.find((loc: Location) => loc.id === locationId)
    return location ? location.name : 'N/A'
  }

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

  return (
    <SafeAreaView className="flex-1">
      <ScrollView className="p-4">
        <Text className="text-xl font-bold mb-4">Study Sessions</Text>
        {data?.user_sessions?.map((session: Session) => (
          <View key={session.id} className="bg-white p-4 mb-2 rounded-lg shadow">
            <Text className="font-bold mb-1">
              {formatDate(session.start_time)}
            </Text>
            <Text className="text-gray-600">
              {session.hours === null 
                ? "IN PROGRESS"
                : `Hours: ${Number(session.hours).toFixed(2)}`
              }
            </Text>
            <Text className="text-gray-600">
              Location: {getLocationName(session.location)}
            </Text>
          </View>
        ))}
        {(!data?.user_sessions || data.user_sessions.length === 0) && (
          <Text className="text-gray-500 text-center italic">
            No study sessions recorded yet
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default History