import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Alert, Dimensions, Share } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import API_URL from '../../constants/api'
import { Card, EmptyState, ProgressBar, ScreenHeader } from '../../components/Design'

// Define types for API response
interface PeriodSetting {
  id: string;
  period_type: string;
  required_hours: number;
  is_active: boolean;
}

interface PeriodInstance {
  id: string;
  period_setting: PeriodSetting;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface Location {
  id: number;
  name: string;
  gps_lat: number;
  gps_long: number;
  gps_radius: number;
  gps_address?: string;
}

interface Group {
  id: number;
  name: string;
}

interface Session {
  id: number;
  hours: number | null;
  start_time: string;
  period_instance: PeriodInstance | null;
  location: Location | number | null;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  group: Group | null;
  sessions: Session[];
}

interface OrgReport {
  org_id: number;
  org_name: string;
  active_period_setting: PeriodSetting | null;
  period_instances: PeriodInstance[];
  users: User[];
  locations: Location[];
}

interface UserStat {
  id: number;
  name: string;
  group: Group | null;
  hours: number;
  goal_percentage: number;
}

interface LocationStat {
  id: number;
  name: string;
  hours: number;
  sessions: number;
  gps_lat: number;
  gps_long: number;
  gps_radius: number;
  gps_address?: string;
  utilization_rate: number; // percentage of total study time at this location
}

interface GroupStat {
  id: number;
  name: string;
  member_count: number;
  total_hours: number;
  average_hours: number;
  goal_percentage: number;
  active_members: number; // members with > 0 hours
}

const Reports = () => {
  const { dashboardState, handleUnauthorized } = useDashboard()
  const { isLoading: isDashboardLoading, error: dashboardError, data } = dashboardState
  
  const [orgReport, setOrgReport] = useState<OrgReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<any>(null)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('users') // 'users', 'locations', 'groups'
  
  useEffect(() => {
    // Fetch organization report data
    const fetchOrgReport = async () => {
      try {
        console.log("Starting to fetch org report data...")
        setIsLoading(true)
        
        // Get token from AsyncStorage
        const token = await AsyncStorage.getItem('accessToken')
        console.log("Token available:", !!token)
        
        if (!token) {
          console.error("No access token found in AsyncStorage")
          setError(new Error("Authentication required"))
          setIsLoading(false)
          return
        }
        
        const apiEndpoint = `${API_URL}api/org-report/`
        console.log("Fetching from endpoint:", apiEndpoint)
        
        const response = await axios.get(apiEndpoint, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        
        console.log("API Response status:", response.status)
        console.log("API Response data preview:", JSON.stringify(response.data).substring(0, 100) + "...")
        
        // Log location information for debugging
        if (response.data.locations) {
          console.log(`Found ${response.data.locations.length} locations in org data`)
        }
        if (response.data.users && response.data.users.length > 0 && response.data.users[0].sessions) {
          const sampleSession = response.data.users[0].sessions[0]
          console.log("Sample session location:", sampleSession ? sampleSession.location : "No sessions")
        }
        
        setOrgReport(response.data)
        
        // Set default selected period to the active one
        if (response.data.period_instances && response.data.period_instances.length > 0) {
          const activePeriod = response.data.period_instances.find((p: PeriodInstance) => p.is_active) || response.data.period_instances[0]
          setSelectedPeriodId(activePeriod.id)
        }
        
        setIsLoading(false)
      } catch (err) {
        console.error('Error fetching org report:', err)
        if (axios.isAxiosError(err)) {
          console.error('API Error details:', {
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data
          })
          
          // Handle unauthorized response
          if (err.response?.status === 401) {
            handleUnauthorized()
          }
        }
        
        setError(err)
        setIsLoading(false)
      }
    }

    const initFetch = async () => {
      // Only fetch if we have dashboard data loaded and user is authenticated with staff privileges
      if (data && !isDashboardLoading) {
        if (data.is_staff) {
          console.log("User is staff, fetching org report data...")
          await fetchOrgReport()
        } else {
          console.log("User is not staff, skipping data fetch")
          setIsLoading(false)
        }
      }
    }
    
    initFetch()
  }, [data, isDashboardLoading, handleUnauthorized])
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  const csvEscape = (value: string | number | null | undefined) => {
    const stringValue = value === null || value === undefined ? '' : String(value)
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  const rowsToCsv = (rows: (string | number | null | undefined)[][]) => {
    return rows.map(row => row.map(csvEscape).join(',')).join('\n')
  }

  const handleExportData = async () => {
    if (!orgReport) {
      Alert.alert("Error", "Report data is not loaded yet.")
      return
    }

    try {
      const periodLabel = hasPeriodsData && selectedPeriod
        ? `${formatDate(selectedPeriod.start_date)} - ${formatDate(selectedPeriod.end_date)}`
        : 'Lifetime'

      let rows: (string | number | null | undefined)[][] = []
      let title = `${orgReport.org_name} ${periodLabel} Report`

      if (activeTab === 'users') {
        title = `${title} - Users`
        rows = [
          ['User', 'Group', 'Hours', hasPeriodsData ? 'Goal %' : 'Goal %'],
          ...userStats.map(user => [
            user.name,
            user.group?.name || 'No Group',
            user.hours.toFixed(1),
            hasPeriodsData ? user.goal_percentage : '',
          ]),
        ]
      } else if (activeTab === 'groups') {
        title = `${title} - Groups`
        rows = [
          ['Group', 'Members', 'Active Members', 'Total Hours', 'Average Hours', hasPeriodsData ? 'Goal %' : 'Goal %'],
          ...groupStats.map(group => [
            group.name,
            group.member_count,
            group.active_members,
            group.total_hours.toFixed(1),
            group.average_hours.toFixed(1),
            hasPeriodsData ? group.goal_percentage : '',
          ]),
        ]
      } else {
        title = `${title} - Locations`
        rows = [
          ['Location', 'Sessions', 'Hours', 'Usage %', 'GPS Radius', 'Address'],
          ...locationStats.map(location => [
            location.name,
            location.sessions,
            location.hours.toFixed(1),
            location.utilization_rate,
            location.gps_radius,
            location.gps_address || '',
          ]),
        ]
      }

      await Share.share({
        title,
        message: rowsToCsv(rows),
      })
    } catch (error) {
      console.error('Error exporting report:', error)
      Alert.alert("Error", "Failed to export report data. Please try again.")
    }
  }

  // Compute stats data for selected period
  const getUserStats = (): UserStat[] => {
    if (!orgReport) return []
    
    return orgReport.users.map(user => {
      // If no periods exist, use all sessions (lifetime data)
      const sessionsToAnalyze = !orgReport.period_instances || orgReport.period_instances.length === 0 
        ? user.sessions
        : user.sessions.filter(session => session.period_instance && session.period_instance.id === selectedPeriodId)
      
      // Calculate total hours
      const totalHours = sessionsToAnalyze.reduce((sum: number, session) => {
        return sum + (session.hours || 0)
      }, 0)
      
      // Get required hours - if no periods, use a default or show as N/A
      let requiredHours = 0
      let goalPercentage = 0
      
      if (orgReport.period_instances && orgReport.period_instances.length > 0) {
        const selectedPeriod = orgReport.period_instances.find(p => p.id === selectedPeriodId)
        requiredHours = selectedPeriod?.period_setting?.required_hours || orgReport.active_period_setting?.required_hours || 10
        goalPercentage = Math.round((totalHours / requiredHours) * 100)
      } else {
        // For lifetime data, we don't have a goal to compare against
        goalPercentage = 0
      }
      
      return {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        group: user.group,
        hours: totalHours,
        goal_percentage: goalPercentage
      }
    })
  }
  
  // Get location stats
  const getLocationStats = (): LocationStat[] => {
    if (!orgReport) return []
    
    console.log("Starting getLocationStats")
    
    // Create a map of location IDs to location objects for quick lookup
    const locationLookup: Record<number, Location> = {}
    orgReport.locations.forEach(location => {
      locationLookup[location.id] = location
    })
    console.log("Location lookup map created with", Object.keys(locationLookup).length, "locations")
    
    const locationMap: Record<number, LocationStat> = {}
    
    // First, initialize with all locations from the org
    orgReport.locations.forEach(location => {
      locationMap[location.id] = {
        id: location.id,
        name: location.name,
        hours: 0,
        sessions: 0,
        gps_lat: location.gps_lat,
        gps_long: location.gps_long,
        gps_radius: location.gps_radius,
        utilization_rate: 0
      }
    })
    
    // Aggregate sessions - use all sessions if no periods, otherwise filter by selected period
    orgReport.users.forEach(user => {
      const sessionsToAnalyze = !orgReport.period_instances || orgReport.period_instances.length === 0
        ? user.sessions
        : user.sessions.filter(session => session.period_instance && session.period_instance.id === selectedPeriodId)
      
      sessionsToAnalyze.forEach(session => {
        // Handle the case where location could be an ID or null
        if (!session.location) return
        
        // If location is an ID (number)
        const locationType = typeof session.location
        const locationId = locationType === 'number' 
          ? (session.location as number)
          : (session.location as Location).id
        
        // Debug log for location type
        if (sessionsToAnalyze.length > 0 && sessionsToAnalyze.indexOf(session) === 0) {
          console.log(`First session location type: ${locationType}, value:`, session.location)
        }
        
        if (locationMap[locationId]) {
          locationMap[locationId].hours += (session.hours || 0)
          locationMap[locationId].sessions += 1
        } else {
          console.log(`Warning: Location ID ${locationId} not found in location map`)
        }
      })
    })
    
    // Log results
    const stats = Object.values(locationMap)
    console.log(`Generated stats for ${stats.length} locations, ${stats.filter(l => l.sessions > 0).length} have sessions`)
    
    // Calculate utilization rate
    const totalHours = stats.reduce((sum, location) => sum + location.hours, 0)
    console.log(`Total hours across all locations: ${totalHours}`)
    
    if (totalHours > 0) {
      for (const location of stats) {
        location.utilization_rate = Math.round((location.hours / totalHours) * 100)
      }
    }
    
    // Sort by hours in descending order
    return stats.sort((a, b) => b.hours - a.hours)
  }
  
  // Get group stats
  const getGroupStats = (): GroupStat[] => {
    if (!orgReport) return []
    
    console.log("Starting getGroupStats")
    
    const groupMap: Record<number, GroupStat> = {}
    
    // Initialize group stats (only for users with groups)
    orgReport.users.forEach(user => {
      if (user.group && !groupMap[user.group.id]) {
        groupMap[user.group.id] = {
          id: user.group.id,
          name: user.group.name,
          member_count: 0,
          total_hours: 0,
          average_hours: 0,
          goal_percentage: 0,
          active_members: 0
        }
      }
      if (user.group) {
        groupMap[user.group.id].member_count += 1
      }
    })
    
    // Calculate stats for each group
    Object.values(groupMap).forEach(groupStat => {
      const groupUsers = orgReport.users.filter(user => user.group && user.group.id === groupStat.id)
      
      let totalGroupHours = 0
      let activeMembers = 0
      let totalGoalPercentage = 0
      
      groupUsers.forEach(user => {
        // Filter sessions by selected period (same logic as getUserStats)
        const sessionsToAnalyze = !orgReport.period_instances || orgReport.period_instances.length === 0 
          ? user.sessions
          : user.sessions.filter(session => session.period_instance && session.period_instance.id === selectedPeriodId)
        
        const userHours = sessionsToAnalyze.reduce((sum: number, session) => {
          return sum + (session.hours || 0)
        }, 0)
        
        if (userHours > 0) {
          activeMembers += 1
        }
        
        totalGroupHours += userHours
        
        // Calculate goal percentage for this user
        if (orgReport.period_instances && orgReport.period_instances.length > 0) {
          const selectedPeriod = orgReport.period_instances.find(p => p.id === selectedPeriodId)
          const requiredHours = selectedPeriod?.period_setting?.required_hours || orgReport.active_period_setting?.required_hours || 10
          const userGoalPercentage = (userHours / requiredHours) * 100
          totalGoalPercentage += userGoalPercentage
        }
      })
      
      groupStat.total_hours = totalGroupHours
      groupStat.average_hours = groupStat.member_count > 0 ? totalGroupHours / groupStat.member_count : 0
      groupStat.active_members = activeMembers
      groupStat.goal_percentage = groupStat.member_count > 0 ? Math.round(totalGoalPercentage / groupStat.member_count) : 0
    })
    
    console.log(`Generated stats for ${Object.keys(groupMap).length} groups`)
    
    // Sort by total hours in descending order
    return Object.values(groupMap).sort((a, b) => b.total_hours - a.total_hours)
  }

  if (isDashboardLoading || isLoading) {
    return <LoadingScreen />
  }

  if (dashboardError || error) {
    return (
      <ScrollView className="flex-1 p-4">
        <Text className="text-gg-error text-lg font-bold">Error:</Text>
        <Text className="text-gg-error">{JSON.stringify(dashboardError || error, null, 2)}</Text>
      </ScrollView>
    )
  }

  // Check if user is admin
  if (!data.is_staff) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-4">
        <Ionicons name="alert-circle" size={64} color="#ba1a1a" />
        <Text className="text-xl font-psemibold text-center mt-4 mb-2">Access Denied</Text>
        <Text className="text-gg-muted text-center">You don't have permission to access this page.</Text>
      </SafeAreaView>
    )
  }
  
  // Handle case where data isn't loaded yet
  if (!orgReport) {
    return <LoadingScreen />
  }
  
  const periods = orgReport.period_instances || []
  const selectedPeriod = periods.find(p => p.id === selectedPeriodId) || periods[0]
  const userStats = getUserStats()
  const locationStats = getLocationStats()
  const groupStats = getGroupStats()
  const hasPeriodsData = periods.length > 0

  return (
    <SafeAreaView className="flex-1 bg-gg-bg">
      <ScreenHeader
        title="Reports"
        subtitle={hasPeriodsData ? 'Period performance by users, groups, and locations' : 'Lifetime study data'}
        right={(
          <TouchableOpacity
            onPress={handleExportData}
            className="h-10 w-10 rounded-full bg-[#dbe1ff] items-center justify-center"
          >
            <Ionicons name="download-outline" size={21} color="#0051d5" />
          </TouchableOpacity>
        )}
      />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <Card className="mb-4">
          <Text className="text-lg font-psemibold mb-4 text-gg-text">
            {hasPeriodsData ? 'Study Period Reports' : 'Lifetime Study Reports'}
          </Text>
          
          {/* Only show period selection if periods exist */}
          {hasPeriodsData && (
            <View className="mb-4">
              <Text className="text-gg-muted mb-2 font-pmedium text-xs">Select Period</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                {periods.map(period => (
                  <TouchableOpacity 
                    key={period.id}
                    className={`px-4 py-2 rounded-full mr-2 border ${selectedPeriodId === period.id ? 'bg-gg-primary border-gg-primary' : 'bg-gg-bg border-gg-outlineVariant'}`}
                    onPress={() => setSelectedPeriodId(period.id)}
                  >
                    <Text className={selectedPeriodId === period.id ? 'text-white' : 'text-gg-muted'}>
                      {`${formatDate(period.start_date)} - ${formatDate(period.end_date)}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {selectedPeriod && (
                <View className="bg-gg-bg border border-gg-outlineVariant p-3 rounded-lg">
                  <Text className="text-gg-muted font-pregular">
                    {formatDate(selectedPeriod.start_date)} - {formatDate(selectedPeriod.end_date)}
                  </Text>
                  <Text className="text-gg-muted font-pregular">
                    {selectedPeriod.period_setting?.required_hours || orgReport.active_period_setting?.required_hours} hours required
                  </Text>
                  {selectedPeriod.is_active && (
                    <View className="bg-gg-surfaceLow px-2 py-1 rounded-full self-start mt-1">
                      <Text className="text-gg-primary text-xs">Active Period</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
          
          {/* Show lifetime data info when no periods */}
          {!hasPeriodsData && (
            <View className="mb-4 bg-[#dbe1ff] border border-[#b4c5ff] p-3 rounded-lg">
              <Text className="text-gg-secondary text-center font-pregular">
                Showing lifetime study data across all sessions
              </Text>
            </View>
          )}
          
          <View className="flex-row mb-4 bg-gg-bg rounded-lg p-1 border border-gg-outlineVariant">
            <TouchableOpacity 
              onPress={() => setActiveTab('users')}
              className={`flex-1 py-2 rounded-md ${activeTab === 'users' ? 'bg-gg-surface' : ''}`}
            >
              <Text className={`text-center font-psemibold ${activeTab === 'users' ? 'text-gg-primary' : 'text-gg-muted'}`}>
                Users
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setActiveTab('groups')}
              className={`flex-1 py-2 rounded-md ${activeTab === 'groups' ? 'bg-gg-surface' : ''}`}
            >
              <Text className={`text-center font-psemibold ${activeTab === 'groups' ? 'text-gg-primary' : 'text-gg-muted'}`}>
                Groups
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setActiveTab('locations')}
              className={`flex-1 py-2 rounded-md ${activeTab === 'locations' ? 'bg-gg-surface' : ''}`}
            >
              <Text className={`text-center font-psemibold ${activeTab === 'locations' ? 'text-gg-primary' : 'text-gg-muted'}`}>
                Locations
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Users Tab */}
          {activeTab === 'users' && (
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-psemibold text-gg-muted text-xs">User</Text>
                <Text className="font-psemibold text-gg-muted text-xs">Hours</Text>
                {hasPeriodsData && <Text className="font-psemibold text-gg-muted text-xs">Goal %</Text>}
              </View>
              
              {userStats.map(user => (
                <View 
                  key={user.id}
                  className="flex-row justify-between items-center py-3 border-b border-gg-outlineVariant"
                >
                  <View className="flex-1">
                      <Text className="font-psemibold text-gg-text">{user.name}</Text>
                    <Text className="text-gg-muted text-xs">{user.group ? user.group.name : 'No Group'}</Text>
                  </View>
                  <Text className="w-16 text-right font-psemibold text-gg-text">{user.hours.toFixed(1)}h</Text>
                  {hasPeriodsData && (
                    <View className="w-16 flex-row items-center justify-end">
                      <Text>{user.goal_percentage}%</Text>
                    </View>
                  )}
                </View>
              ))}
              
              <View className="mt-4 p-3 bg-gg-bg border border-gg-outlineVariant rounded-lg">
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Total Users:</Text>
                  <Text>{userStats.length}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Average Hours:</Text>
                  <Text>
                    {userStats.length ? (userStats.reduce((sum, user) => sum + user.hours, 0) / userStats.length).toFixed(1) : 0}h
                  </Text>
                </View>
                {hasPeriodsData && (
                  <View className="flex-row justify-between">
                    <Text className="font-psemibold">Goal Completion:</Text>
                    <Text>
                      {userStats.length ? Math.round(userStats.reduce((sum, user) => sum + user.goal_percentage, 0) / userStats.length) : 0}%
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
          
          {/* Groups Tab */}
          {activeTab === 'groups' && (
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-psemibold text-gg-muted text-xs flex-1">Group</Text>
                <Text className="font-psemibold text-gg-muted text-xs w-14 text-center">Members</Text>
                <Text className="font-psemibold text-gg-muted text-xs w-14 text-center">Active</Text>
                <Text className="font-psemibold text-gg-muted text-xs w-16 text-center">Total</Text>
                <Text className="font-psemibold text-gg-muted text-xs w-16 text-center">Avg</Text>
                {hasPeriodsData && <Text className="font-psemibold text-gg-muted text-xs w-16 text-center">Goal</Text>}
              </View>
              
              {groupStats.length === 0 ? (
                <EmptyState icon="people-outline" title="No groups available" message="Create groups to unlock group reporting." />
              ) : (
                groupStats.map(group => (
                  <View 
                    key={group.id}
                    className="flex-row justify-between items-center py-3 border-b border-gg-outlineVariant"
                  >
                    <View className="flex-1">
                      <Text className="font-psemibold text-gg-text">{group.name}</Text>
                      <Text className="text-gg-muted text-xs">{group.active_members} of {group.member_count} active</Text>
                    </View>
                    <Text className="w-14 text-center">{group.member_count}</Text>
                    <Text className="w-14 text-center">{group.active_members}</Text>
                    <Text className="w-16 text-center">{group.total_hours.toFixed(1)}h</Text>
                    <Text className="w-16 text-center">{group.average_hours.toFixed(1)}h</Text>
                    {hasPeriodsData && (
                      <View className="w-16 flex-row items-center justify-end">
                        <View 
                          className={`w-2 h-2 rounded-full mr-1 ${
                            group.goal_percentage >= 100 ? 'bg-gg-surfaceLow0' : 
                            group.goal_percentage >= 75 ? 'bg-yellow-500' : 'bg-gg-error'
                          }`} 
                        />
                        <Text className="text-xs">{group.goal_percentage}%</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
              
              <View className="mt-4 p-3 bg-gg-bg border border-gg-outlineVariant rounded-lg">
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Total Groups:</Text>
                  <Text>{groupStats.length}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Total Members:</Text>
                  <Text>{groupStats.reduce((sum, group) => sum + group.member_count, 0)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Active Members:</Text>
                  <Text>{groupStats.reduce((sum, group) => sum + group.active_members, 0)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Total Hours:</Text>
                  <Text>{groupStats.reduce((sum, group) => sum + group.total_hours, 0).toFixed(1)}h</Text>
                </View>
                {hasPeriodsData && (
                  <View className="flex-row justify-between">
                    <Text className="font-psemibold">Average Goal Completion:</Text>
                    <Text>
                      {groupStats.length ? Math.round(groupStats.reduce((sum, group) => sum + group.goal_percentage, 0) / groupStats.length) : 0}%
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
          
          {/* Locations Tab */}
          {activeTab === 'locations' && (
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-psemibold text-gg-muted text-xs flex-1">Location</Text>
                <Text className="font-psemibold text-gg-muted text-xs w-14 text-center">Sess.</Text>
                <Text className="font-psemibold text-gg-muted text-xs w-14 text-center">Hours</Text>
                <Text className="font-psemibold text-gg-muted text-xs w-16 text-center">Usage</Text>
              </View>
              
              {locationStats.length === 0 ? (
                <EmptyState icon="location-outline" title="No location data" message="Verified sessions will populate this report." />
              ) : (
                locationStats.map(location => (
                  <View 
                    key={location.id}
                    className="flex-row justify-between items-center py-3 border-b border-gg-outlineVariant"
                  >
                    <View className="flex-1">
                      <Text className="font-psemibold text-gg-text">{location.name}</Text>
                      <Text className="text-gg-muted text-xs">{location.gps_radius}m radius</Text>
                    </View>
                    <Text className="w-14 text-center">{location.sessions}</Text>
                    <Text className="w-14 text-center">{location.hours.toFixed(1)}h</Text>
                    <View className="w-16 items-center">
                      <View className="w-full mb-1">
                        <ProgressBar value={location.utilization_rate} tone={location.utilization_rate >= 70 ? 'green' : location.utilization_rate >= 30 ? 'amber' : 'red'} />
                      </View>
                      <Text className="text-xs">{location.utilization_rate}%</Text>
                    </View>
                  </View>
                ))
              )}
              
              <View className="mt-4 p-3 bg-gg-bg border border-gg-outlineVariant rounded-lg">
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Total Locations:</Text>
                  <Text>{locationStats.length}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Active Locations:</Text>
                  <Text>{locationStats.filter(loc => loc.sessions > 0).length} of {locationStats.length}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Total Sessions:</Text>
                  <Text>{locationStats.reduce((sum, location) => sum + location.sessions, 0)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Total Hours:</Text>
                  <Text>{locationStats.reduce((sum, location) => sum + location.hours, 0).toFixed(1)}h</Text>
                </View>
              </View>
            </View>
          )}
          
          <TouchableOpacity 
            onPress={handleExportData}
            className="bg-gg-secondary min-h-[56px] rounded-lg flex-row items-center justify-center mt-4"
          >
            <Ionicons name="download" size={20} color="white" />
            <Text className="text-white font-psemibold ml-2">Export Report</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Reports
