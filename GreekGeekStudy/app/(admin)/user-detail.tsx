import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Switch, FlatList, Modal } from 'react-native'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { API_URL } from '@/constants'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Mock data for user sessions
const MOCK_SESSIONS = [
  { 
    id: 1, 
    start_time: '2023-02-15T09:30:00Z', 
    end_time: '2023-02-15T11:45:00Z',
    hours: 2.25,
    location: 'Alkek Library'
  },
  { 
    id: 2, 
    start_time: '2023-02-16T14:00:00Z', 
    end_time: '2023-02-16T17:30:00Z',
    hours: 3.5,
    location: 'Alkek Library'
  },
  { 
    id: 3, 
    start_time: '2023-02-18T10:15:00Z', 
    end_time: '2023-02-18T13:45:00Z',
    hours: 3.5,
    location: 'Alkek Library'
  },
  { 
    id: 4, 
    start_time: '2023-02-20T16:00:00Z', 
    end_time: '2023-02-20T19:15:00Z',
    hours: 3.25,
    location: 'Alkek Library'
  },
]

// Mock data for users
const MOCK_USERS = [
  { 
    id: 1, 
    first_name: 'John', 
    last_name: 'Doe', 
    email: 'john@example.com', 
    phone_number: '555-123-4567',
    group: 'Freshmen',
    hours_studied: 12.5,
    is_active: true,
    sessions: MOCK_SESSIONS
  },
  { 
    id: 2, 
    first_name: 'Jane', 
    last_name: 'Smith', 
    email: 'jane@example.com', 
    phone_number: '555-987-6543',
    group: 'Sophomores',
    hours_studied: 8.2,
    is_active: true,
    sessions: MOCK_SESSIONS.slice(0, 2)
  },
  { 
    id: 3, 
    first_name: 'Bob', 
    last_name: 'Johnson', 
    email: 'bob@example.com', 
    phone_number: '555-456-7890',
    group: 'Juniors',
    hours_studied: 15.7,
    is_active: true,
    sessions: MOCK_SESSIONS.slice(1, 4)
  },
]

