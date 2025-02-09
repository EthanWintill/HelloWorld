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

  const formatPeriodDates = (start: string, end: string) => {
    return `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`
  }

  const getLocationName = (locationId: number) => {
    const location = data?.org_locations?.find((loc: Location) => loc.id === locationId)
    return location ? location.name : 'N/A'
  }

  const groupSessionsByPeriod = () => {
    if (!data?.user_sessions) return []

    // Sort sessions by start_time in descending order
    const sortedSessions = [...data.user_sessions].sort((a, b) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    )

    // Group sessions by period_instance
    const grouped = sortedSessions.reduce((acc: any[], session) => {
      if (!session.period_instance) {
        if (!acc.find(g => g.period === null)) {
          acc.push({ period: null, sessions: [] })
        }
        acc.find(g => g.period === null).sessions.push(session)
      } else {
        const existingGroup = acc.find(g => g.period?.id === session.period_instance.id)
        if (existingGroup) {
          existingGroup.sessions.push(session)
        } else {
          acc.push({
            period: session.period_instance,
            sessions: [session]
          })
        }
      }
      return acc
    }, [])

    return grouped
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
        {groupSessionsByPeriod().map((group, index, array) => (
          <View key={group.period?.id || `no-period-${index}`}>
            {(group.period || (index > 0 && !group.period)) && (
              <Text className="text-lg font-semibold text-center my-4 text-gray-600">
                {group.period 
                  ? formatPeriodDates(group.period.start_date, group.period.end_date)
                  : "Other"
                }
              </Text>
            )}
            {group.sessions.map((session: Session) => (
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