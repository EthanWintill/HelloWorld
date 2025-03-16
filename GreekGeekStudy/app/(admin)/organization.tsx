import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Modal, ActivityIndicator, Keyboard } from 'react-native'
import React, { useState, useRef } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_URL } from '@/constants'
import MapView, { Marker, Region, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';

// Define a LocationType interface to fix the TypeScript error
interface LocationType {
  id: number;
  name: string;
  gps_lat: number;
  gps_long: number;
  gps_radius: number;
}

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
  const [editMode, setEditMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationName, setLocationName] = useState('');

  const [currentMeta, setCurrentMeta] = useState<any>({});
  const [currentLocationId, setCurrentLocationId] = useState<number | null>(null);

  const [selectedLocation, setSelectedLocation] = useState<LocationObject | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationObject['coords'] | null>(null);
  const [radius, setRadius] = useState(75);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const VISUAL_CIRCLE_SIZE = 100; // diameter in pixels

  const [addressInput, setAddressInput] = useState('');
  const [isGeocodingLoading, setIsGeocodingLoading] = useState(false);
  const [geocodingError, setGeocodingError] = useState('');
  const mapRef = useRef<MapView>(null);

  const calculateRadiusInMeters = (region: Region) => {
    const { longitudeDelta, latitude } = region;
    const metersPerDegree = 111319.9;
    const metersPerLongitudeDegree = Math.cos(latitude * (Math.PI / 180)) * metersPerDegree;
    const mapWidthInMeters = longitudeDelta * metersPerLongitudeDegree;
    const mapWidthInPixels = 400; // Approximate width of MapView
    const metersPerPixel = mapWidthInMeters / mapWidthInPixels;
    return Math.round((VISUAL_CIRCLE_SIZE / 2) * metersPerPixel);
  };

  const onRegionChange = (region: Region) => {
    if (editMode) {
      setRadius(calculateRadiusInMeters(region));
      setCurrentLocation({
        latitude: region.latitude,
        longitude: region.longitude,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      });
    }
  };

  const resetModalState = () => {
    setLocationName('');
    setAddressInput('');
    setGeocodingError('');
    setEditMode(false);
    setCreateMode(false);
    setIsSubmitting(false);
    setCurrentLocationId(null);
  };

  const closeModal = () => {
    setModalVisible(false);
    // Only reset state after modal animation completes
    setTimeout(resetModalState, 300);
  };

  const newLocationPopup = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status == 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location.coords);
        setLocationName(''); // Reset name for new location
        setEditMode(true);
        setCreateMode(true);
        setRadius(75);
        setModalVisible(true);
      } else {
        Alert.alert("Permission Required", "Location permission is needed to create a study location.");
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert("Error", "Failed to get current location. Please try again.");
    }
  };

  const viewLocationPopup = async (location: LocationType) => {
    try {
      // If location has coordinates, set them as the current location
      if (location && location.gps_lat && location.gps_long) {
        const locationCoords: LocationObject['coords'] = {
          latitude: location.gps_lat,
          longitude: location.gps_long,
          altitude: null,
          accuracy: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        };
        
        setCurrentLocation(locationCoords);
        setSelectedLocation({ coords: locationCoords, timestamp: Date.now() });
        setRadius(location.gps_radius);
        setLocationName(location.name);
        setCurrentLocationId(location.id);
        setEditMode(false);
        setCreateMode(false);
        setModalVisible(true);
      } else {
        console.error('Location missing coordinates');
        Alert.alert('Error', 'Location data is incomplete');
      }
    } catch (error) {
      console.error('Error setting location:', error);
      Alert.alert('Error', 'Failed to load location details');
    }
  };

  const handleCreateLocation = async () => {
    // Validate inputs
    if (!locationName.trim()) {
      Alert.alert("Error", "Location name is required");
      return;
    }

    if (!currentLocation) {
      Alert.alert("Error", "Location coordinates are missing");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');

      await axios.post(
        `${API_URL}api/locations/create/`,
        {
          name: locationName,
          gps_lat: currentLocation.latitude,
          gps_long: currentLocation.longitude,
          gps_radius: radius
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Close modal first before refreshing data
      closeModal();
      await refreshDashboard();
      Alert.alert("Success", "Location created successfully");
    } catch (error) {
      console.error('Error creating location:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        closeModal();
        await handleUnauthorized();
      } else {
        Alert.alert(
          "Error",
          "Failed to create location. Please try again."
        );
        setIsSubmitting(false);
      }
    }
  };

  const handleUpdateLocation = async () => {
    // Validate inputs
    if (!locationName.trim()) {
      Alert.alert("Error", "Location name is required");
      return;
    }

    if (!currentLocation || !currentLocationId) {
      Alert.alert("Error", "Location data is missing");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');

      await axios.put(
        `${API_URL}api/location/${currentLocationId}/modify`,
        {
          name: locationName,
          gps_lat: currentLocation.latitude,
          gps_long: currentLocation.longitude,
          gps_radius: radius
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Close modal first before refreshing data
      closeModal();
      await refreshDashboard();
      Alert.alert("Success", "Location updated successfully");
    } catch (error) {
      console.error('Error updating location:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        closeModal();
        await handleUnauthorized();
      } else {
        Alert.alert(
          "Error",
          "Failed to update location. Please try again."
        );
        setIsSubmitting(false);
      }
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

  const handleDeleteLocation = async (locationId: number) => {
    try {
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) throw new Error('No access token found')

      Alert.alert(
        "Confirm Deletion",
        "Are you sure you want to delete this location?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive",
            onPress: async () => {
              try {
                await axios.delete(
                  `${API_URL}api/location/${locationId}/modify`,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                )
                
                await refreshDashboard()
                Alert.alert("Success", "Location deleted successfully")
              } catch (error) {
                console.error('Error deleting location:', error)
                
                if (axios.isAxiosError(error) && error.response?.status === 401) {
                  await handleUnauthorized()
                } else {
                  Alert.alert(
                    "Error",
                    "Failed to delete location. Please try again."
                  )
                }
              }
            }
          }
        ]
      )
    } catch (error) {
      console.error('Error preparing to delete location:', error)
      Alert.alert("Error", "Something went wrong. Please try again.")
    }
  }

  // Function to handle geocoding of address
  const handleAddressSearch = async () => {
    if (!addressInput.trim()) {
      setGeocodingError('Please enter an address');
      return;
    }
    
    Keyboard.dismiss();
    setGeocodingError('');
    setIsGeocodingLoading(true);
    
    try {
      const geocodedLocations = await Location.geocodeAsync(addressInput);
      
      if (geocodedLocations && geocodedLocations.length > 0) {
        const { latitude, longitude } = geocodedLocations[0];
        
        // Update current location
        const newLocation: LocationObject['coords'] = {
          latitude,
          longitude,
          altitude: null,
          accuracy: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        };
        
        setCurrentLocation(newLocation);
        
        // Animate map to new location
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: radius / 25500,
          longitudeDelta: radius / 25500
        }, 1000);
        
        setGeocodingError('');
      } else {
        setGeocodingError('No results found for this address');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setGeocodingError('Error finding this address. Please try again.');
    } finally {
      setIsGeocodingLoading(false);
    }
  };

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

          {data.org_locations && data.org_locations.length > 0 ? (
            data.org_locations.map((location: LocationType) => (
              <View key={location.id} className="bg-gray-100 p-4 rounded-lg mb-2">
                <View className="flex-row items-center justify-between">
                  <TouchableOpacity
                    className="flex-1"
                    onPress={() => viewLocationPopup(location)}
                  >
                    <View>
                      <Text className="font-psemibold">{location.name}</Text>
                      <Text className="text-gray-600 text-sm">
                        Radius: {location.gps_radius}m, {location.gps_lat}, {location.gps_long}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <View className="flex-row">
                    <TouchableOpacity
                      onPress={() => viewLocationPopup(location)}
                      className="p-2"
                    >
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteLocation(location.id)}
                      className="p-2 ml-2 bg-red-100 rounded-full"
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text className="text-gray-500 italic mb-2">No study locations added yet</Text>
          )}

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
          closeModal();
        }}
      >
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-white p-6 rounded-lg shadow-lg w-5/6 m-4">
            <Text className="text-xl font-psemibold mb-4">
              {createMode ? "Create New Location" : editMode ? "Edit Location" : "View Location"}
            </Text>
            
            {/* Location name input */}
            <View className="mb-4">
              <Text className="text-gray-600 mb-1">Location Name</Text>
              <TextInput
                value={locationName}
                onChangeText={setLocationName}
                className="border border-gray-300 rounded-lg p-3"
                placeholder="Enter location name"
                editable={createMode || editMode}
              />
              {(createMode || editMode) && !locationName.trim() && (
                <Text className="text-red-500 text-sm mt-1">Location name is required</Text>
              )}
            </View>
            
            {/* Address search input - only show when in edit mode */}
            {(createMode || editMode) && (
              <View className="mb-4">
                <View className="flex-row items-center border border-gray-300 rounded-lg overflow-hidden">
                  <TextInput
                    value={addressInput}
                    onChangeText={(text) => {
                      setAddressInput(text);
                      if (geocodingError) setGeocodingError('');
                    }}
                    className="flex-1 p-3"
                    placeholder="Search for an address"
                    returnKeyType="search"
                    onSubmitEditing={handleAddressSearch}
                  />
                  <TouchableOpacity
                    onPress={handleAddressSearch}
                    disabled={isGeocodingLoading || !addressInput.trim()}
                    className={`bg-blue-500 p-3 ${(!addressInput.trim() || isGeocodingLoading) ? 'opacity-50' : ''}`}
                  >
                    {isGeocodingLoading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="search" size={20} color="white" />
                    )}
                  </TouchableOpacity>
                </View>
                
                {geocodingError !== '' && (
                  <Text className="text-red-500 text-sm mt-1">{geocodingError}</Text>
                )}
              </View>
            )}
            
            {/* Map view */}
            <View className="relative mb-4" style={{ width: '100%', height: 250 }}>
              <MapView
                ref={mapRef}
                style={{ width: '100%', height: '100%', borderRadius: 8 }}
                mapType="hybrid"
                showsUserLocation={true}
                followsUserLocation={createMode}
                initialRegion={{
                  latitude: currentLocation?.latitude || 36.130990,
                  longitude: currentLocation?.longitude || -115.174094,
                  latitudeDelta: radius / 25500,
                  longitudeDelta: radius / 25500
                }}
                onRegionChange={onRegionChange}
              >
                <Circle
                  center={{
                    latitude: currentLocation?.latitude || 36.130990,
                    longitude: currentLocation?.longitude || -115.174094,
                  }}
                  radius={radius}
                  strokeColor="rgba(0, 255, 0, 0.5)"
                  strokeWidth={2}
                  fillColor="rgba(0, 255, 0, 0.2)"
                />
              </MapView>
              
              {editMode && (
                <View className="absolute bottom-2 right-2 bg-white p-2 rounded-lg opacity-80">
                  <Text className="text-sm font-psemibold">Move map to adjust location</Text>
                </View>
              )}
            </View>
            
            <Text className="text-gray-600 text-sm mb-4">
              Radius: {radius}m
            </Text>
            
            {/* Action buttons */}
            <View className="flex-row justify-end mt-2">
              {/* View mode buttons */}
              {!editMode && !createMode && (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setEditMode(true);
                      setCreateMode(false);
                    }}
                    className="bg-blue-500 px-4 py-3 rounded-lg mr-2"
                  >
                    <Text className="text-white font-psemibold">Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={closeModal}
                    className="bg-gray-500 px-4 py-3 rounded-lg"
                  >
                    <Text className="text-white font-psemibold">Close</Text>
                  </TouchableOpacity>
                </>
              )}
              
              {/* Create mode buttons */}
              {createMode && (
                <>
                  <TouchableOpacity
                    onPress={closeModal}
                    className="bg-gray-500 px-4 py-3 rounded-lg mr-2"
                  >
                    <Text className="text-white font-psemibold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCreateLocation}
                    disabled={isSubmitting || !locationName.trim()}
                    className={`${isSubmitting || !locationName.trim() ? 'bg-gray-400' : 'bg-green-600'} px-4 py-3 rounded-lg`}
                  >
                    <Text className="text-white font-psemibold">
                      {isSubmitting ? 'Creating...' : 'Create'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              
              {/* Edit mode buttons */}
              {editMode && !createMode && (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setEditMode(false);
                      // Restore original location name if canceled
                      if (data && data.org_locations) {
                        const loc = data.org_locations.find((l: LocationType) => l.id === currentLocationId);
                        if (loc) setLocationName(loc.name);
                      }
                    }}
                    className="bg-gray-500 px-4 py-3 rounded-lg mr-2"
                  >
                    <Text className="text-white font-psemibold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleUpdateLocation}
                    disabled={isSubmitting || !locationName.trim()}
                    className={`${isSubmitting || !locationName.trim() ? 'bg-gray-400' : 'bg-green-600'} px-4 py-3 rounded-lg`}
                  >
                    <Text className="text-white font-psemibold">
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

export default OrganizationManagement