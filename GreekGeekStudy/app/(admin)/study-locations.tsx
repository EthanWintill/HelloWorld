import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Modal, ActivityIndicator, Keyboard } from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_URL } from '@/constants'
import MapView, { Marker, Region, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import { Card, EmptyState, ScreenHeader } from '../../components/Design'

// Define a LocationType interface to fix the TypeScript error
interface LocationType {
  id: number;
  name: string;
  gps_lat: number;
  gps_long: number;
  gps_radius: number;
  gps_address?: string;
}

interface AddressSuggestion {
  label: string;
  subtitle: string;
  latitude: number;
  longitude: number;
}

const StudyLocationsManagement = () => {
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
  const [originalMapRegion, setOriginalMapRegion] = useState<Region | null>(null);
  const [originalRadius, setOriginalRadius] = useState<number>(75);
  const [originalLocation, setOriginalLocation] = useState<LocationObject['coords'] | null>(null);
  const VISUAL_CIRCLE_SIZE = 100; // diameter in pixels

  const [addressInput, setAddressInput] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [isGeocodingLoading, setIsGeocodingLoading] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [geocodingError, setGeocodingError] = useState('');
  const [sliderWidth, setSliderWidth] = useState(1);
  const mapRef = useRef<MapView>(null);
  const MIN_RADIUS = 25;
  const MAX_RADIUS = 500;

  const clampRadius = (value: number) => Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, Math.round(value)));

  const calculateRadiusInMeters = (region: Region) => {
    const { longitudeDelta, latitude } = region;
    const metersPerDegree = 111319.9;
    const metersPerLongitudeDegree = Math.cos(latitude * (Math.PI / 180)) * metersPerDegree;
    const mapWidthInMeters = longitudeDelta * metersPerLongitudeDegree;
    const mapWidthInPixels = 400; // Approximate width of MapView
    const metersPerPixel = mapWidthInMeters / mapWidthInPixels;
    return Math.round((VISUAL_CIRCLE_SIZE / 2) * metersPerPixel);
  };

  const onRegionChangeComplete = (region: Region) => {
    if (editMode) {
      setMapRegion(region);
      setRadius(clampRadius(calculateRadiusInMeters(region)));
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

  // Calculate the correct map region based on radius
  const calculateMapRegion = (latitude: number, longitude: number, radiusInMeters: number): Region => {
    const metersPerDegree = 111319.9;
    const metersPerLongitudeDegree = Math.cos(latitude * (Math.PI / 180)) * metersPerDegree;
    const mapWidthInPixels = 400; // Approximate width of MapView
    
    // This should be the inverse of calculateRadiusInMeters
    // From calculateRadiusInMeters: radius = (VISUAL_CIRCLE_SIZE / 2) * metersPerPixel
    // So: metersPerPixel = radius / (VISUAL_CIRCLE_SIZE / 2)
    const metersPerPixel = radiusInMeters / (VISUAL_CIRCLE_SIZE / 2);
    const mapWidthInMeters = mapWidthInPixels * metersPerPixel;
    const longitudeDelta = mapWidthInMeters / metersPerLongitudeDegree;
    const latitudeDelta = longitudeDelta; // Keep it square for simplicity
    
    return {
      latitude,
      longitude,
      latitudeDelta,
      longitudeDelta
    };
  };

  const resetModalState = () => {
    setLocationName('');
    setAddressInput('');
    setAddressSuggestions([]);
    setGeocodingError('');
    setEditMode(false);
    setCreateMode(false);
    setIsSubmitting(false);
    setCurrentLocationId(null);
    setMapRegion(null);
    setOriginalMapRegion(null);
    setOriginalRadius(75);
    setOriginalLocation(null);
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
        setMapRegion(calculateMapRegion(location.coords.latitude, location.coords.longitude, 75));
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
        
        // Calculate and set the correct map region based on the stored radius
        const correctRegion = calculateMapRegion(location.gps_lat, location.gps_long, location.gps_radius);
        setMapRegion(correctRegion);
        
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

      // Always generate address from coordinates using reverse geocoding
      let generatedAddress = null;
      try {
        const geocodeResult = await Location.reverseGeocodeAsync({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        });
        
        if (geocodeResult && geocodeResult.length > 0) {
          const result = geocodeResult[0];
          // Build address string from available components
          const addressParts = [
            result.name,
            result.street,
            result.city,
            result.region,
            result.postalCode,
            result.country
          ].filter(Boolean);
          
          generatedAddress = addressParts.join(', ');
          console.log('Auto-generated address:', generatedAddress);
        }
      } catch (geocodeError) {
        console.warn('Reverse geocoding failed:', geocodeError);
        // Continue without address if geocoding fails
      }

      await axios.post(
        `${API_URL}api/locations/create/`,
        {
          name: locationName,
          gps_lat: currentLocation.latitude,
          gps_long: currentLocation.longitude,
          gps_radius: radius,
          gps_address: generatedAddress
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

      // Always generate address from coordinates using reverse geocoding
      let generatedAddress = null;
      try {
        const geocodeResult = await Location.reverseGeocodeAsync({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        });
        
        if (geocodeResult && geocodeResult.length > 0) {
          const result = geocodeResult[0];
          // Build address string from available components
          const addressParts = [
            result.name,
            result.street,
            result.city,
            result.region,
            result.postalCode,
            result.country
          ].filter(Boolean);
          
          generatedAddress = addressParts.join(', ');
          console.log('Auto-generated address:', generatedAddress);
        }
      } catch (geocodeError) {
        console.warn('Reverse geocoding failed:', geocodeError);
        // Continue without address if geocoding fails
      }

      await axios.put(
        `${API_URL}api/location/${currentLocationId}/modify`,
        {
          name: locationName,
          gps_lat: currentLocation.latitude,
          gps_long: currentLocation.longitude,
          gps_radius: radius,
          gps_address: generatedAddress
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

  const formatAddressParts = (result: Location.LocationGeocodedAddress) => {
    return [
      result.name,
      result.street,
      result.city,
      result.region,
      result.postalCode,
      result.country
    ].filter(Boolean).join(', ');
  };

  useEffect(() => {
    if (!createMode && !editMode) {
      setAddressSuggestions([]);
      return;
    }

    const query = addressInput.trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setIsSearchingSuggestions(false);
      return;
    }

    let isCancelled = false;
    const timeout = setTimeout(async () => {
      try {
        setIsSearchingSuggestions(true);
        const results = await Location.geocodeAsync(query);
        const suggestions = await Promise.all(
          results.slice(0, 4).map(async (result, index) => {
            let label = index === 0 ? query : `${query} result ${index + 1}`;
            let subtitle = `${result.latitude.toFixed(5)}, ${result.longitude.toFixed(5)}`;

            try {
              const reverseResults = await Location.reverseGeocodeAsync({
                latitude: result.latitude,
                longitude: result.longitude,
              });

              if (reverseResults.length > 0) {
                const address = formatAddressParts(reverseResults[0]);
                if (address) {
                  label = address.split(',')[0].trim();
                  subtitle = address;
                }
              }
            } catch (error) {
              console.warn('Suggestion reverse geocoding failed:', error);
            }

            return {
              label,
              subtitle,
              latitude: result.latitude,
              longitude: result.longitude,
            };
          })
        );

        if (!isCancelled) {
          setAddressSuggestions(suggestions);
        }
      } catch (error) {
        console.warn('Address suggestions failed:', error);
        if (!isCancelled) {
          setAddressSuggestions([]);
        }
      } finally {
        if (!isCancelled) {
          setIsSearchingSuggestions(false);
        }
      }
    }, 450);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [addressInput, createMode, editMode]);

  const moveMapToLocation = (latitude: number, longitude: number, label?: string) => {
    const newLocation: LocationObject['coords'] = {
      latitude,
      longitude,
      altitude: null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null
    };
    const nextRegion = calculateMapRegion(latitude, longitude, radius);

    setCurrentLocation(newLocation);
    setMapRegion(nextRegion);
    setAddressSuggestions([]);
    if (label) setAddressInput(label);
    mapRef.current?.animateToRegion(nextRegion, 500);
  };

  const handleSuggestionPress = (suggestion: AddressSuggestion) => {
    Keyboard.dismiss();
    setGeocodingError('');
    moveMapToLocation(suggestion.latitude, suggestion.longitude, suggestion.subtitle);
  };

  const updateRadius = (nextRadius: number) => {
    const clampedRadius = clampRadius(nextRadius);
    const center = currentLocation || (mapRegion ? {
      latitude: mapRegion.latitude,
      longitude: mapRegion.longitude,
      altitude: null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null
    } : null);

    setRadius(clampedRadius);

    if (center) {
      const nextRegion = calculateMapRegion(center.latitude, center.longitude, clampedRadius);
      setMapRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 150);
    }
  };

  const updateRadiusFromSlider = (locationX: number) => {
    const position = Math.min(sliderWidth, Math.max(0, locationX));
    const percentage = position / sliderWidth;
    updateRadius(MIN_RADIUS + percentage * (MAX_RADIUS - MIN_RADIUS));
  };

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
        moveMapToLocation(latitude, longitude, addressInput.trim());
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
        <Text className="text-gg-error text-lg font-bold">Error:</Text>
        <Text className="text-gg-error">{JSON.stringify(error, null, 2)}</Text>
      </ScrollView>
    )
  }

  // Check if user is admin
  if (!data.is_staff) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-4">
        <Ionicons name="alert-circle" size={64} color="#ba1a1a" />
        <Text className="text-xl font-psemibold text-center mt-4 mb-2">Access Denied</Text>
        <Text className="text-gg-muted text-center">You don't have permission to access this page.</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gg-bg">
      <ScreenHeader
        title="Study Locations"
        subtitle={`${data?.org_locations?.length || 0} approved study area${data?.org_locations?.length === 1 ? '' : 's'}`}
      />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <Card className="mb-4">
          <Text className="text-lg font-psemibold mb-4 text-gg-text">Study Locations</Text>

          {data.org_locations && data.org_locations.length > 0 ? (
            data.org_locations.map((location: LocationType) => (
              <View key={location.id} className="bg-gg-bg border border-gg-outlineVariant p-4 rounded-lg mb-3">
                <View className="flex-row items-center justify-between">
                  <TouchableOpacity
                    className="flex-1"
                    onPress={() => viewLocationPopup(location)}
                  >
                    <View>
                      <Text className="font-psemibold text-gg-text">{location.name}</Text>
                      {location.gps_address && (
                        <Text className="text-gg-muted text-sm font-pregular">
                          {location.gps_address.split(',')[0].trim()}
                        </Text>
                      )}
                      <Text className="text-gg-muted text-xs font-pregular">
                        Radius: {location.gps_radius}m
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <View className="flex-row">
                    <TouchableOpacity
                      onPress={() => viewLocationPopup(location)}
                      className="h-9 w-9 items-center justify-center bg-gg-surfaceLow rounded-full"
                    >
                      <Ionicons name="pencil" size={20} color="#006b2c" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteLocation(location.id)}
                      className="h-9 w-9 items-center justify-center ml-2 bg-[#ffdad6] rounded-full"
                    >
                      <Ionicons name="trash-outline" size={20} color="#ba1a1a" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <EmptyState icon="location-outline" title="No locations yet" message="Add approved study areas for GPS verification." />
          )}

          <TouchableOpacity
            onPress={newLocationPopup}
            className="bg-gg-primary min-h-[56px] rounded-lg flex-row items-center justify-center mt-2"
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text className="text-white font-psemibold ml-1">Add Location</Text>
          </TouchableOpacity>
        </Card>
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
          <View className="bg-gg-surface p-5 rounded-2xl shadow-lg w-5/6 m-4" style={{ maxHeight: '90%' }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-psemibold flex-1 pr-3">
                {createMode ? "Create New Location" : editMode ? "Edit Location" : "View Location"}
              </Text>
              <TouchableOpacity
                onPress={closeModal}
                disabled={isSubmitting}
                className="h-10 w-10 rounded-full bg-gg-surfaceLow items-center justify-center"
                accessibilityLabel="Close location modal"
              >
                <Ionicons name="close" size={22} color="#171d16" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            
            {/* Location name input */}
            <View className="mb-4">
              <Text className="text-gg-muted mb-1">Location Name</Text>
              <TextInput
                value={locationName}
                onChangeText={setLocationName}
                className="border border-gg-outline rounded-lg p-3"
                placeholder="Enter location name"
                editable={createMode || editMode}
              />
              {(createMode || editMode) && !locationName.trim() && (
                <Text className="text-gg-error text-sm mt-1">Location name is required</Text>
              )}
            </View>
            
            {/* Address search input - only show when in edit mode */}
            {(createMode || editMode) && (
              <View className="mb-4">
                <Text className="text-gg-muted mb-2">Search Address (For Map Navigation)</Text>
                <View className="flex-row items-center border border-gg-outline rounded-lg overflow-hidden">
                  <TextInput
                    value={addressInput}
                    onChangeText={(text) => {
                      setAddressInput(text);
                      if (geocodingError) setGeocodingError('');
                    }}
                    className="flex-1 p-3"
                    placeholder="Search for an address to navigate map"
                    returnKeyType="search"
                    onSubmitEditing={handleAddressSearch}
                  />
                  <TouchableOpacity
                    onPress={handleAddressSearch}
                    disabled={isGeocodingLoading || !addressInput.trim()}
                    className={`bg-[#dbe1ff]0 p-3 ${(!addressInput.trim() || isGeocodingLoading) ? 'opacity-50' : ''}`}
                  >
                    {isGeocodingLoading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="search" size={20} color="white" />
                    )}
                  </TouchableOpacity>
                </View>

                {(isSearchingSuggestions || addressSuggestions.length > 0) && (
                  <View className="border border-gg-outlineVariant rounded-lg mt-2 overflow-hidden bg-gg-surface">
                    {isSearchingSuggestions && (
                      <View className="px-3 py-2 flex-row items-center">
                        <ActivityIndicator size="small" color="#006b2c" />
                        <Text className="text-gg-muted text-sm ml-2">Searching addresses...</Text>
                      </View>
                    )}
                    {addressSuggestions.map((suggestion) => (
                      <TouchableOpacity
                        key={`${suggestion.latitude}-${suggestion.longitude}-${suggestion.subtitle}`}
                        onPress={() => handleSuggestionPress(suggestion)}
                        className="px-3 py-2 border-t border-gg-outlineVariant"
                      >
                        <Text className="text-gg-text font-pmedium">{suggestion.label}</Text>
                        <Text className="text-gg-muted text-xs" numberOfLines={1}>{suggestion.subtitle}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                <Text className="text-gg-muted text-xs mt-1">
                  Search to navigate map to a general area, then position precisely
                </Text>
                
                {geocodingError !== '' && (
                  <Text className="text-gg-error text-sm mt-1">{geocodingError}</Text>
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
                region={mapRegion || undefined}
                initialRegion={{
                  latitude: currentLocation?.latitude || 36.130990,
                  longitude: currentLocation?.longitude || -115.174094,
                  latitudeDelta: radius / 25500,
                  longitudeDelta: radius / 25500
                }}
                onRegionChangeComplete={onRegionChangeComplete}
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
                <View className="absolute bottom-2 right-2 bg-gg-surface p-2 rounded-lg opacity-80">
                  <Text className="text-sm font-psemibold">Move map to adjust location</Text>
                </View>
              )}
            </View>
            
            <Text className="text-gg-muted text-sm mb-4">
              Radius: {radius}m
            </Text>

            {(createMode || editMode) && (
              <View className="mb-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gg-muted text-xs">{MIN_RADIUS}m</Text>
                  <Text className="text-gg-muted text-xs">{MAX_RADIUS}m</Text>
                </View>
                <View
                  className="h-10 justify-center"
                  onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width || 1)}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={(event) => updateRadiusFromSlider(event.nativeEvent.locationX)}
                  onResponderMove={(event) => updateRadiusFromSlider(event.nativeEvent.locationX)}
                >
                  <View className="h-2 rounded-full bg-gg-outlineVariant overflow-hidden">
                    <View
                      className="h-2 rounded-full bg-gg-primary"
                      style={{ width: `${((radius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS)) * 100}%` }}
                    />
                  </View>
                  <View
                    className="absolute h-6 w-6 rounded-full bg-gg-primary border-2 border-white"
                    style={{
                      left: `${((radius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS)) * 100}%`,
                      marginLeft: -12,
                    }}
                  />
                </View>
              </View>
            )}
            
            {/* Action buttons */}
            <View className="flex-row justify-end mt-2">
              {/* View mode buttons */}
              {!editMode && !createMode && (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      // Store current map region before entering edit mode
                      setOriginalMapRegion(mapRegion);
                      setOriginalRadius(radius);
                      setOriginalLocation(currentLocation);
                      setEditMode(true);
                      setCreateMode(false);
                    }}
                    className="bg-[#dbe1ff]0 px-4 py-3 rounded-lg mr-2"
                  >
                    <Text className="text-white font-psemibold">Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={closeModal}
                    className="bg-gg-bg0 px-4 py-3 rounded-lg"
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
                    className="bg-gg-bg0 px-4 py-3 rounded-lg mr-2"
                  >
                    <Text className="text-white font-psemibold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCreateLocation}
                    disabled={isSubmitting || !locationName.trim()}
                    className={`${isSubmitting || !locationName.trim() ? 'bg-gray-400' : 'bg-gg-primary'} px-4 py-3 rounded-lg flex-row items-center justify-center`}
                  >
                    {isSubmitting && (
                      <ActivityIndicator size="small" color="white" className="mr-2" />
                    )}
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
                        if (loc) {
                          setLocationName(loc.name);
                        }
                      }
                      // Restore original map region and animate back
                      if (originalMapRegion) {
                        setMapRegion(originalMapRegion);
                        setRadius(originalRadius);
                        setCurrentLocation(originalLocation);
                        mapRef.current?.animateToRegion(originalMapRegion, 500);
                      }
                    }}
                    className="bg-gg-bg0 px-4 py-3 rounded-lg mr-2"
                  >
                    <Text className="text-white font-psemibold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleUpdateLocation}
                    disabled={isSubmitting || !locationName.trim()}
                    className={`${isSubmitting || !locationName.trim() ? 'bg-gray-400' : 'bg-gg-primary'} px-4 py-3 rounded-lg flex-row items-center justify-center`}
                  >
                    {isSubmitting && (
                      <ActivityIndicator size="small" color="white" className="mr-2" />
                    )}
                    <Text className="text-white font-psemibold">
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

export default StudyLocationsManagement
