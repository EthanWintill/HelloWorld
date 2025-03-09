import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Modal } from 'react-native'
import React, { useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_URL } from '@/constants'
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';


const OrganizationManagement = () => {
  const { dashboardState, refreshDashboard, handleUnauthorized } = useDashboard()
  const { isLoading, error, data } = dashboardState

  const [orgName, setOrgName] = useState('')
  const [school, setSchool] = useState('')
  const [regCode, setRegCode] = useState('')
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [isEditingRegCode, setIsEditingRegCode] = useState(false)
  const [isSavingDetails, setIsSavingDetails] = useState(false)
  const [isSavingRegCode, setIsSavingRegCode] = useState(false)
  const [modalVisible, setModalVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationObject['coords'] | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const VISUAL_CIRCLE_SIZE = 100; // diameter in pixels

  const calculateRadiusInMeters = (region: Region) => {
    const { longitudeDelta, latitude } = region;
    const metersPerDegree = 111319.9;
    const metersPerLongitudeDegree = Math.cos(latitude * (Math.PI / 180)) * metersPerDegree;
    const mapWidthInMeters = longitudeDelta * metersPerLongitudeDegree;
    const mapWidthInPixels = 400; // Approximate width of MapView
    const metersPerPixel = mapWidthInMeters / mapWidthInPixels;
    return Math.round((VISUAL_CIRCLE_SIZE / 2) * metersPerPixel);
  };

  const newLocationPopup = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status == 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location.coords);
      }
      setModalVisible(true);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Load organization data when component mounts or data changes
  React.useEffect(() => {
    if (data?.org) {
      setOrgName(data.org.name || '')
      setSchool(data.org.school || '')
      setRegCode(data.org.reg_code || '')
    }
  }, [data])

  const handleSaveDetails = async () => {
    try {
      setIsSavingDetails(true)
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) throw new Error('No access token found')

      await axios.put(
        `${API_URL}api/my-org/`,
        {
          name: orgName,
          school: school,
          reg_code: data?.org?.reg_code || ''
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      await refreshDashboard()
      setIsEditingDetails(false)
      Alert.alert(
        "Success",
        "Organization details updated successfully.",
        [{ text: "OK" }]
      )
    } catch (error) {
      console.error('Error updating organization details:', error)

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await handleUnauthorized()
      } else {
        Alert.alert(
          "Error",
          "Failed to update organization details. Please try again.",
          [{ text: "OK" }]
        )
      }
    } finally {
      setIsSavingDetails(false)
    }
  }

  const handleSaveRegCode = async () => {
    try {
      setIsSavingRegCode(true)
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) throw new Error('No access token found')

      await axios.put(
        `${API_URL}api/my-org/`,
        {
          name: data?.org?.name || '',
          school: data?.org?.school || '',
          reg_code: regCode
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      await refreshDashboard()
      setIsEditingRegCode(false)
      Alert.alert(
        "Success",
        "Registration code updated successfully.",
        [{ text: "OK" }]
      )
    } catch (error) {
      console.error('Error updating registration code:', error)

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await handleUnauthorized()
      } else {
        Alert.alert(
          "Error",
          "Failed to update registration code. Please try again.",
          [{ text: "OK" }]
        )
      }
    } finally {
      setIsSavingRegCode(false)
    }
  }

  const handleGenerateCode = () => {
    const newCode = Math.random().toString(36).substring(2, 10).toUpperCase()
    setRegCode(newCode)
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
            {!isEditingDetails ? (
              <TouchableOpacity
                onPress={() => setIsEditingDetails(true)}
                className="bg-green-100 p-2 rounded-full"
              >
                <Ionicons name="pencil" size={20} color="#16A34A" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSaveDetails}
                disabled={isSavingDetails}
                className={`${isSavingDetails ? 'bg-gray-400' : 'bg-green-600'} px-4 py-2 rounded-lg`}
              >
                <Text className="text-white font-psemibold">
                  {isSavingDetails ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-gray-600 mb-1">Organization Name</Text>
            {isEditingDetails ? (
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
            {isEditingDetails ? (
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
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-psemibold">Registration</Text>
            {!isEditingRegCode ? (
              <TouchableOpacity
                onPress={() => setIsEditingRegCode(true)}
                className="bg-green-100 p-2 rounded-full"
              >
                <Ionicons name="pencil" size={20} color="#16A34A" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSaveRegCode}
                disabled={isSavingRegCode}
                className={`${isSavingRegCode ? 'bg-gray-400' : 'bg-green-600'} px-4 py-2 rounded-lg`}
              >
                <Text className="text-white font-psemibold">
                  {isSavingRegCode ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-gray-600 mb-1">Registration Code</Text>
            <View className="flex-row items-center">
              {isEditingRegCode ? (
                <TextInput
                  value={regCode}
                  onChangeText={setRegCode}
                  className="border border-gray-300 rounded-lg p-2 flex-1"
                  placeholder="Enter or generate registration code"
                />
              ) : (
                <Text className="text-lg font-mono bg-gray-100 p-2 rounded-lg flex-1">
                  {regCode || 'No code generated'}
                </Text>
              )}
              <TouchableOpacity
                onPress={handleGenerateCode}
                disabled={!isEditingRegCode}
                className={`${!isEditingRegCode ? 'bg-gray-300' : 'bg-blue-500'} ml-2 p-2 rounded-lg`}
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
            onPress={newLocationPopup}
            className="bg-green-100 p-3 rounded-lg flex-row items-center justify-center"
          >
            <Ionicons name="add" size={20} color="#16A34A" />
            <Text className="text-green-600 font-psemibold ml-1">Add Location</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-white p-4 rounded-lg shadow-lg w-3/4">
            <Text className="text-lg font-psemibold mb-4">New Location </Text>
            <View className="relative" style={{ width: '100%', height: 200 }}>
              <MapView
                style={{ width: '100%', height: '100%' }}
                mapType="hybrid"
                showsUserLocation={true}
                followsUserLocation={true}
                initialRegion={{
                  latitude: currentLocation?.latitude || 36.130990,
                  longitude: currentLocation?.longitude || -115.174094,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                onRegionChange={setMapRegion}
              />
              <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
                <View 
                  style={{
                    width: VISUAL_CIRCLE_SIZE,
                    height: VISUAL_CIRCLE_SIZE,
                    borderRadius: VISUAL_CIRCLE_SIZE / 2,
                    backgroundColor: 'rgba(0, 255, 0, 0.2)',
                    borderColor: 'rgba(0, 255, 0, 0.5)',
                    borderWidth: 2,
                  }}
                />
              </View>
            </View>
            {/* {mapRegion && (
              <Text className="text-gray-600 text-sm mt-2 mb-2">
                Radius: {calculateRadiusInMeters(mapRegion)}m
              </Text>
            )} */}
            <TouchableOpacity
              onPress={() => setModalVisible(!modalVisible)}
              className="bg-green-600 p-2 rounded-lg"
            >
              <Text className="text-white text-center">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

export default OrganizationManagement