import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Alert, Dimensions } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import API_URL from '../../constants/api'

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

  const handleExportData = () => {
    Alert.alert(
      "Export Data",
      "This would export the report data to CSV or PDF format.",
      [{ text: "OK" }]
    )
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
        <Text className="text-red-500 text-lg font-bold">Error:</Text>
        <Text className="text-red-500">{JSON.stringify(dashboardError || error, null, 2)}</Text>
      </ScrollView>
    )
  }

  // Check if user is admin
  if (!data.is_staff) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-4">
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text className="text-xl font-psemibold text-center mt-4 mb-2">Access Denied</Text>
        <Text className="text-gray-600 text-center">You don't have permission to access this page.</Text>
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
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 p-4">
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Text className="text-xl font-psemibold mb-4">
            {hasPeriodsData ? 'Study Period Reports' : 'Lifetime Study Reports'}
          </Text>
          
          {/* Only show period selection if periods exist */}
          {hasPeriodsData && (
            <View className="mb-4">
              <Text className="text-gray-600 mb-2">Select Period</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                {periods.map(period => (
                  <TouchableOpacity 
                    key={period.id}
                    className={`px-4 py-2 rounded-lg mr-2 ${selectedPeriodId === period.id ? 'bg-green-600' : 'bg-gray-200'}`}
                    onPress={() => setSelectedPeriodId(period.id)}
                  >
                    <Text className={selectedPeriodId === period.id ? 'text-white' : 'text-gray-700'}>
                      {`${formatDate(period.start_date)} - ${formatDate(period.end_date)}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {selectedPeriod && (
                <View className="bg-gray-100 p-3 rounded-lg">
                  <Text className="text-gray-600">
                    {formatDate(selectedPeriod.start_date)} - {formatDate(selectedPeriod.end_date)}
                  </Text>
                  <Text className="text-gray-600">
                    {selectedPeriod.period_setting?.required_hours || orgReport.active_period_setting?.required_hours} hours required
                  </Text>
                  {selectedPeriod.is_active && (
                    <View className="bg-green-100 px-2 py-1 rounded-full self-start mt-1">
                      <Text className="text-green-600 text-xs">Active Period</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
          
          {/* Show lifetime data info when no periods */}
          {!hasPeriodsData && (
            <View className="mb-4 bg-blue-100 p-3 rounded-lg">
              <Text className="text-blue-600 text-center">
                Showing lifetime study data across all sessions
              </Text>
            </View>
          )}
          
          <View className="flex-row mb-4">
            <TouchableOpacity 
              onPress={() => setActiveTab('users')}
              className={`flex-1 py-2 ${activeTab === 'users' ? 'border-b-2 border-green-600' : 'border-b border-gray-200'}`}
            >
              <Text className={`text-center ${activeTab === 'users' ? 'text-green-600 font-psemibold' : 'text-gray-600'}`}>
                Users
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setActiveTab('groups')}
              className={`flex-1 py-2 ${activeTab === 'groups' ? 'border-b-2 border-green-600' : 'border-b border-gray-200'}`}
            >
              <Text className={`text-center ${activeTab === 'groups' ? 'text-green-600 font-psemibold' : 'text-gray-600'}`}>
                Groups
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setActiveTab('locations')}
              className={`flex-1 py-2 ${activeTab === 'locations' ? 'border-b-2 border-green-600' : 'border-b border-gray-200'}`}
            >
              <Text className={`text-center ${activeTab === 'locations' ? 'text-green-600 font-psemibold' : 'text-gray-600'}`}>
                Locations
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Users Tab */}
          {activeTab === 'users' && (
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-psemibold">User</Text>
                <Text className="font-psemibold">Hours</Text>
                {hasPeriodsData && <Text className="font-psemibold">Goal %</Text>}
              </View>
              
              {userStats.map(user => (
                <View 
                  key={user.id}
                  className="flex-row justify-between items-center py-3 border-b border-gray-100"
                >
                  <View className="flex-1">
                    <Text>{user.name}</Text>
                    <Text className="text-gray-500 text-xs">{user.group ? user.group.name : 'No Group'}</Text>
                  </View>
                  <Text className="w-16 text-right">{user.hours.toFixed(1)}h</Text>
                  {hasPeriodsData && (
                    <View className="w-16 flex-row items-center justify-end">
                      <View 
                        className={`w-2 h-2 rounded-full mr-1 ${
                          user.goal_percentage >= 100 ? 'bg-green-500' : 
                          user.goal_percentage >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} 
                      />
                      <Text>{user.goal_percentage}%</Text>
                    </View>
                  )}
                </View>
              ))}
              
              <View className="mt-4 p-3 bg-gray-100 rounded-lg">
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
                <Text className="font-psemibold flex-1">Group</Text>
                <Text className="font-psemibold w-14 text-center">Members</Text>
                <Text className="font-psemibold w-14 text-center">Active</Text>
                <Text className="font-psemibold w-16 text-center">Total Hours</Text>
                <Text className="font-psemibold w-16 text-center">Avg Hours</Text>
                {hasPeriodsData && <Text className="font-psemibold w-16 text-center">Goal %</Text>}
              </View>
              
              {groupStats.length === 0 ? (
                <Text className="text-gray-500 italic py-4 text-center">No groups available</Text>
              ) : (
                groupStats.map(group => (
                  <View 
                    key={group.id}
                    className="flex-row justify-between items-center py-3 border-b border-gray-100"
                  >
                    <View className="flex-1">
                      <Text>{group.name}</Text>
                      <Text className="text-gray-500 text-xs">{group.active_members} of {group.member_count} active</Text>
                    </View>
                    <Text className="w-14 text-center">{group.member_count}</Text>
                    <Text className="w-14 text-center">{group.active_members}</Text>
                    <Text className="w-16 text-center">{group.total_hours.toFixed(1)}h</Text>
                    <Text className="w-16 text-center">{group.average_hours.toFixed(1)}h</Text>
                    {hasPeriodsData && (
                      <View className="w-16 flex-row items-center justify-end">
                        <View 
                          className={`w-2 h-2 rounded-full mr-1 ${
                            group.goal_percentage >= 100 ? 'bg-green-500' : 
                            group.goal_percentage >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} 
                        />
                        <Text className="text-xs">{group.goal_percentage}%</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
              
              <View className="mt-4 p-3 bg-gray-100 rounded-lg">
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
                <Text className="font-psemibold flex-1">Location</Text>
                <Text className="font-psemibold w-14 text-center">Sess.</Text>
                <Text className="font-psemibold w-14 text-center">Hours</Text>
                <Text className="font-psemibold w-16 text-center">Usage</Text>
              </View>
              
              {locationStats.length === 0 ? (
                <Text className="text-gray-500 italic py-4 text-center">No location data available for this period</Text>
              ) : (
                locationStats.map(location => (
                  <View 
                    key={location.id}
                    className="flex-row justify-between items-center py-3 border-b border-gray-100"
                  >
                    <View className="flex-1">
                      <Text>{location.name}</Text>
                      <Text className="text-gray-500 text-xs">{location.gps_radius}m radius</Text>
                    </View>
                    <Text className="w-14 text-center">{location.sessions}</Text>
                    <Text className="w-14 text-center">{location.hours.toFixed(1)}h</Text>
                    <View className="w-16 items-center">
                      <View className="w-full bg-gray-200 rounded-full h-2 mb-1">
                        <View 
                          className={`h-2 rounded-full ${
                            location.utilization_rate >= 70 ? 'bg-green-500' : 
                            location.utilization_rate >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} 
                          style={{ width: `${location.utilization_rate}%` }} 
                        />
                      </View>
                      <Text className="text-xs">{location.utilization_rate}%</Text>
                    </View>
                  </View>
                ))
              )}
              
              <View className="mt-4 p-3 bg-gray-100 rounded-lg">
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
            className="bg-blue-500 p-3 rounded-lg flex-row items-center justify-center mt-4"
          >
            <Ionicons name="download" size={20} color="white" />
            <Text className="text-white font-psemibold ml-2">Export Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Reports 