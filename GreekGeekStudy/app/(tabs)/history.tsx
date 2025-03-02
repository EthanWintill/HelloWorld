import { View, Text, ScrollView, SafeAreaView, Image } from 'react-native'
import React from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { images } from "@/constants"

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
  const getActivePeriodInstance = () => {
    if (!data?.org_period_instances) return null;
    return data.org_period_instances.find(
      (instance: any) => instance.is_active
    );
  }

  const hoursStudied = () => {
    if (!data?.user_sessions) return 0;

    const activePeriodInstance = getActivePeriodInstance();
    
    // If no active period, sum all sessions
    if (!activePeriodInstance) {
      return data.user_sessions.reduce(
        (acc: number, session: any) => acc + (session.hours || 0), 
        0
      );
    }
    const periodSessions = data.user_sessions.filter(
      (session: any) => 
        session.period_instance?.id === activePeriodInstance.id
    );

    return periodSessions.reduce(
      (acc: number, session: any) => acc + (session.hours || 0),
      0
    );
  }

  const getRequiredHours = () => {
    if (!data?.active_period_setting) return 0;
    return data.active_period_setting.required_hours;
  }

  const getHoursColor = (hours: number) => {
    const requiredHours = getRequiredHours();
    
    // If no required hours or we've met the requirement, use green
    if (requiredHours === 0 || hours >= requiredHours) {
      return "text-green-600";
    }
    
    // If within 1 hour of the requirement, use orange
    if (hours >= requiredHours - 1) {
      return "text-orange-500";
    }
    
    // Otherwise use red
    return "text-red-500";
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

  // Calculate total hours studied
  

  return (
    <SafeAreaView className="bg-white flex-1">
      {/* Header Bar */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center">
          <Image
            source={images.logoSmall}
            className="w-10 h-10"
            resizeMode="contain"
          />
          <Text className="font-psemibold text-lg ml-1">
            {data?.org?.name || 'Organization'}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="font-psemibold text-gray-600 text-lg">
            {data?.first_name} {data?.last_name?.[0]}.
          </Text>
          <Text className="font-psemibold text-green-600 text-2xl">
            {hoursStudied().toFixed(0)}h
          </Text>
        </View>
      </View>

      {/* Main content */}
      <ScrollView className="p-4">
        <Text className="text-xl font-bold mb-6 text-center">Study History</Text>
        
        {groupSessionsByPeriod().map((group, index, array) => {
          // Calculate total hours for this group
          const groupHours = group.sessions
            .filter((s: Session) => s.hours !== null)
            .reduce((total: number, s: Session) => total + Number(s.hours), 0);
            
          // Determine color based on hours compared to requirement
          const hoursColor = getHoursColor(groupHours);
          
          return (
            <View key={group.period?.id || `no-period-${index}`} className="mb-6">
              {(group.period || (index > 0 && !group.period)) && (
                <View className="flex-row justify-between items-center mb-3 pb-2 border-b border-gray-200">
                  <Text className="text-lg font-semibold text-gray-700">
                    {group.period 
                      ? formatPeriodDates(group.period.start_date, group.period.end_date)
                      : "Other Sessions"
                    }
                  </Text>
                  <Text className={`text-lg font-semibold ${hoursColor}`}>
                    {groupHours.toFixed(2)} hrs
                  </Text>
                </View>
              )}
              {group.sessions.map((session: Session) => (
                <View key={session.id} className="bg-gray-50 p-4 mb-3 rounded-lg shadow-sm border border-gray-100">
                  <Text className="font-bold mb-1 text-gray-800">
                    {formatDate(session.start_time)}
                  </Text>
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-600">
                      Location: {getLocationName(session.location)}
                    </Text>
                    {session.hours === null ? (
                      <Text className="text-green-600 font-semibold">IN PROGRESS</Text>
                    ) : (
                      <Text className="text-gray-800 font-semibold">
                        {Number(session.hours).toFixed(2)} hrs
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          );
        })}
        
        {(!data?.user_sessions || data.user_sessions.length === 0) && (
          <View className="items-center justify-center py-10">
            <Text className="text-gray-500 text-center italic">
              No study sessions recorded yet
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default History