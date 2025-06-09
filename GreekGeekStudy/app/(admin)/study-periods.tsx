import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Switch, Platform } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_URL } from '@/constants'

// Define types for period settings and instances
interface PeriodSetting {
  id: string;
  period_type: 'weekly' | 'monthly' | 'custom';
  custom_days: number | null;
  required_hours: number;
  start_date: string;
  due_day_of_week: number | null;
  is_active: boolean;
  org: number;
}

interface PeriodInstance {
  id: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  period_setting: string;
}

interface NewPeriodSettingForm {
  period_type: 'weekly' | 'monthly' | 'custom';
  required_hours: number;
  start_date: Date;
  due_day_of_week: number;
  custom_days: number;
}

// Define error types
interface ValidationError {
  code: string;
  detail: string;
  attr: string;
}

interface ApiError {
  type: string;
  errors?: ValidationError[];
}

const StudyPeriodsManagement = () => {
  const { dashboardState, refreshDashboard, handleUnauthorized } = useDashboard()
  const { isLoading, error, data } = dashboardState
  
  const [showAddPeriodSetting, setShowAddPeriodSetting] = useState(false)
  const [isCreatingPeriodSetting, setIsCreatingPeriodSetting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  
  // New period setting form
  const [newPeriodSetting, setNewPeriodSetting] = useState<NewPeriodSettingForm>({
    period_type: 'weekly',
    required_hours: 10,
    start_date: new Date(),
    due_day_of_week: 5, // Friday
    custom_days: 7
  })
  
  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }
  
  // Get day of week name
  const getDayOfWeekName = (dayNumber: number | null): string => {
    if (dayNumber === null) return 'Not set'
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayNumber]
  }
  
  // Create new period setting
  const handleCreatePeriodSetting = async (): Promise<void> => {
    try {
      // Clear previous errors
      setValidationErrors({})
      setIsCreatingPeriodSetting(true)
      
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) throw new Error('No access token found')
      
      // Prepare the data based on period type
      const periodData: Record<string, any> = {
        period_type: newPeriodSetting.period_type,
        required_hours: newPeriodSetting.required_hours,
        start_date: newPeriodSetting.start_date.toISOString(),
        is_active: true
      }
      
      // Add type-specific fields
      if (newPeriodSetting.period_type === 'weekly') {
        periodData.due_day_of_week = newPeriodSetting.due_day_of_week
        periodData.custom_days = null
      } else if (newPeriodSetting.period_type === 'custom') {
        periodData.due_day_of_week = null
        periodData.custom_days = newPeriodSetting.custom_days
      } else {
        // Monthly
        periodData.due_day_of_week = null
        periodData.custom_days = null
      }
      
      await axios.post(
        `${API_URL}api/period-settings/`,
        periodData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      
      await refreshDashboard()
      setShowAddPeriodSetting(false)
      
      Alert.alert(
        "Success",
        "Study period settings created successfully.",
        [{ text: "OK" }]
      )
    } catch (error: any) {
      console.error('Error creating period setting:', error)
      
      if (error.response?.status === 401) {
        await handleUnauthorized()
      } else if (error.response?.data) {
        // Handle validation errors
        const apiError = error.response.data as ApiError
        
        if (apiError.type === 'validation_error' && apiError.errors) {
          const errors: Record<string, string> = {}
          
          apiError.errors.forEach(err => {
            errors[err.attr] = err.detail
          })
          
          setValidationErrors(errors)
        } else {
          Alert.alert(
            "Error",
            "Failed to create study period settings. Please try again.",
            [{ text: "OK" }]
          )
        }
      } else {
        Alert.alert(
          "Error",
          "Failed to create study period settings. Please try again.",
          [{ text: "OK" }]
        )
      }
    } finally {
      setIsCreatingPeriodSetting(false)
    }
  }
  
  // Delete period setting
  const handleDeletePeriodSetting = async (): Promise<void> => {
    if (!data?.active_period_setting) return
    
    Alert.alert(
      "Delete Period Settings",
      "Are you sure you want to delete the current period settings? This will also delete all period instances.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('accessToken')
              if (!token) throw new Error('No access token found')
              
              await axios.post(
                `${API_URL}api/deactivate-periods/`,
                {},
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              )
              
              await refreshDashboard()
              
              Alert.alert(
                "Success",
                "Study period settings deleted successfully.",
                [{ text: "OK" }]
              )
            } catch (error: any) {
              console.error('Error deleting period setting:', error)
              
              if (error.response?.status === 401) {
                await handleUnauthorized()
              } else {
                Alert.alert(
                  "Error",
                  "Failed to delete study period settings. Please try again.",
                  [{ text: "OK" }]
                )
              }
            }
          }
        }
      ]
    )
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <View className="flex-1 p-4">
        <Text className="text-red-500 text-lg font-bold">Error:</Text>
        <Text className="text-red-500">{JSON.stringify(error, null, 2)}</Text>
      </View>
    )
  }

  // Check if user is admin
  if (!data?.is_staff) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-4">
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text className="text-xl font-psemibold text-center mt-4 mb-2">Access Denied</Text>
        <Text className="text-gray-600 text-center">You don't have permission to access this page.</Text>
      </SafeAreaView>
    )
  }

  const activePeriodSetting = data?.active_period_setting as PeriodSetting | undefined
  const periodInstances = data?.org_period_instances as PeriodInstance[] | undefined

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 p-4">
        {/* Period Settings Section */}
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Text className="text-xl font-psemibold mb-4">Study Period Settings</Text>
          
          {activePeriodSetting ? (
            <View>
              <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <View className="flex-row justify-between items-start">
                  <View>
                    <Text className="font-psemibold text-lg mb-2">Active Settings</Text>
                    
                    <View className="mb-2">
                      <Text className="text-gray-600">Period Type:</Text>
                      <Text className="font-psemibold capitalize">{activePeriodSetting.period_type}</Text>
                    </View>
                    
                    <View className="mb-2">
                      <Text className="text-gray-600">Required Hours:</Text>
                      <Text className="font-psemibold">{activePeriodSetting.required_hours} hours</Text>
                    </View>
                    
                    <View className="mb-2">
                      <Text className="text-gray-600">Start Date:</Text>
                      <Text className="font-psemibold">{formatDate(activePeriodSetting.start_date)}</Text>
                    </View>
                    
                    {activePeriodSetting.period_type === 'weekly' && (
                      <View className="mb-2">
                        <Text className="text-gray-600">Due Day:</Text>
                        <Text className="font-psemibold">{getDayOfWeekName(activePeriodSetting.due_day_of_week)}</Text>
                      </View>
                    )}
                    
                    {activePeriodSetting.period_type === 'custom' && (
                      <View className="mb-2">
                        <Text className="text-gray-600">Custom Days:</Text>
                        <Text className="font-psemibold">{activePeriodSetting.custom_days} days</Text>
                      </View>
                    )}
                  </View>
                  
                  <TouchableOpacity 
                    onPress={handleDeletePeriodSetting}
                    className="bg-red-100 p-2 rounded-full"
                  >
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View className="items-center py-6">
              <Text className="text-gray-500 mb-4">No study period settings configured</Text>
              <TouchableOpacity 
                onPress={() => setShowAddPeriodSetting(true)}
                className="bg-green-600 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-psemibold">Add Study Periods</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {showAddPeriodSetting && (
            <View className="mt-4 p-4 bg-gray-50 rounded-lg">
              <Text className="text-lg font-psemibold mb-3">Create Period Settings</Text>
              
              {/* Show validation errors if any */}
              {Object.keys(validationErrors).length > 0 && (
                <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <Text className="text-red-600 font-psemibold mb-1">Please fix the following errors:</Text>
                  {Object.entries(validationErrors).map(([field, message]) => (
                    <Text key={field} className="text-red-600">
                      • {field.replace('_', ' ')}: {message}
                    </Text>
                  ))}
                </View>
              )}
              
              <View className="mb-3">
                <Text className="text-gray-600 mb-1">Period Type</Text>
                <View className="flex-row mt-1">
                  <TouchableOpacity 
                    onPress={() => {
                      setNewPeriodSetting({...newPeriodSetting, period_type: 'weekly'})
                      setShowStartDatePicker(false)
                    }}
                    className={`px-4 py-2 rounded-lg mr-2 ${newPeriodSetting.period_type === 'weekly' ? 'bg-green-600' : 'bg-gray-200'}`}
                  >
                    <Text className={newPeriodSetting.period_type === 'weekly' ? 'text-white' : 'text-gray-700'}>Weekly</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      setNewPeriodSetting({...newPeriodSetting, period_type: 'monthly'})
                      setShowStartDatePicker(false)
                    }}
                    className={`px-4 py-2 rounded-lg mr-2 ${newPeriodSetting.period_type === 'monthly' ? 'bg-green-600' : 'bg-gray-200'}`}
                  >
                    <Text className={newPeriodSetting.period_type === 'monthly' ? 'text-white' : 'text-gray-700'}>Monthly</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      setNewPeriodSetting({...newPeriodSetting, period_type: 'custom'})
                      setShowStartDatePicker(false)
                    }}
                    className={`px-4 py-2 rounded-lg ${newPeriodSetting.period_type === 'custom' ? 'bg-green-600' : 'bg-gray-200'}`}
                  >
                    <Text className={newPeriodSetting.period_type === 'custom' ? 'text-white' : 'text-gray-700'}>Custom</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View className="mb-3">
                <Text className="text-gray-600 mb-1">Required Hours</Text>
                <TextInput
                  value={newPeriodSetting.required_hours.toString()}
                  onChangeText={(text) => {
                    const hours = parseFloat(text) || 0
                    setNewPeriodSetting({...newPeriodSetting, required_hours: hours})
                  }}
                  className={`border rounded-lg p-2 bg-white ${validationErrors.required_hours ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter required hours"
                  keyboardType="numeric"
                />
                {validationErrors.required_hours && (
                  <Text className="text-red-500 text-sm mt-1">{validationErrors.required_hours}</Text>
                )}
              </View>
              
              <View className="mb-3">
                <Text className="text-gray-600 mb-1">Start Date</Text>
                <TouchableOpacity 
                  onPress={() => setShowStartDatePicker(true)}
                  className={`border rounded-lg p-2 bg-white ${validationErrors.start_date ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <Text>{newPeriodSetting.start_date.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {validationErrors.start_date && (
                  <Text className="text-red-500 text-sm mt-1">{validationErrors.start_date}</Text>
                )}
                {showStartDatePicker && (
                  <DateTimePicker
                    value={newPeriodSetting.start_date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowStartDatePicker(false)
                      if (selectedDate) {
                        setNewPeriodSetting({...newPeriodSetting, start_date: selectedDate})
                      }
                    }}
                  />
                )}
              </View>
              
              {newPeriodSetting.period_type === 'weekly' && (
                <View className="mb-3">
                  <Text className="text-gray-600 mb-1">Due Day of Week</Text>
                  <View className="flex-row flex-wrap">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <TouchableOpacity 
                        key={index}
                        onPress={() => setNewPeriodSetting({...newPeriodSetting, due_day_of_week: index})}
                        className={`px-3 py-2 rounded-lg m-1 ${
                          newPeriodSetting.due_day_of_week === index 
                            ? 'bg-green-600' 
                            : validationErrors.due_day_of_week ? 'bg-red-100' : 'bg-gray-200'
                        }`}
                      >
                        <Text className={newPeriodSetting.due_day_of_week === index ? 'text-white' : 'text-gray-700'}>{day}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {validationErrors.due_day_of_week && (
                    <Text className="text-red-500 text-sm mt-1">{validationErrors.due_day_of_week}</Text>
                  )}
                </View>
              )}
              
              {newPeriodSetting.period_type === 'custom' && (
                <View className="mb-3">
                  <Text className="text-gray-600 mb-1">Custom Days</Text>
                  <TextInput
                    value={newPeriodSetting.custom_days.toString()}
                    onChangeText={(text) => {
                      const days = parseInt(text) || 7
                      setNewPeriodSetting({...newPeriodSetting, custom_days: days})
                    }}
                    className={`border rounded-lg p-2 bg-white ${validationErrors.custom_days ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Enter number of days"
                    keyboardType="numeric"
                  />
                  {validationErrors.custom_days && (
                    <Text className="text-red-500 text-sm mt-1">{validationErrors.custom_days}</Text>
                  )}
                </View>
              )}
              
              <View className="flex-row mt-4">
                <TouchableOpacity 
                  onPress={() => {
                    setShowAddPeriodSetting(false)
                    setValidationErrors({})
                  }}
                  className="bg-gray-300 px-4 py-2 rounded-lg mr-2"
                >
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleCreatePeriodSetting}
                  disabled={isCreatingPeriodSetting}
                  className={`${isCreatingPeriodSetting ? 'bg-gray-400' : 'bg-green-600'} px-4 py-2 rounded-lg flex-1`}
                >
                  <Text className="text-white font-psemibold text-center">
                    {isCreatingPeriodSetting ? 'Creating...' : 'Create Settings'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        
        {/* Period Instances Section */}
        {activePeriodSetting && (
          <View className="bg-white rounded-lg shadow-sm p-4 mb-4 flex-1">
            <Text className="text-xl font-psemibold mb-4">Study Period Instances</Text>
            
            {periodInstances && periodInstances.length > 0 ? (
              <ScrollView 
                className="flex-1" 
                contentContainerStyle={{ paddingBottom: 10 }}
                showsVerticalScrollIndicator={true}
              >
                {periodInstances
                  .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                  .map(period => (
                    <View 
                      key={period.id}
                      className={`p-4 rounded-lg mb-3 ${period.is_active ? 'bg-green-50 border border-green-200' : 'bg-gray-100'}`}
                    >
                      <View className="flex-row justify-between items-start">
                        <View>
                          <View className="flex-row items-center">
                            <Text className="font-psemibold text-lg">
                              {formatDate(period.start_date)} - {formatDate(period.end_date)}
                            </Text>
                            {period.is_active && (
                              <View className="bg-green-100 px-2 py-1 rounded-full ml-2">
                                <Text className="text-green-600 text-xs font-psemibold">Active</Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-gray-600 mt-1">
                            {activePeriodSetting.required_hours} hours required
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
              </ScrollView>
            ) : (
              <Text className="text-gray-500 italic text-center py-4">No period instances created yet</Text>
            )}
            
            <Text className="text-gray-500 text-sm mt-2 italic">
              Period instances are automatically generated based on your settings
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

export default StudyPeriodsManagement 