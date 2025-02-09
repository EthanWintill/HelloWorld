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

    // Sort all sessions by start_time in descending order
    const sortedSessions = [...data.user_sessions].sort((a, b) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    )

    // Initialize groups array
    const grouped: any[] = []
    
    // Helper function to check if a date falls within a period
    const isDateInPeriod = (date: Date, period: any) => {
      const sessionDate = date.getTime()
      const periodStart = new Date(period.start_date).getTime()
      const periodEnd = new Date(period.end_date).getTime()
      return sessionDate >= periodStart && sessionDate <= periodEnd
    }

    // Get all unique periods
    const allPeriods = data.user_sessions
      .filter(s => s.period_instance)
      .map(s => s.period_instance)
      .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())

    // Process each session
    sortedSessions.forEach(session => {
      const sessionDate = new Date(session.start_time)
      
      // Find the period this session belongs to based on its date
      const matchingPeriod = allPeriods.find(period => 
        isDateInPeriod(sessionDate, period)
      )

      if (matchingPeriod) {
        // Find or create group for this period
        let periodGroup = grouped.find(g => g.period?.id === matchingPeriod.id)
        if (!periodGroup) {
          periodGroup = { period: matchingPeriod, sessions: [] }
          grouped.push(periodGroup)
        }
        periodGroup.sessions.push(session)
      } else {
        // Handle sessions without a matching period
        let otherGroup = grouped.find(g => g.period === null)
        if (!otherGroup) {
          otherGroup = { period: null, sessions: [] }
          grouped.push(otherGroup)
        }
        otherGroup.sessions.push(session)
      }
    })

    // Sort sessions within each group by date
    grouped.forEach(group => {
      group.sessions.sort((a: Session, b: Session) => 
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      )
    })

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