import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Switch } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'

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
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState
  const params = useLocalSearchParams()
  const userId = params.id ? parseInt(params.id as string) : null
  
  const [user, setUser] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState<any>(null)

  // Find user by ID
  useEffect(() => {
    if (userId) {
      const foundUser = MOCK_USERS.find(u => u.id === userId)
      setUser(foundUser || null)
      setEditedUser(foundUser ? {...foundUser} : null)
    }
  }, [userId])

  const handleSave = () => {
    if (!editedUser) return
    
    // This would normally call an API to update the user
    setUser({...editedUser})
    setIsEditing(false)
    
    Alert.alert(
      "Success",
      "User information has been updated.",
      [{ text: "OK" }]
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}h ${m}m`
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
      <ScrollView className="flex-1 p-4">
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
                className="bg-green-600 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-psemibold">Save</Text>
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

          <View className="mb-4 flex-row justify-between items-center">
            <Text className="text-gray-600">Active Status</Text>
            {isEditing ? (
              <Switch
                value={editedUser.is_active}
                onValueChange={(value) => setEditedUser({...editedUser, is_active: value})}
                trackColor={{ false: "#767577", true: "#16A34A" }}
                thumbColor="#f4f3f4"
              />
            ) : (
              <View className={`px-3 py-1 rounded-full ${user.is_active ? 'bg-green-100' : 'bg-red-100'}`}>
                <Text className={user.is_active ? 'text-green-600' : 'text-red-600'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Text className="text-xl font-psemibold mb-4">Study Sessions</Text>
          
          <View className="flex-row justify-between items-center mb-2">
            <Text className="font-psemibold">Total Hours</Text>
            <Text className="text-lg text-green-600 font-psemibold">{user.hours_studied}h</Text>
          </View>
          
          {user.sessions.length === 0 ? (
            <Text className="text-gray-500 italic text-center py-4">No study sessions recorded</Text>
          ) : (
            user.sessions.map((session: any) => (
              <View 
                key={session.id}
                className="p-3 bg-gray-100 rounded-lg mb-2"
              >
                <View className="flex-row justify-between items-center">
                  <Text className="font-psemibold">{formatDate(session.start_time)}</Text>
                  <Text className="text-green-600 font-psemibold">{formatDuration(session.hours)}</Text>
                </View>
                <Text className="text-gray-600 text-sm">
                  {session.location} • Ended: {formatDate(session.end_time)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View className="flex-row justify-between mb-4">
          <TouchableOpacity 
            className="bg-red-500 p-3 rounded-lg flex-1 mr-2 items-center"
          >
            <Text className="text-white font-psemibold">Delete User</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="bg-blue-500 p-3 rounded-lg flex-1 ml-2 items-center"
          >
            <Text className="text-white font-psemibold">Reset Password</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default UserDetail 