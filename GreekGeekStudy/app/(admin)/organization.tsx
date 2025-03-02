import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native'
import React, { useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'

const OrganizationManagement = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState
  
  const [orgName, setOrgName] = useState('')
  const [school, setSchool] = useState('')
  const [regCode, setRegCode] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Load organization data when component mounts or data changes
  React.useEffect(() => {
    if (data?.org) {
      setOrgName(data.org.name || '')
      setSchool(data.org.school || '')
      setRegCode(data.org.registration_code || '')
    }
  }, [data])

  const handleSave = () => {
    // This would normally call an API to update the organization
    Alert.alert(
      "Not Implemented",
      "This feature would save the organization details to the backend.",
      [{ text: "OK" }]
    )
    setIsEditing(false)
  }

  const handleGenerateCode = () => {
    // This would normally call an API to generate a new registration code
    const newCode = Math.random().toString(36).substring(2, 10).toUpperCase()
    setRegCode(newCode)
    
    Alert.alert(
      "New Registration Code",
      `A new code has been generated: ${newCode}`,
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
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-psemibold">Organization Details</Text>
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
            <Text className="text-gray-600 mb-1">Organization Name</Text>
            {isEditing ? (
              <TextInput
                value={orgName}
                onChangeText={setOrgName}
                className="border border-gray-300 rounded-lg p-2"
                placeholder="Enter organization name"
              />
            ) : (
              <Text className="text-lg">{orgName || 'Not set'}</Text>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-gray-600 mb-1">School</Text>
            {isEditing ? (
              <TextInput
                value={school}
                onChangeText={setSchool}
                className="border border-gray-300 rounded-lg p-2"
                placeholder="Enter school name"
              />
            ) : (
              <Text className="text-lg">{school || 'Not set'}</Text>
            )}
          </View>
        </View>

        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Text className="text-xl font-psemibold mb-4">Registration</Text>
          
          <View className="mb-4">
            <Text className="text-gray-600 mb-1">Registration Code</Text>
            <View className="flex-row items-center">
              <Text className="text-lg font-mono bg-gray-100 p-2 rounded-lg flex-1">
                {regCode || 'No code generated'}
              </Text>
              <TouchableOpacity 
                onPress={handleGenerateCode}
                className="bg-blue-500 ml-2 p-2 rounded-lg"
              >
                <Ionicons name="refresh" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <Text className="text-gray-500 text-sm mt-1">
              Share this code with users to join your organization
            </Text>
          </View>
        </View>

        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Text className="text-xl font-psemibold mb-4">Study Locations</Text>
          
          <TouchableOpacity 
            className="bg-gray-100 p-4 rounded-lg flex-row items-center justify-between mb-2"
          >
            <View>
              <Text className="font-psemibold">Alkek Library</Text>
              <Text className="text-gray-600 text-sm">Main Campus</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="bg-green-100 p-3 rounded-lg flex-row items-center justify-center"
          >
            <Ionicons name="add" size={20} color="#16A34A" />
            <Text className="text-green-600 font-psemibold ml-1">Add Location</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default OrganizationManagement 