const UserDetail = () => {
  const { dashboardState, refreshDashboard, handleUnauthorized } = useDashboard()
  const { isLoading, error, data } = dashboardState
  const params = useLocalSearchParams()
  const userId = params.id ? parseInt(params.id as string) : null
  
  const [user, setUser] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState<any>(null)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [currentPeriod, setCurrentPeriod] = useState<any>(null)
  
  // New state for session editing
  const [isHoursModalVisible, setIsHoursModalVisible] = useState(false)
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [editedHours, setEditedHours] = useState('')
  const [isSessionUpdateLoading, setIsSessionUpdateLoading] = useState(false)

  // Find user by ID from actual data
  useEffect(() => {
    if (userId && data && data.org_users) {
      const foundUser = data.org_users.find((u: any) => u.id === userId)
      setUser(foundUser || null)
      setEditedUser(foundUser ? {...foundUser} : null)
    }
  }, [userId, data])

  // Find current active period instance
  useEffect(() => {
    if (data && data.org_period_instances && data.org_period_instances.length > 0) {
      // Sort by start date (newest first) and find the first active one
      const activePeriods = [...data.org_period_instances]
        .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
        .filter(p => p.is_active)
      
      if (activePeriods.length > 0) {
        setCurrentPeriod(activePeriods[0])
      }
    }
  }, [data])

  // Fetch user sessions function to be reused
  const fetchSessions = async () => {
    if (!userId) return
    
    setSessionsLoading(true)
    try {
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) throw new Error('No access token found')

      const response = await axios.get(
        `${API_URL}api/users/${userId}/sessions/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }
      )
      
      setSessions(response.data)
    } catch (error: any) {
      console.error('Error fetching user sessions:', error)
      
      if (error.response?.status === 401) {
        await handleUnauthorized()
      }
    } finally {
      setSessionsLoading(false)
    }
  }

  // Fetch user sessions when user is available
  useEffect(() => {
    fetchSessions()
  }, [userId, handleUnauthorized])

  // Filter sessions based on current period timeframe
  const filteredSessions = useMemo(() => {
    if (!sessions.length || !currentPeriod) return []
    
    const periodStart = new Date(currentPeriod.start_date).getTime()
    const periodEnd = new Date(currentPeriod.end_date).getTime()
    
    return sessions.filter(session => {
      const sessionTime = new Date(session.start_time).getTime()
      return sessionTime >= periodStart && sessionTime <= periodEnd
    })
  }, [sessions, currentPeriod])

  // Format date for session display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Format duration for session display
  const formatDuration = (hours: number | null) => {
    if (hours === null) {
      return 'In progress'
    }
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}h ${m}m`
  }

  // Get location name from location ID
  const getLocationName = useCallback((locationId: number | null) => {
    if (!locationId || !data || !data.org_locations) return 'No location'
    
    const location = data.org_locations.find((loc: any) => loc.id === locationId)
    return location ? location.name : 'Unknown location'
  }, [data])

  const handleSave = async () => {
    if (!editedUser || !userId) return
    
    setUpdateLoading(true)
    try {
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) throw new Error('No access token found')

      const response = await axios.put(
        `${API_URL}api/user/${userId}/`, 
        editedUser,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      
      await refreshDashboard()
      setUser(response.data)
      setIsEditing(false)
      
      Alert.alert(
        "Success",
        "User information has been updated.",
        [{ text: "OK" }]
      )
    } catch (error: any) {
      console.error('Error updating user:', error)
      
      if (error.response?.status === 401) {
        await handleUnauthorized()
      } else {
        Alert.alert(
          "Error",
          "Failed to update user information. Please try again.",
          [{ text: "OK" }]
        )
      }
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this user? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('accessToken')
              if (!token) throw new Error('No access token found')

              await axios.delete(
                `${API_URL}api/user/${userId}/`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              )
              
              // Show success message and navigate back
              Alert.alert(
                "Success",
                "User has been deleted.",
                [{ 
                  text: "OK",
                  onPress: () => {
                    // First navigate back
                    router.back()
                    
                    // Then refresh dashboard after a small delay
                    setTimeout(() => {
                      refreshDashboard()
                    }, 300)
                  }
                }]
              )
            } catch (error: any) {
              console.error('Error deleting user:', error)
              
              if (error.response?.status === 401) {
                await handleUnauthorized()
              } else {
                Alert.alert(
                  "Error",
                  "Failed to delete user. Please try again.",
                  [{ text: "OK" }]
                )
              }
            }
          }
        }
      ]
    )
  }

  const handleResetPassword = async () => {
    Alert.alert(
      "Confirm Password Reset",
      "Are you sure you want to reset this user's password? They will receive an email with instructions.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('accessToken')
              if (!token) throw new Error('No access token found')

              await axios.post(
                `${API_URL}api/user/${userId}/reset-password/`,
                {},
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              )
              
              Alert.alert(
                "Success",
                "Password reset email has been sent to the user.",
                [{ text: "OK" }]
              )
            } catch (error: any) {
              console.error('Error resetting password:', error)
              
              if (error.response?.status === 401) {
                await handleUnauthorized()
              } else {
                Alert.alert(
                  "Error",
                  "Failed to reset password. Please try again.",
                  [{ text: "OK" }]
                )
              }
            }
          }
        }
      ]
    )
  }

  // Handle session hours update
  const handleUpdateSessionHours = async () => {
    if (!selectedSession) return
    
    // If editedHours is empty but we're updating a session, this means 
    // we want to set it to null (in progress)
    let newHours: number | null = null
    
    if (editedHours.trim() !== '') {
      newHours = parseFloat(editedHours)
      if (isNaN(newHours) || newHours <= 0) {
        Alert.alert("Invalid Input", "Please enter a valid number of hours greater than 0")
        return
      }
    }
    
    setIsSessionUpdateLoading(true)
    try {
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) throw new Error('No access token found')

      await axios.patch(
        `${API_URL}api/sessions/${selectedSession.id}/`,
        { hours: newHours },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      
      // Close modal and refresh data
      setIsHoursModalVisible(false)
      setSelectedSession(null)
      setEditedHours('')
      
      await refreshDashboard()
      // Refetch the sessions to update the view
      await fetchSessions()
      
      Alert.alert(
        "Success",
        newHours === null 
          ? "Session marked as in progress." 
          : "Session hours have been updated.",
        [{ text: "OK" }]
      )
    } catch (error: any) {
      console.error('Error updating session hours:', error)
      
      if (error.response?.status === 401) {
        await handleUnauthorized()
      } else {
        Alert.alert(
          "Error",
          "Failed to update session hours. Please try again.",
          [{ text: "OK" }]
        )
      }
    } finally {
      setIsSessionUpdateLoading(false)
    }
  }
  
  // Handle session deletion
  const handleDeleteSession = async (session: any) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this session? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('accessToken')
              if (!token) throw new Error('No access token found')

              await axios.delete(
                `${API_URL}api/sessions/${session.id}/`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              )
              
              // Refresh data
              await refreshDashboard()
              // Refetch the sessions to update the view
              await fetchSessions()
              
              Alert.alert(
                "Success",
                "Session has been deleted.",
                [{ text: "OK" }]
              )
            } catch (error: any) {
              console.error('Error deleting session:', error)
              
              if (error.response?.status === 401) {
                await handleUnauthorized()
              } else {
                Alert.alert(
                  "Error",
                  "Failed to delete session. Please try again.",
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

  if (!user) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-4">
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text className="text-xl font-psemibold text-center mt-4 mb-2">User Not Found</Text>
        <Text className="text-gray-600 text-center">The requested user could not be found.</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 p-4">
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-psemibold">User Information</Text>
            {!isEditing ? (
              <TouchableOpacity 
                onPress={() => setIsEditing(true)}
                className="bg-green-100 p-2 rounded-full"
              >
                <Ionicons name="pencil" size={20} color="#16A34A" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                onPress={handleSave}
                disabled={updateLoading}
                className={`bg-green-600 px-4 py-2 rounded-lg ${updateLoading ? 'opacity-70' : ''}`}
              >
                <Text className="text-white font-psemibold">
                  {updateLoading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-gray-600 mb-1">First Name</Text>
            {isEditing ? (
              <TextInput
                value={editedUser.first_name}
                onChangeText={(text) => setEditedUser({...editedUser, first_name: text})}
                className="border border-gray-300 rounded-lg p-2"
                placeholder="Enter first name"
              />
            ) : (
              <Text className="text-lg">{user.first_name}</Text>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-gray-600 mb-1">Last Name</Text>
            {isEditing ? (
              <TextInput
                value={editedUser.last_name}
                onChangeText={(text) => setEditedUser({...editedUser, last_name: text})}
                className="border border-gray-300 rounded-lg p-2"
                placeholder="Enter last name"
              />
            ) : (
              <Text className="text-lg">{user.last_name}</Text>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-gray-600 mb-1">Email</Text>
            {isEditing ? (
              <TextInput
                value={editedUser.email}
                onChangeText={(text) => setEditedUser({...editedUser, email: text})}
                className="border border-gray-300 rounded-lg p-2"
                placeholder="Enter email"
                keyboardType="email-address"
              />
            ) : (
              <Text className="text-lg">{user.email}</Text>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-gray-600 mb-1">Phone Number</Text>
            {isEditing ? (
              <TextInput
                value={editedUser.phone_number}
                onChangeText={(text) => setEditedUser({...editedUser, phone_number: text})}
                className="border border-gray-300 rounded-lg p-2"
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text className="text-lg">{user.phone_number}</Text>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-gray-600 mb-1">Group</Text>
            {isEditing ? (
              <TextInput
                value={editedUser.group || ''}
                onChangeText={(text) => setEditedUser({...editedUser, group: text || null})}
                className="border border-gray-300 rounded-lg p-2"
                placeholder="Enter group"
              />
            ) : (
              <Text className="text-lg">{user.group || 'Not assigned'}</Text>
            )}
          </View>

          
        </View>

        {/* Sessions section */}
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4 flex-1">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-psemibold">Study Sessions</Text>
            <View className="bg-green-100 px-3 py-1 rounded-lg">
              <Text className="text-green-600 font-psemibold">
                {sessionsLoading ? '...' : filteredSessions.reduce((total, session) => total + (session.hours || 0), 0).toFixed(1)}h
              </Text>
            </View>
          </View>
          
          {currentPeriod && (
            <Text className="text-gray-600 mb-2">
              Current Period: {new Date(currentPeriod.start_date).toLocaleDateString()} - {new Date(currentPeriod.end_date).toLocaleDateString()}
            </Text>
          )}
          
          {sessionsLoading ? (
            <View className="py-4 items-center">
              <Text className="text-gray-500">Loading sessions...</Text>
            </View>
          ) : filteredSessions.length === 0 ? (
            <Text className="text-gray-500 italic text-center py-4">No study sessions recorded for this period</Text>
          ) : (
            <FlatList
              data={filteredSessions}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item: session }) => (
                <View 
                  className="p-3 bg-gray-100 rounded-lg mb-2"
                >
                  <View className="flex-row justify-between items-center">
                    <Text className="font-psemibold">{formatDate(session.start_time)}</Text>
                    <Text className={`font-psemibold ${session.hours === null ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatDuration(session.hours)}
                    </Text>
                  </View>
                  <Text className="text-gray-600 text-sm mb-2">
                    {getLocationName(session.location)}
                  </Text>
                  <View className="flex-row justify-end mt-1">
                    <TouchableOpacity 
                      onPress={() => {
                        setSelectedSession(session)
                        setEditedHours(session.hours !== null ? session.hours.toString() : '')
                        setIsHoursModalVisible(true)
                      }}
                      className="bg-blue-100 p-2 rounded-full mr-2"
                    >
                      <Ionicons name="pencil" size={16} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDeleteSession(session)}
                      className="bg-red-100 p-2 rounded-full"
                    >
                      <Ionicons name="trash" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ flexGrow: 1 }}
            />
          )}
        </View>

        <View className="flex-row justify-between mb-4">
          <TouchableOpacity 
            onPress={handleDeleteUser}
            className="bg-red-500 p-3 rounded-lg flex-1 mr-2 items-center"
          >
            <Text className="text-white font-psemibold">Delete User</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleResetPassword}
            className="bg-blue-500 p-3 rounded-lg flex-1 ml-2 items-center"
          >
            <Text className="text-white font-psemibold">Reset Password</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hours Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isHoursModalVisible}
        onRequestClose={() => {
          setIsHoursModalVisible(false)
          setSelectedSession(null)
          setEditedHours('')
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-lg p-6 w-4/5 shadow-lg">
            <Text className="text-xl font-psemibold mb-4 text-center">Edit Session Hours</Text>
            
            {selectedSession && (
              <View className="mb-4">
                <Text className="text-gray-600 mb-2">Date: {formatDate(selectedSession.start_time)}</Text>
                <Text className="text-gray-600 mb-4">Location: {getLocationName(selectedSession.location)}</Text>
                
                <Text className="font-psemibold mb-1">Hours:</Text>
                <TextInput
                  value={editedHours}
                  onChangeText={setEditedHours}
                  className="border border-gray-300 rounded-lg p-3 text-lg"
                  keyboardType="numeric"
                  placeholder="Leave empty to mark as in-progress"
                  autoFocus
                />
                <Text className="text-gray-500 text-sm mt-1">
                  {selectedSession.hours === null 
                    ? "This session is currently in progress." 
                    : "Enter hours or leave empty to mark as in-progress."}
                </Text>
              </View>
            )}
            
            <View className="flex-row justify-between mt-2">
              <TouchableOpacity 
                onPress={() => {
                  setIsHoursModalVisible(false)
                  setSelectedSession(null)
                  setEditedHours('')
                }}
                className="bg-gray-200 py-3 px-5 rounded-lg flex-1 mr-2 items-center"
              >
                <Text className="font-psemibold">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleUpdateSessionHours}
                disabled={isSessionUpdateLoading}
                className={`bg-blue-500 py-3 px-5 rounded-lg flex-1 ml-2 items-center ${isSessionUpdateLoading ? 'opacity-70' : ''}`}
              >
                <Text className="text-white font-psemibold">
                  {isSessionUpdateLoading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

export default UserDetail 