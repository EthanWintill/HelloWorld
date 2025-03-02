import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Switch, Platform } from 'react-native'
import React, { useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import DatePicker from 'react-native-date-picker'

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

const StudyPeriodsManagement = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState
  
  const [periods, setPeriods] = useState(MOCK_PERIODS)
  const [showAddPeriod, setShowAddPeriod] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<any>(null)
  
  const [newPeriod, setNewPeriod] = useState({
    name: '',
    start_date: new Date(),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // One week from now
    required_hours: 10,
    period_type: 'weekly'
  })
  
  // Date picker states
  const [openStartDatePicker, setOpenStartDatePicker] = useState(false)
  const [openEndDatePicker, setOpenEndDatePicker] = useState(false)
  const [openEditStartDatePicker, setOpenEditStartDatePicker] = useState(false)
  const [openEditEndDatePicker, setOpenEditEndDatePicker] = useState(false)

  const handleAddPeriod = () => {
    if (!newPeriod.name.trim()) {
      Alert.alert('Error', 'Please enter a period name')
      return
    }

    const newPeriodObj = {
      id: periods.length + 1,
      ...newPeriod,
      start_date: newPeriod.start_date.toISOString(),
      end_date: newPeriod.end_date.toISOString(),
      is_active: false
    }

    setPeriods([...periods, newPeriodObj])
    setShowAddPeriod(false)
    
    // Reset form
    setNewPeriod({
      name: '',
      start_date: new Date(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      required_hours: 10,
      period_type: 'weekly'
    })
    
    Alert.alert('Success', 'New study period has been created')
  }

  const handleEditPeriod = (period: any) => {
    setEditingPeriod({
      ...period,
      start_date: new Date(period.start_date),
      end_date: new Date(period.end_date)
    })
  }

  const handleUpdatePeriod = () => {
    if (!editingPeriod) return
    
    const updatedPeriods = periods.map(period => 
      period.id === editingPeriod.id 
        ? {
            ...editingPeriod,
            start_date: editingPeriod.start_date.toISOString(),
            end_date: editingPeriod.end_date.toISOString()
          } 
        : period
    )
    
    setPeriods(updatedPeriods)
    setEditingPeriod(null)
    
    Alert.alert('Success', 'Study period has been updated')
  }

  const handleDeletePeriod = (periodId: number) => {
    Alert.alert(
      'Delete Period',
      'Are you sure you want to delete this study period?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setPeriods(periods.filter(period => period.id !== periodId))
          }
        }
      ]
    )
  }

  const handleSetActivePeriod = (periodId: number) => {
    const updatedPeriods = periods.map(period => ({
      ...period,
      is_active: period.id === periodId
    }))
    
    setPeriods(updatedPeriods)
    
    Alert.alert('Success', 'Active study period has been updated')
  }

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    return date.toLocaleDateString()
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
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-psemibold">Study Periods</Text>
            <TouchableOpacity 
              onPress={() => setShowAddPeriod(!showAddPeriod)}
              className="bg-green-100 p-2 rounded-full"
            >
              <Ionicons name={showAddPeriod ? "close" : "add"} size={20} color="#16A34A" />
            </TouchableOpacity>
          </View>

          {showAddPeriod && (
            <View className="mb-6 p-3 bg-gray-50 rounded-lg">
              <Text className="text-lg font-psemibold mb-3">Create New Period</Text>
              
              <View className="mb-3">
                <Text className="text-gray-600 mb-1">Period Name</Text>
                <TextInput
                  value={newPeriod.name}
                  onChangeText={(text) => setNewPeriod({...newPeriod, name: text})}
                  className="border border-gray-300 rounded-lg p-2 bg-white"
                  placeholder="Enter period name"
                />
              </View>
              
              <View className="mb-3">
                <Text className="text-gray-600 mb-1">Start Date</Text>
                <TouchableOpacity 
                  onPress={() => setOpenStartDatePicker(true)}
                  className="border border-gray-300 rounded-lg p-2 bg-white"
                >
                  <Text>{formatDate(newPeriod.start_date)}</Text>
                </TouchableOpacity>
                <DatePicker
                  modal
                  open={openStartDatePicker}
                  date={newPeriod.start_date}
                  mode="date"
                  onConfirm={(date) => {
                    setOpenStartDatePicker(false)
                    setNewPeriod({...newPeriod, start_date: date})
                  }}
                  onCancel={() => {
                    setOpenStartDatePicker(false)
                  }}
                />
              </View>
              
              <View className="mb-3">
                <Text className="text-gray-600 mb-1">End Date</Text>
                <TouchableOpacity 
                  onPress={() => setOpenEndDatePicker(true)}
                  className="border border-gray-300 rounded-lg p-2 bg-white"
                >
                  <Text>{formatDate(newPeriod.end_date)}</Text>
                </TouchableOpacity>
                <DatePicker
                  modal
                  open={openEndDatePicker}
                  date={newPeriod.end_date}
                  mode="date"
                  onConfirm={(date) => {
                    setOpenEndDatePicker(false)
                    setNewPeriod({...newPeriod, end_date: date})
                  }}
                  onCancel={() => {
                    setOpenEndDatePicker(false)
                  }}
                />
              </View>
              
              <View className="mb-3">
                <Text className="text-gray-600 mb-1">Required Hours</Text>
                <TextInput
                  value={newPeriod.required_hours.toString()}
                  onChangeText={(text) => {
                    const hours = parseFloat(text) || 0
                    setNewPeriod({...newPeriod, required_hours: hours})
                  }}
                  className="border border-gray-300 rounded-lg p-2 bg-white"
                  placeholder="Enter required hours"
                  keyboardType="numeric"
                />
              </View>
              
              <View className="mb-3">
                <Text className="text-gray-600 mb-1">Period Type</Text>
                <View className="flex-row mt-1">
                  <TouchableOpacity 
                    onPress={() => setNewPeriod({...newPeriod, period_type: 'weekly'})}
                    className={`px-4 py-2 rounded-lg mr-2 ${newPeriod.period_type === 'weekly' ? 'bg-green-600' : 'bg-gray-200'}`}
                  >
                    <Text className={newPeriod.period_type === 'weekly' ? 'text-white' : 'text-gray-700'}>Weekly</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setNewPeriod({...newPeriod, period_type: 'monthly'})}
                    className={`px-4 py-2 rounded-lg mr-2 ${newPeriod.period_type === 'monthly' ? 'bg-green-600' : 'bg-gray-200'}`}
                  >
                    <Text className={newPeriod.period_type === 'monthly' ? 'text-white' : 'text-gray-700'}>Monthly</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setNewPeriod({...newPeriod, period_type: 'custom'})}
                    className={`px-4 py-2 rounded-lg ${newPeriod.period_type === 'custom' ? 'bg-green-600' : 'bg-gray-200'}`}
                  >
                    <Text className={newPeriod.period_type === 'custom' ? 'text-white' : 'text-gray-700'}>Custom</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity 
                onPress={handleAddPeriod}
                className="bg-green-600 p-3 rounded-lg items-center mt-2"
              >
                <Text className="text-white font-psemibold">Create Period</Text>
              </TouchableOpacity>
            </View>
          )}

          {periods.length === 0 ? (
            <Text className="text-gray-500 italic text-center py-4">No study periods created yet</Text>
          ) : (
            periods.map(period => (
              <View 
                key={period.id}
                className={`p-4 rounded-lg mb-3 ${period.is_active ? 'bg-green-50 border border-green-200' : 'bg-gray-100'}`}
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="font-psemibold text-lg">{period.name}</Text>
                      {period.is_active && (
                        <View className="bg-green-100 px-2 py-1 rounded-full ml-2">
                          <Text className="text-green-600 text-xs font-psemibold">Active</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-gray-600 mt-1">
                      {formatDate(period.start_date)} - {formatDate(period.end_date)}
                    </Text>
                    <Text className="text-gray-600">
                      {period.required_hours} hours required • {period.period_type}
                    </Text>
                  </View>
                  
                  <View className="flex-row">
                    {!period.is_active && (
                      <TouchableOpacity 
                        onPress={() => handleSetActivePeriod(period.id)}
                        className="bg-blue-100 p-2 rounded-full mr-2"
                      >
                        <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      onPress={() => handleEditPeriod(period)}
                      className="bg-yellow-100 p-2 rounded-full mr-2"
                    >
                      <Ionicons name="pencil" size={20} color="#F59E0B" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDeletePeriod(period.id)}
                      className="bg-red-100 p-2 rounded-full"
                    >
                      <Ionicons name="trash" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Edit Period Modal */}
      {editingPeriod && (
        <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center p-4">
          <View className="bg-white rounded-lg p-4 w-full max-w-md">
            <Text className="text-xl font-psemibold mb-4">Edit Period</Text>
            
            <View className="mb-3">
              <Text className="text-gray-600 mb-1">Period Name</Text>
              <TextInput
                value={editingPeriod.name}
                onChangeText={(text) => setEditingPeriod({...editingPeriod, name: text})}
                className="border border-gray-300 rounded-lg p-2"
                placeholder="Enter period name"
              />
            </View>
            
            <View className="mb-3">
              <Text className="text-gray-600 mb-1">Start Date</Text>
              <TouchableOpacity 
                onPress={() => setOpenEditStartDatePicker(true)}
                className="border border-gray-300 rounded-lg p-2"
              >
                <Text>{formatDate(editingPeriod.start_date)}</Text>
              </TouchableOpacity>
              <DatePicker
                modal
                open={openEditStartDatePicker}
                date={editingPeriod.start_date}
                mode="date"
                onConfirm={(date) => {
                  setOpenEditStartDatePicker(false)
                  setEditingPeriod({...editingPeriod, start_date: date})
                }}
                onCancel={() => {
                  setOpenEditStartDatePicker(false)
                }}
              />
            </View>
            
            <View className="mb-3">
              <Text className="text-gray-600 mb-1">End Date</Text>
              <TouchableOpacity 
                onPress={() => setOpenEditEndDatePicker(true)}
                className="border border-gray-300 rounded-lg p-2"
              >
                <Text>{formatDate(editingPeriod.end_date)}</Text>
              </TouchableOpacity>
              <DatePicker
                modal
                open={openEditEndDatePicker}
                date={editingPeriod.end_date}
                mode="date"
                onConfirm={(date) => {
                  setOpenEditEndDatePicker(false)
                  setEditingPeriod({...editingPeriod, end_date: date})
                }}
                onCancel={() => {
                  setOpenEditEndDatePicker(false)
                }}
              />
            </View>
            
            <View className="mb-3">
              <Text className="text-gray-600 mb-1">Required Hours</Text>
              <TextInput
                value={editingPeriod.required_hours.toString()}
                onChangeText={(text) => {
                  const hours = parseFloat(text) || 0
                  setEditingPeriod({...editingPeriod, required_hours: hours})
                }}
                className="border border-gray-300 rounded-lg p-2"
                placeholder="Enter required hours"
                keyboardType="numeric"
              />
            </View>
            
            <View className="flex-row justify-end mt-4">
              <TouchableOpacity 
                onPress={() => setEditingPeriod(null)}
                className="bg-gray-200 px-4 py-2 rounded-lg mr-2"
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleUpdatePeriod}
                className="bg-green-600 px-4 py-2 rounded-lg"
              >
                <Text className="text-white">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

export default StudyPeriodsManagement 