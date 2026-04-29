import { View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { EmptyState } from '../../components/Design'

interface Location {
  id: number;
  name: string;
  gps_lat?: number;
  gps_long?: number; 
  gps_radius?: number;
  gps_address?: string;
}

interface Session {
  id: number;
  start_time: string;
  hours: number | null;
  location: number | Location | null;
  period_instance?: PeriodInstance | null;
}

interface PeriodInstance {
  id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const History = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState

  const getLocationName = (locationValue: number | Location | null) => {
    if (!locationValue) return 'Manual Entry'
    if (typeof locationValue === 'object') return locationValue.name
    const locationId = locationValue
    const location = data?.org_locations?.find((loc: Location) => loc.id === locationId)
    return location ? location.name : 'N/A'
  }

  const getSortedSessions = () => {
    if (!data?.user_sessions) return []
    return [...data.user_sessions].sort((a: Session, b: Session) =>
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    )
  }

  const formatSessionDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatSessionTime = (dateString: string, hours: number | null) => {
    const startDate = new Date(dateString)
    const start = startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

    if (hours === null) return `${start} - In progress`

    const endDate = new Date(startDate.getTime() + Number(hours) * 60 * 60 * 1000)
    const end = endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return `${start} - ${end}`
  }

  const formatDuration = (hours: number | null) => {
    if (hours === null) return 'Live'

    const totalMinutes = Math.round(Number(hours) * 60)
    const wholeHours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    if (wholeHours === 0) return `${minutes}m`
    if (minutes === 0) return `${wholeHours}h`
    return `${wholeHours}h ${minutes}m`
  }

  const formatDeadline = (date?: Date) => {
    if (!date) return 'Not set'
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
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

  // Add study progress functions
  const requiredHours = () => {
    if (!data?.active_period_setting) return 0;
    return Number(data.active_period_setting.required_hours);
  }

  const studyHoursLeft = () => {
    const required = requiredHours();
    const studied = hoursStudied();
    return Math.max(0, required - studied);
  }

  const calculatePercentComplete = () => {
    const required = requiredHours();
    if (required === 0) return 0;

    const studied = hoursStudied();
    return Math.min(Math.round((studied / required) * 100), 100);
  }

  const getPeriodLabel = () => {
    const activePeriod = getActivePeriodInstance()
    if (activePeriod?.start_date && activePeriod?.end_date) {
      const start = new Date(activePeriod.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      const end = new Date(activePeriod.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      return `${start} - ${end}`
    }

    return getActivePeriodInfo()?.description || 'Current Period'
  }

  const getActivePeriodInfo = () => {
    if (!data?.active_period_setting || !data?.org_period_instances) return null;

    const activePeriodInstance = data.org_period_instances.find(
      (instance: any) => instance.is_active
    );

    if (!activePeriodInstance) return null;

    // Handle potential timezone issues by ensuring consistent date parsing
    const endDate = new Date(activePeriodInstance.end_date);
    const now = new Date();
    
    // Calculate the difference in milliseconds
    const timeDifference = endDate.getTime() - now.getTime();
    const hoursRemaining = Math.max(0, timeDifference / (1000 * 60 * 60));
    
    // For days calculation, we want to know how many calendar days are left
    // Reset both dates to start of day for accurate day comparison
    const endDateStartOfDay = new Date(endDate);
    endDateStartOfDay.setHours(0, 0, 0, 0);
    
    const nowStartOfDay = new Date(now);
    nowStartOfDay.setHours(0, 0, 0, 0);
    
    const daysDifference = (endDateStartOfDay.getTime() - nowStartOfDay.getTime()) / (1000 * 60 * 60 * 24);
    const daysRemaining = Math.max(0, Math.ceil(daysDifference));

    // Show days only if we have more than 24 hours remaining OR if it's due today/tomorrow
    const shouldShowDays = hoursRemaining >= 24 || daysRemaining >= 1;

    const periodSetting = data.active_period_setting;
    let periodDescription = '';

    switch (periodSetting.period_type) {
      case 'weekly':
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        periodDescription = `Weekly period (Due ${days[periodSetting.due_day_of_week]})`;
        break;
      case 'monthly':
        periodDescription = 'Monthly period';
        break;
      case 'custom':
        periodDescription = `${periodSetting.custom_days}-day period`;
        break;
    }

    return {
      description: periodDescription,
      shouldShowDays,
      daysRemaining,
      hoursRemaining: Math.round(hoursRemaining),
      endDate
    };
  };

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1">
        <ScrollView className="p-4">
          <Text className="text-gg-error text-lg font-bold">Error:</Text>
          <Text className="text-gg-error">{JSON.stringify(error, null, 2)}</Text>
        </ScrollView>
      </SafeAreaView>
    )
  }

  const sessions = getSortedSessions()
  const periodInfo = getActivePeriodInfo()

  return (
    <SafeAreaView className="bg-gg-bg flex-1">
      <ScrollView
        className="flex-1 px-4 pt-6"
        contentContainerStyle={{ paddingBottom: 128 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl overflow-hidden relative mb-6">
          <View className="absolute left-0 top-0 bottom-0 w-1 bg-gg-primary" />
          <View className="p-6">
            <View className="flex-row justify-between items-start mb-2">
              <Text className="font-psemibold text-xs uppercase tracking-wider text-gg-muted flex-1 pr-4">
                {getPeriodLabel()}
              </Text>
              <View className="bg-gg-surfaceLow px-2 py-1 rounded-full">
                <Text className="font-pregular text-xs text-gg-primary">Active</Text>
              </View>
            </View>

            <View className="flex-row items-baseline mb-2">
              <Text className="text-[32px] font-pbold text-gg-text tracking-tight">
                {hoursStudied().toFixed(1)}
              </Text>
              <Text className="text-gg-muted font-pmedium ml-1">
                / {requiredHours().toFixed(1)} hrs
              </Text>
            </View>

            <View className="w-full h-1 bg-gg-surfaceHigh rounded-full overflow-hidden mb-4">
              <View
                className="h-full bg-gg-primary rounded-full"
                style={{ width: `${calculatePercentComplete()}%` }}
              />
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 pr-3">
                <Ionicons name="calendar-outline" size={16} color="#3e4a3d" />
                <Text className="font-pregular text-xs text-gg-muted ml-1">
                  Deadline: {formatDeadline(periodInfo?.endDate)}
                </Text>
              </View>
              <Text className="font-pmedium text-xs text-gg-muted">
                {calculatePercentComplete()}% Complete
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center justify-between mb-2">
          <Text className="font-psemibold text-[17px] leading-6 text-gg-text">Study Sessions</Text>
          <TouchableOpacity className="flex-row items-center px-3 py-2 rounded-lg bg-gg-surface border border-gg-outlineVariant">
            <Text className="font-pmedium text-sm text-gg-muted mr-1">Filter</Text>
            <Ionicons name="filter-outline" size={16} color="#3e4a3d" />
          </TouchableOpacity>
        </View>

        {sessions.map((session: Session, index: number) => {
          const iconNames = ['book-outline', 'school-outline', 'desktop-outline', 'library-outline'] as const
          const iconName = iconNames[index % iconNames.length]

          return (
            <View
              key={session.id}
              className="bg-gg-surface border border-gg-outlineVariant rounded-lg p-4 mb-2 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 pr-3">
                <View className="w-10 h-10 rounded-full bg-gg-surfaceContainer items-center justify-center mr-3">
                  <Ionicons name={iconName} size={20} color="#006b2c" />
                </View>

                <View className="flex-1">
                  <Text className="font-psemibold text-[15px] leading-5 text-gg-text" numberOfLines={1}>
                    {formatSessionDate(session.start_time)}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="location-outline" size={14} color="#3e4a3d" />
                    <Text className="font-pregular text-xs leading-4 text-gg-muted ml-1 flex-1" numberOfLines={1}>
                      {getLocationName(session.location)}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="items-end">
                <Text className="font-psemibold text-base leading-5 text-gg-primary">
                  {formatDuration(session.hours)}
                </Text>
                <Text className="font-pregular text-xs leading-4 text-gg-muted mt-1">
                  {formatSessionTime(session.start_time, session.hours)}
                </Text>
              </View>
            </View>
          )
        })}

        {sessions.length === 0 && (
          <View className="bg-gg-surface border border-gg-outlineVariant rounded-lg p-6 mt-2">
            <EmptyState icon="time-outline" title="No sessions yet" message="Completed study sessions will appear here." />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default History
