import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Switch, Platform } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_URL } from '@/constants'
import { Card, EmptyState, ProgressBar, ScreenHeader } from '../../components/Design'

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
    due_day_of_week: 4, // Friday (Monday=0, so Friday=4)
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
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
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
        <Text className="text-gg-error text-lg font-bold">Error:</Text>
        <Text className="text-gg-error">{JSON.stringify(error, null, 2)}</Text>
      </View>
    )
  }

  // Check if user is admin
  if (!data?.is_staff) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-4">
        <Ionicons name="alert-circle" size={64} color="#ba1a1a" />
        <Text className="text-xl font-psemibold text-center mt-4 mb-2">Access Denied</Text>
        <Text className="text-gg-muted text-center">You don't have permission to access this page.</Text>
      </SafeAreaView>
    )
  }

  const activePeriodSetting = data?.active_period_setting as PeriodSetting | undefined
  const periodInstances = data?.org_period_instances as PeriodInstance[] | undefined

  return (
    <SafeAreaView className="flex-1 bg-gg-bg">
      <ScreenHeader
        title="Study Periods"
        subtitle={activePeriodSetting ? `${activePeriodSetting.required_hours} required hours` : 'No active rules configured'}
        right={(
          <View className="h-10 w-10 rounded-full bg-gg-surfaceLow items-center justify-center">
            <Ionicons name="calendar-outline" size={22} color="#006b2c" />
          </View>
        )}
      />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <Card className="mb-4">
          <Text className="text-lg font-psemibold mb-4 text-gg-text">Study Period Settings</Text>
          
          {activePeriodSetting ? (
            <View>
              <View className="bg-gg-surfaceLow border border-gg-outlineVariant rounded-lg p-4 mb-4">
                <View className="flex-row justify-between items-start">
                  <View>
                    <Text className="font-psemibold text-gg-text text-lg mb-2">Active Settings</Text>
                    
                    <View className="mb-2">
                      <Text className="text-gg-muted font-pregular">Period Type</Text>
                      <Text className="font-psemibold text-gg-text capitalize">{activePeriodSetting.period_type}</Text>
                    </View>
                    
                    <View className="mb-2">
                      <Text className="text-gg-muted font-pregular">Required Hours</Text>
                      <Text className="font-psemibold text-gg-text">{activePeriodSetting.required_hours} hours</Text>
                    </View>
                    
                    <View className="mb-2">
                      <Text className="text-gg-muted font-pregular">Start Date</Text>
                      <Text className="font-psemibold text-gg-text">{formatDate(activePeriodSetting.start_date)}</Text>
                    </View>
                    
                    {activePeriodSetting.period_type === 'weekly' && (
                      <View className="mb-2">
                        <Text className="text-gg-muted font-pregular">Due Day</Text>
                        <Text className="font-psemibold text-gg-text">{getDayOfWeekName(activePeriodSetting.due_day_of_week)}</Text>
                      </View>
                    )}
                    
                    {activePeriodSetting.period_type === 'custom' && (
                      <View className="mb-2">
                        <Text className="text-gg-muted font-pregular">Custom Days</Text>
                        <Text className="font-psemibold text-gg-text">{activePeriodSetting.custom_days} days</Text>
                      </View>
                    )}
                  </View>
                  
                  <TouchableOpacity 
                    onPress={handleDeletePeriodSetting}
                    className="bg-[#ffdad6] p-2 rounded-full"
                  >
                    <Ionicons name="trash" size={20} color="#ba1a1a" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View className="items-center py-6">
              <EmptyState icon="calendar-outline" title="No period rules" message="Create a rule to start tracking required study hours." />
              <TouchableOpacity 
                onPress={() => setShowAddPeriodSetting(true)}
                className="bg-gg-primary px-4 py-3 rounded-lg"
              >
                <Text className="text-white font-psemibold">Add Study Periods</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {showAddPeriodSetting && (
            <View className="mt-4 p-4 bg-gg-bg border border-gg-outlineVariant rounded-lg">
              <Text className="text-lg font-psemibold mb-3 text-gg-text">Create Period Settings</Text>
              
              {/* Show validation errors if any */}
              {Object.keys(validationErrors).length > 0 && (
                <View className="bg-[#ffdad6] border border-[#ffb4ab] rounded-lg p-3 mb-4">
                  <Text className="text-gg-error font-psemibold mb-1">Please fix the following errors:</Text>
                  {Object.entries(validationErrors).map(([field, message]) => (
                    <Text key={field} className="text-gg-error">
                      • {field.replace('_', ' ')}: {message}
                    </Text>
                  ))}
                </View>
              )}
              
              <View className="mb-3">
                <Text className="text-gg-muted mb-1">Period Type</Text>
                <View className="flex-row mt-1">
                  <TouchableOpacity 
                    onPress={() => {
                      setNewPeriodSetting({...newPeriodSetting, period_type: 'weekly'})
                      setShowStartDatePicker(false)
                    }}
                  className={`px-4 py-2 rounded-full mr-2 ${newPeriodSetting.period_type === 'weekly' ? 'bg-gg-primary' : 'bg-gg-surface border border-gg-outlineVariant'}`}
                  >
                    <Text className={newPeriodSetting.period_type === 'weekly' ? 'text-white' : 'text-gg-muted'}>Weekly</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      setNewPeriodSetting({...newPeriodSetting, period_type: 'monthly'})
                      setShowStartDatePicker(false)
                    }}
                  className={`px-4 py-2 rounded-full mr-2 ${newPeriodSetting.period_type === 'monthly' ? 'bg-gg-primary' : 'bg-gg-surface border border-gg-outlineVariant'}`}
                  >
                    <Text className={newPeriodSetting.period_type === 'monthly' ? 'text-white' : 'text-gg-muted'}>Monthly</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      setNewPeriodSetting({...newPeriodSetting, period_type: 'custom'})
                      setShowStartDatePicker(false)
                    }}
                  className={`px-4 py-2 rounded-full ${newPeriodSetting.period_type === 'custom' ? 'bg-gg-primary' : 'bg-gg-surface border border-gg-outlineVariant'}`}
                  >
                    <Text className={newPeriodSetting.period_type === 'custom' ? 'text-white' : 'text-gg-muted'}>Custom</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View className="mb-3">
                <Text className="text-gg-muted mb-1">Required Hours</Text>
                <TextInput
                  value={newPeriodSetting.required_hours.toString()}
                  onChangeText={(text) => {
                    const hours = parseFloat(text) || 0
                    setNewPeriodSetting({...newPeriodSetting, required_hours: hours})
                  }}
                  className={`border rounded-lg p-2 bg-gg-surface ${validationErrors.required_hours ? 'border-gg-error' : 'border-gg-outline'}`}
                  placeholder="Enter required hours"
                  keyboardType="numeric"
                />
                {validationErrors.required_hours && (
                  <Text className="text-gg-error text-sm mt-1">{validationErrors.required_hours}</Text>
                )}
              </View>
              
              <View className="mb-3">
                <Text className="text-gg-muted mb-1">Start Date</Text>
                <TouchableOpacity 
                  onPress={() => setShowStartDatePicker(true)}
                  className={`border rounded-lg p-2 bg-gg-surface ${validationErrors.start_date ? 'border-gg-error' : 'border-gg-outline'}`}
                >
                  <Text>{newPeriodSetting.start_date.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {validationErrors.start_date && (
                  <Text className="text-gg-error text-sm mt-1">{validationErrors.start_date}</Text>
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
                  <Text className="text-gg-muted mb-1">Due Day of Week</Text>
                  <View className="flex-row flex-wrap">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                      <TouchableOpacity 
                        key={index}
                        onPress={() => setNewPeriodSetting({...newPeriodSetting, due_day_of_week: index})}
                        className={`px-3 py-2 rounded-lg m-1 ${
                          newPeriodSetting.due_day_of_week === index 
                            ? 'bg-gg-primary' 
                            : validationErrors.due_day_of_week ? 'bg-[#ffdad6]' : 'bg-gg-surfaceHighest'
                        }`}
                      >
                        <Text className={newPeriodSetting.due_day_of_week === index ? 'text-white' : 'text-gg-muted'}>{day}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {validationErrors.due_day_of_week && (
                    <Text className="text-gg-error text-sm mt-1">{validationErrors.due_day_of_week}</Text>
                  )}
                </View>
              )}
              
              {newPeriodSetting.period_type === 'custom' && (
                <View className="mb-3">
                  <Text className="text-gg-muted mb-1">Custom Days</Text>
                  <TextInput
                    value={newPeriodSetting.custom_days.toString()}
                    onChangeText={(text) => {
                      const days = parseInt(text) || 7
                      setNewPeriodSetting({...newPeriodSetting, custom_days: days})
                    }}
                    className={`border rounded-lg p-2 bg-gg-surface ${validationErrors.custom_days ? 'border-gg-error' : 'border-gg-outline'}`}
                    placeholder="Enter number of days"
                    keyboardType="numeric"
                  />
                  {validationErrors.custom_days && (
                    <Text className="text-gg-error text-sm mt-1">{validationErrors.custom_days}</Text>
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
                  className={`${isCreatingPeriodSetting ? 'bg-gray-400' : 'bg-gg-primary'} px-4 py-2 rounded-lg flex-1`}
                >
                  <Text className="text-white font-psemibold text-center">
                    {isCreatingPeriodSetting ? 'Creating...' : 'Create Settings'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Card>
        
        {activePeriodSetting && (
          <Card className="mb-4">
            <Text className="text-lg font-psemibold mb-4 text-gg-text">Study Period Instances</Text>
            
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
                      className={`p-4 rounded-lg mb-3 border ${period.is_active ? 'bg-gg-surfaceLow border-gg-outlineVariant' : 'bg-gg-bg border-gg-outlineVariant'}`}
                    >
                      <View className="flex-row justify-between items-start">
                        <View>
                          <View className="flex-row items-center">
                            <Text className="font-psemibold text-gg-text">
                              {formatDate(period.start_date)} - {formatDate(period.end_date)}
                            </Text>
                            {period.is_active && (
                              <View className="bg-gg-surfaceLow px-2 py-1 rounded-full ml-2">
                                <Text className="text-gg-primary text-xs font-psemibold">Active</Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-gg-muted font-pregular mt-1">
                            {activePeriodSetting.required_hours} hours required
                          </Text>
                          <View className="mt-3">
                            <ProgressBar value={period.is_active ? 100 : 0} />
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
              </ScrollView>
            ) : (
              <EmptyState icon="calendar-clear-outline" title="No instances yet" message="Instances are generated from the active rule." />
            )}
            
            <Text className="text-gg-muted text-sm mt-2 italic">
              Period instances are automatically generated based on your settings
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default StudyPeriodsManagement 
