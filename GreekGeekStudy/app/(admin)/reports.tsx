import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Alert, Dimensions } from 'react-native'
import React, { useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'

// Mock data for study periods
const MOCK_PERIODS = [
  { 
    id: 1, 
    name: 'Spring 2023 - Week 1',
    start_date: '2023-01-15T00:00:00Z',
    end_date: '2023-01-21T23:59:59Z',
    required_hours: 10,
    is_active: true,
    period_type: 'weekly'
  },
  { 
    id: 2, 
    name: 'Spring 2023 - Week 2',
    start_date: '2023-01-22T00:00:00Z',
    end_date: '2023-01-28T23:59:59Z',
    required_hours: 10,
    is_active: false,
    period_type: 'weekly'
  },
  { 
    id: 3, 
    name: 'Spring 2023 - Week 3',
    start_date: '2023-01-29T00:00:00Z',
    end_date: '2023-02-04T23:59:59Z',
    required_hours: 10,
    is_active: false,
    period_type: 'weekly'
  },
]

// Mock data for user study stats
const MOCK_USER_STATS = [
  { id: 1, name: 'John Doe', hours: 12.5, goal_percentage: 125 },
  { id: 2, name: 'Jane Smith', hours: 8.2, goal_percentage: 82 },
  { id: 3, name: 'Bob Johnson', hours: 15.7, goal_percentage: 157 },
  { id: 4, name: 'Alice Brown', hours: 10.3, goal_percentage: 103 },
  { id: 5, name: 'Charlie Wilson', hours: 5.8, goal_percentage: 58 },
  { id: 6, name: 'Diana Miller', hours: 0, goal_percentage: 0 },
  { id: 7, name: 'Edward Davis', hours: 9.5, goal_percentage: 95 },
  { id: 8, name: 'Fiona Clark', hours: 11.2, goal_percentage: 112 },
]

// Mock data for group study stats
const MOCK_GROUP_STATS = [
  { id: 1, name: 'Freshmen', hours: 42.3, goal_percentage: 106, member_count: 4 },
  { id: 2, name: 'Sophomores', hours: 35.8, goal_percentage: 89, member_count: 4 },
  { id: 3, name: 'Juniors', hours: 51.2, goal_percentage: 128, member_count: 4 },
  { id: 4, name: 'Seniors', hours: 38.7, goal_percentage: 97, member_count: 4 },
]

// Mock data for location stats
const MOCK_LOCATION_STATS = [
  { id: 1, name: 'Alkek Library', hours: 98.5, sessions: 42 },
  { id: 2, name: 'Student Center', hours: 45.2, sessions: 18 },
  { id: 3, name: 'Engineering Building', hours: 24.3, sessions: 10 },
]

const Reports = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState
  
  const [selectedPeriod, setSelectedPeriod] = useState<any>(MOCK_PERIODS[0])
  const [activeTab, setActiveTab] = useState('users') // 'users', 'groups', 'locations'
  
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
        <Text className="text-gray-600 text-center">You don't have permission to access this page.</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 p-4">
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Text className="text-xl font-psemibold mb-4">Study Period Reports</Text>
          
          <View className="mb-4">
            <Text className="text-gray-600 mb-2">Select Period</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
              {MOCK_PERIODS.map(period => (
                <TouchableOpacity 
                  key={period.id}
                  className={`px-4 py-2 rounded-lg mr-2 ${selectedPeriod.id === period.id ? 'bg-green-600' : 'bg-gray-200'}`}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text className={selectedPeriod.id === period.id ? 'text-white' : 'text-gray-700'}>
                    {period.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View className="bg-gray-100 p-3 rounded-lg">
              <Text className="text-gray-600">
                {formatDate(selectedPeriod.start_date)} - {formatDate(selectedPeriod.end_date)}
              </Text>
              <Text className="text-gray-600">
                {selectedPeriod.required_hours} hours required • {selectedPeriod.period_type}
              </Text>
              {selectedPeriod.is_active && (
                <View className="bg-green-100 px-2 py-1 rounded-full self-start mt-1">
                  <Text className="text-green-600 text-xs">Active Period</Text>
                </View>
              )}
            </View>
          </View>
          
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
                <Text className="font-psemibold">Goal %</Text>
              </View>
              
              {MOCK_USER_STATS.map(user => (
                <View 
                  key={user.id}
                  className="flex-row justify-between items-center py-3 border-b border-gray-100"
                >
                  <Text className="flex-1">{user.name}</Text>
                  <Text className="w-16 text-right">{user.hours}h</Text>
                  <View className="w-16 flex-row items-center justify-end">
                    <View 
                      className={`w-2 h-2 rounded-full mr-1 ${
                        user.goal_percentage >= 100 ? 'bg-green-500' : 
                        user.goal_percentage >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} 
                    />
                    <Text>{user.goal_percentage}%</Text>
                  </View>
                </View>
              ))}
              
              <View className="mt-4 p-3 bg-gray-100 rounded-lg">
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Total Users:</Text>
                  <Text>{MOCK_USER_STATS.length}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Average Hours:</Text>
                  <Text>
                    {(MOCK_USER_STATS.reduce((sum, user) => sum + user.hours, 0) / MOCK_USER_STATS.length).toFixed(1)}h
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Goal Completion:</Text>
                  <Text>
                    {Math.round(MOCK_USER_STATS.reduce((sum, user) => sum + user.goal_percentage, 0) / MOCK_USER_STATS.length)}%
                  </Text>
                </View>
              </View>
            </View>
          )}
          
          {/* Groups Tab */}
          {activeTab === 'groups' && (
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-psemibold">Group</Text>
                <Text className="font-psemibold">Members</Text>
                <Text className="font-psemibold">Hours</Text>
                <Text className="font-psemibold">Goal %</Text>
              </View>
              
              {MOCK_GROUP_STATS.map(group => (
                <View 
                  key={group.id}
                  className="flex-row justify-between items-center py-3 border-b border-gray-100"
                >
                  <Text className="flex-1">{group.name}</Text>
                  <Text className="w-16 text-right">{group.member_count}</Text>
                  <Text className="w-16 text-right">{group.hours}h</Text>
                  <View className="w-16 flex-row items-center justify-end">
                    <View 
                      className={`w-2 h-2 rounded-full mr-1 ${
                        group.goal_percentage >= 100 ? 'bg-green-500' : 
                        group.goal_percentage >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} 
                    />
                    <Text>{group.goal_percentage}%</Text>
                  </View>
                </View>
              ))}
              
              <View className="mt-4 p-3 bg-gray-100 rounded-lg">
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Total Groups:</Text>
                  <Text>{MOCK_GROUP_STATS.length}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Total Hours:</Text>
                  <Text>
                    {MOCK_GROUP_STATS.reduce((sum, group) => sum + group.hours, 0).toFixed(1)}h
                  </Text>
                </View>
              </View>
            </View>
          )}
          
          {/* Locations Tab */}
          {activeTab === 'locations' && (
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-psemibold">Location</Text>
                <Text className="font-psemibold">Sessions</Text>
                <Text className="font-psemibold">Hours</Text>
              </View>
              
              {MOCK_LOCATION_STATS.map(location => (
                <View 
                  key={location.id}
                  className="flex-row justify-between items-center py-3 border-b border-gray-100"
                >
                  <Text className="flex-1">{location.name}</Text>
                  <Text className="w-16 text-right">{location.sessions}</Text>
                  <Text className="w-16 text-right">{location.hours}h</Text>
                </View>
              ))}
              
              <View className="mt-4 p-3 bg-gray-100 rounded-lg">
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Total Locations:</Text>
                  <Text>{MOCK_LOCATION_STATS.length}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Total Sessions:</Text>
                  <Text>
                    {MOCK_LOCATION_STATS.reduce((sum, location) => sum + location.sessions, 0)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-psemibold">Total Hours:</Text>
                  <Text>
                    {MOCK_LOCATION_STATS.reduce((sum, location) => sum + location.hours, 0).toFixed(1)}h
                  </Text>
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