import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, useWindowDimensions, Modal, Pressable } from 'react-native'
import React, { useRef, useState } from 'react'
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
  id: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const History = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState
  const orgTz = data?.org?.timezone || 'UTC'

  // All hooks must be declared before any early returns
  const { width } = useWindowDimensions()
  const SESSIONS_PER_PAGE = 6
  const [currentPage, setCurrentPage] = useState(0)
  const pagerRef = useRef<ScrollView>(null)
  const [filterVisible, setFilterVisible] = useState(false)
  const [pendingLocationIds, setPendingLocationIds] = useState<Set<number>>(new Set())
  const [pendingPeriodId, setPendingPeriodId] = useState<number | null>(null)
  const [activeLocationIds, setActiveLocationIds] = useState<Set<number>>(new Set())
  const [activePeriodId, setActivePeriodId] = useState<number | null>(null)

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
      timeZone: orgTz,
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
    const start = new Date(activePeriodInstance.start_date).getTime()
    const end = new Date(activePeriodInstance.end_date).getTime()
    const periodSessions = data.user_sessions.filter((session: any) => {
      const t = new Date(session.start_time).getTime()
      return t >= start && t <= end
    });

    return periodSessions.reduce(
      (acc: number, session: any) => acc + (session.hours || 0),
      0
    );
  }

  const requiredHours = () => {
    if (!data?.active_period_setting) return 0;
    return Number(data.active_period_setting.required_hours);
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
      const start = new Date(activePeriod.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
      const end = new Date(activePeriod.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: orgTz })
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
    
    // Use UTC calendar dates so the day count is timezone-independent
    const endUTC = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
    const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const daysDifference = (endUTC - nowUTC) / (1000 * 60 * 60 * 24);
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

  const activeFilterCount = (activeLocationIds.size > 0 ? 1 : 0) + (activePeriodId ? 1 : 0)

  const getFilteredSessions = () => {
    let result = getSortedSessions()
    if (activeLocationIds.size > 0) {
      result = result.filter((s: Session) => {
        const locId = typeof s.location === 'object' && s.location ? s.location.id : s.location as number | null
        return locId != null && activeLocationIds.has(locId)
      })
    }
    if (activePeriodId) {
      const period = data?.org_period_instances?.find((p: PeriodInstance) => p.id === activePeriodId)
      if (period) {
        const start = new Date(period.start_date).getTime()
        const end = new Date(period.end_date).getTime()
        result = result.filter((s: Session) => {
          const t = new Date(s.start_time).getTime()
          return t >= start && t <= end
        })
      }
    }
    return result
  }

  const openFilter = () => {
    setPendingLocationIds(new Set(activeLocationIds))
    setPendingPeriodId(activePeriodId)
    setFilterVisible(true)
  }

  const applyFilter = () => {
    setActiveLocationIds(new Set(pendingLocationIds))
    setActivePeriodId(pendingPeriodId)
    setCurrentPage(0)
    pagerRef.current?.scrollTo({ x: 0, animated: false })
    setFilterVisible(false)
  }

  const clearFilter = () => {
    setPendingLocationIds(new Set())
    setPendingPeriodId(null)
  }

  const toggleLocation = (id: number) => {
    setPendingLocationIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const sessions = getFilteredSessions()
  const periodInfo = getActivePeriodInfo()

  const pages: Session[][] = []
  for (let i = 0; i < sessions.length; i += SESSIONS_PER_PAGE) {
    pages.push(sessions.slice(i, i + SESSIONS_PER_PAGE))
  }
  if (pages.length === 0) pages.push([])

  return (
    <SafeAreaView className="bg-gg-bg flex-1">
      {/* Fixed header — progress card + section title */}
      <View className="px-4 pt-6">
        <Text className="font-psemibold text-xs uppercase tracking-wider text-gg-muted mb-3">Current Period Progress</Text>
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

        <View className="flex-row items-center justify-between mb-3">
          <Text className="font-psemibold text-[17px] leading-6 text-gg-text">Study Sessions</Text>
          <TouchableOpacity
            onPress={openFilter}
            className={`flex-row items-center px-3 py-2 rounded-lg border ${activeFilterCount > 0 ? 'bg-gg-primary border-gg-primary' : 'bg-gg-surface border-gg-outlineVariant'}`}
          >
            <Text className={`font-pmedium text-sm mr-1 ${activeFilterCount > 0 ? 'text-white' : 'text-gg-muted'}`}>
              {activeFilterCount > 0 ? `Filter (${activeFilterCount})` : 'Filter'}
            </Text>
            <Ionicons name="filter-outline" size={16} color={activeFilterCount > 0 ? '#fff' : '#3e4a3d'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Swipeable pages of sessions */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / width)
          setCurrentPage(page)
        }}
        className="flex-1"
      >
        {pages.map((pageSessions, pageIndex) => (
          <View key={pageIndex} style={{ width }} className="px-4">
            {pageSessions.length === 0 ? (
              <View className="bg-gg-surface border border-gg-outlineVariant rounded-lg p-6 mt-2">
                <EmptyState icon="time-outline" title="No sessions yet" message="Completed study sessions will appear here." />
              </View>
            ) : (
              pageSessions.map((session: Session, index: number) => {
                const iconNames = ['book-outline', 'school-outline', 'desktop-outline', 'library-outline'] as const
                const iconName = iconNames[(pageIndex * SESSIONS_PER_PAGE + index) % iconNames.length]

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
              })
            )}
          </View>
        ))}
      </ScrollView>

      {/* Page dots */}
      {pages.length > 1 && (
        <View className="flex-row justify-center items-center pb-8 pt-3 gap-x-1.5">
          {pages.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                pagerRef.current?.scrollTo({ x: i * width, animated: true })
                setCurrentPage(i)
              }}
            >
              <View
                className={`rounded-full ${i === currentPage ? 'w-5 h-2 bg-gg-primary' : 'w-2 h-2 bg-gg-outlineVariant'}`}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
      {/* Filter bottom sheet */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setFilterVisible(false)}
        />
        <View className="bg-gg-bg rounded-t-2xl px-5 pt-4 pb-10">
          <View className="w-10 h-1 bg-gg-outlineVariant rounded-full self-center mb-4" />

          <View className="flex-row items-center justify-between mb-5">
            <Text className="font-pbold text-lg text-gg-text">Filter Sessions</Text>
            <TouchableOpacity onPress={clearFilter}>
              <Text className="font-pmedium text-sm text-gg-primary">Clear all</Text>
            </TouchableOpacity>
          </View>

          {/* Location filter */}
          {data?.org_locations?.length > 0 && (
            <View className="mb-5">
              <Text className="font-psemibold text-xs uppercase tracking-wider text-gg-muted mb-3">Location</Text>
              <View className="flex-row flex-wrap gap-2">
                {data.org_locations.map((loc: Location) => {
                  const selected = pendingLocationIds.has(loc.id)
                  return (
                    <TouchableOpacity
                      key={loc.id}
                      onPress={() => toggleLocation(loc.id)}
                      className={`px-3 py-1.5 rounded-full border ${selected ? 'bg-gg-primary border-gg-primary' : 'bg-gg-surface border-gg-outlineVariant'}`}
                    >
                      <Text className={`font-pmedium text-sm ${selected ? 'text-white' : 'text-gg-text'}`}>
                        {loc.name}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}

          {/* Period filter */}
          {data?.org_period_instances?.length > 0 && (
            <View className="mb-6">
              <Text className="font-psemibold text-xs uppercase tracking-wider text-gg-muted mb-3">Period</Text>
              <View className="flex-row flex-wrap gap-2">
                {data.org_period_instances.map((instance: PeriodInstance) => {
                  const selected = pendingPeriodId === instance.id
                  const label = `${new Date(instance.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${new Date(instance.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: orgTz })}`
                  return (
                    <TouchableOpacity
                      key={instance.id}
                      onPress={() => setPendingPeriodId(selected ? null : instance.id)}
                      className={`px-3 py-1.5 rounded-full border ${selected ? 'bg-gg-primary border-gg-primary' : 'bg-gg-surface border-gg-outlineVariant'}`}
                    >
                      <Text className={`font-pmedium text-sm ${selected ? 'text-white' : 'text-gg-text'}`}>
                        {label}{instance.is_active ? ' (Active)' : ''}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={applyFilter}
            className="bg-gg-primary rounded-xl py-3.5 items-center"
          >
            <Text className="font-pbold text-base text-white">Apply</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

export default History
