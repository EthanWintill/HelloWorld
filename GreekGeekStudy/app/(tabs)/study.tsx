import { View, Text, ScrollView, Alert, Linking, Image, TouchableOpacity, AppState, Modal } from 'react-native'
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import ClockButton from '@/components/ClockButton'
import PermissionButton from '@/components/PermissionButton'
import { useStopWatch } from '@/hooks/useStopwatch'
import { API_URL } from '@/constants';
import axios, { AxiosError } from 'axios'
import { images } from "@/constants";
import haversine from 'haversine-distance'
import * as TaskManager from 'expo-task-manager';
import eventEmitter, { EVENTS } from '@/services/EventEmitter';
import MapView, { Marker, Region, Circle } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface LocationType {
  id: number;
  name: string;
  org: number;
  gps_lat: number;
  gps_long: number;
  gps_radius: number;
  gps_address?: string;
}

const GEOFENCE_TASK = 'GEOFENCE_TASK';

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  console.log('Background task executed with data:', data);

  const { eventType } = data as GeofencingEvent;

  if (eventType === Location.GeofencingEventType.Enter) {
    console.log('You have entered the geofence');
    
  } else if (eventType === Location.GeofencingEventType.Exit) {
    console.log('You have exited the geofence');
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) throw new Error('No access token found');
    try {
      const response = await axios.post(API_URL + 'api/clockout/', {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Emit event to refresh dashboard after clock out
      eventEmitter.emit(EVENTS.DASHBOARD_REFRESH);
      eventEmitter.emit(EVENTS.CLOCK_OUT);
    } catch(error) {
      console.log(error);
    }
  }
});

interface GeofencingEvent {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}

const Study = () => {
  // --- Hooks and State ---
  const { dashboardState, refreshDashboard, checkIsStudying, handleUnauthorized } = useDashboard()
  const { isLoading, error, data } = dashboardState

  const [backgroundStatus, setBackgroundStatus] = useState(false)
  const [foregroundStatus, setForegroundStatus] = useState(false)

  const [locationGranted, setLocationGranted] = useState('UNKNOWN');
  const [isStudying, setIsStudying] = useState(false)
  
  // Add state for current study location with proper type
  const [currentStudyLocation, setCurrentStudyLocation] = useState<LocationType | null>(null);
  
  // Map related state
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const mapRef = useRef<MapView>(null);
  
  // New state for study locations list
  const [locationsListVisible, setLocationsListVisible] = useState(false);
  
  // Use our reimplemented stopwatch
  const {
    time,
    isRunning,
    hasStarted,
    start,
    stop,
    reset  } = useStopWatch();

  const [appState, setAppState] = useState(AppState.currentState);

  // --- Location Related Functions ---
  const showSettingsAlert = () => {
    Alert.alert(
      "Permission Required",
      "You must enable location sharing to use this app. Please go to settings to enable it.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Settings", onPress: () => Linking.openSettings() }
      ]
    );
  };

  const handleForegroundLocationPermission = async () => {
    let foregroundStatus = await Location.getForegroundPermissionsAsync()
    if (foregroundStatus.status === 'granted'){
      setForegroundStatus(true)
      return
    }
    let res = await Location.requestForegroundPermissionsAsync()
    console.log('Foreground Location Permission:', res.status);

    

    while (res.status !== 'granted' && res.canAskAgain) {
      await new Promise(resolve => setTimeout(resolve, 100));
      res = await Location.requestForegroundPermissionsAsync()
      console.log('Foreground Location Permission:', res);
    }

    if (res.status !== 'granted') {
      setForegroundStatus(false)
    }else{
      setForegroundStatus(true)
    }

  }
  const handleLocationPermission = async () => {
    console.log('Handling location permission');
    await handleForegroundLocationPermission();
    let backgroundStatus = await Location.getBackgroundPermissionsAsync()
    if (backgroundStatus.status === 'granted'){
      setBackgroundStatus(true)
      console.log("PERMISSIONS GOOD")
      return
    }
    let res = await Location.requestBackgroundPermissionsAsync()
    
    console.log('Location Permission:', res);

    while (res.status !== 'granted' && res.canAskAgain) {
      await new Promise(resolve => setTimeout(resolve, 100));
      res = await Location.requestBackgroundPermissionsAsync()
      console.log('Location Permission:', res);
    }

    if (res.status !== 'granted') {
      setBackgroundStatus(false)
    }else{
      setBackgroundStatus(true)
    }

  };

  // Function to set initial map region based on user location
  const updateMapRegion = (latitude: number, longitude: number) => {
    setMapRegion({
      latitude,
      longitude,
      latitudeDelta: 0.002,  // Much more zoomed in (was 0.01)
      longitudeDelta: 0.002  // Much more zoomed in (was 0.01)
    });
  };

  // Function to recenter map to user's current location
  const recenterMap = async () => {
    try {
      if (!backgroundStatus || !foregroundStatus) return;
      
      const location = await Location.getCurrentPositionAsync();
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002
      };
      
      // Animate to the new region
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      console.error('Error getting current location for recenter:', error);
    }
  };

  const getStudyLocationGPS = async () => {
    await handleLocationPermission();
    if (!backgroundStatus) return null;
    const location = await Location.getCurrentPositionAsync();
    console.log('Current location:', location);
    
    // Update map region when we get user location
    updateMapRegion(location.coords.latitude, location.coords.longitude);
    
    const studyLocations = dashboardState.data['org_locations'];
    for (const studyLocation of studyLocations) {
      const distance = haversine(
        { latitude: location.coords.latitude, longitude: location.coords.longitude },
        { latitude: studyLocation['gps_lat'], longitude: studyLocation['gps_long'] }
      )
      console.log('Distance to', studyLocation['name'], ':', distance);
      if (distance < studyLocation['gps_radius']) {
        setCurrentStudyLocation(studyLocation);
        return studyLocation;
      }
    }
    setCurrentStudyLocation(null);
    return null;
  }

  // --- Navigation Functions ---
  const navigateToAdmin = () => {
    router.push('/(admin)');
  };

  // Function to open study locations list
  const openLocationsList = () => {
    setLocationsListVisible(true);
  };



  // --- Clock Related Functions ---
  const clockIn = async () => {
    try {
      let studyLocation = await getStudyLocationGPS();
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');

      if (!studyLocation) {
        Alert.alert('No Study Location Found', 'Please go to a study location to clock in.');
        return;
      }

      // Start Geofence monitoring
      await Location.startGeofencingAsync(GEOFENCE_TASK, [{
        latitude: studyLocation['gps_lat'],
        longitude: studyLocation['gps_long'],
        radius: studyLocation['gps_radius'],
        notifyOnExit: true
      }]);
      console.log('Geofence started');


      // Send clock-in request to the server
      const response = await axios.post(API_URL + 'api/clockin/', { "location_id": studyLocation?.id }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Emit event to refresh dashboard after clock in
      eventEmitter.emit(EVENTS.DASHBOARD_REFRESH);
      eventEmitter.emit(EVENTS.CLOCK_IN);

    } catch (error) {
      console.log(error);
      if (error instanceof AxiosError && error.response?.status === 401) {
        await handleUnauthorized();
      }
    }
  };

  const clockOut = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');
      const response = await axios.post(API_URL + 'api/clockout/', {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      // Emit event to refresh dashboard after clock out
      eventEmitter.emit(EVENTS.DASHBOARD_REFRESH);
      eventEmitter.emit(EVENTS.CLOCK_OUT);

      await Location.stopGeofencingAsync(GEOFENCE_TASK);
      console.log('Geofence stopped');
      
    } catch (error) {
      console.log(error)
      if (error instanceof AxiosError && error.response?.status === 401) {
        await handleUnauthorized()
      }
    }
  }

  const clockOutAndRefresh = () => {
    clockOut()
      .then(() => { })
      // No need to call refreshDashboard here as the event will handle it
      .finally(() => refreshClock())
  }

  const handleClock = () => {
    console.log("handleClock")
    if (!checkIsStudying()) {
      clockIn()
        .then(() => { })
        .finally(() => {
          // No need to call refreshDashboard here as the event will handle it
          refreshClock()
        })
    } else {
      clockOutAndRefresh()
    }
  }

  const getClockTime = () => {
    if (!checkIsStudying()) return 0

    const lastSession = data.user_sessions[data.user_sessions.length - 1];
    return new Date(lastSession.start_time).getTime()
  }

  const refreshClock = async () => {
    // Wait for dashboard data to be fully loaded
    if (isLoading || !data) return;
    
    try {
      const isCurrentlyStudying = checkIsStudying();
      setIsStudying(isCurrentlyStudying);
      
      // If we're studying, start the stopwatch fresh
      if (isCurrentlyStudying && !isRunning) {
        const startTime = getClockTime();
        start(startTime);
      } else if (!isCurrentlyStudying && isRunning) {
        stop();
        reset();
      }
    } catch (error) {
      console.error("Error refreshing clock:", error);
      setIsStudying(false);
      if (isRunning) {
        stop();
        reset();
      }
    }
  };

  // --- Study Hours Calculation Functions ---
  const requiredHours = () => {
    if (!data?.active_period_setting) return 0;
    return Math.round(data.active_period_setting.required_hours);
  }

  const getActivePeriodInstance = () => {
    if (!data?.org_period_instances) return null;
    return data.org_period_instances.find(
      (instance: any) => instance.is_active
    );
  }

  const hoursStudied = () => {
    if (!data?.user_sessions) return 0;

    const activePeriodInstance = getActivePeriodInstance();

    // If no active period, sum all sessions
    if (!activePeriodInstance) {
      return data.user_sessions.reduce(
        (acc: number, session: any) => acc + (session.hours || 0),
        0
      );
    }

    // Filter and sum sessions for active period
    const periodSessions = data.user_sessions.filter(
      (session: any) =>
        session.period_instance?.id === activePeriodInstance.id
    );

    return periodSessions.reduce(
      (acc: number, session: any) => acc + (session.hours || 0),
      0
    );
  }

  const studyHoursLeft = () => {
    const required = requiredHours();
    const studied = hoursStudied();
    return Math.max(0, required - studied);
  }

  const calculatePercentComplete = () => {
    const required = requiredHours();
    if (required === 0) return 0;

    const studied = hoursStudied();
    return Math.min(Math.round((studied / required) * 100), 100);
  }

  const getActivePeriodInfo = () => {
    if (!data?.active_period_setting || !data?.org_period_instances) return null;

    const activePeriodInstance = data.org_period_instances.find(
      (instance: any) => instance.is_active
    );

    if (!activePeriodInstance) return null;

    // Handle potential timezone issues by ensuring consistent date parsing
    const endDate = new Date(activePeriodInstance.end_date);
    const now = new Date();
    
    // Calculate the difference in milliseconds
    const timeDifference = endDate.getTime() - now.getTime();
    const hoursRemaining = Math.max(0, timeDifference / (1000 * 60 * 60));
    
    // For days calculation, we want to know how many calendar days are left
    // Reset both dates to start of day for accurate day comparison
    const endDateStartOfDay = new Date(endDate);
    endDateStartOfDay.setHours(0, 0, 0, 0);
    
    const nowStartOfDay = new Date(now);
    nowStartOfDay.setHours(0, 0, 0, 0);
    
    const daysDifference = (endDateStartOfDay.getTime() - nowStartOfDay.getTime()) / (1000 * 60 * 60 * 24);
    const daysRemaining = Math.max(0, Math.ceil(daysDifference));

    // Show days only if we have more than 24 hours remaining OR if it's due today/tomorrow
    const shouldShowDays = hoursRemaining >= 24 || daysRemaining >= 1;

    const periodSetting = data.active_period_setting;
    let periodDescription = '';

    switch (periodSetting.period_type) {
      case 'weekly':
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        periodDescription = `Weekly period (Due ${days[periodSetting.due_day_of_week]})`;
        break;
      case 'monthly':
        periodDescription = 'Monthly period';
        break;
      case 'custom':
        periodDescription = `${periodSetting.custom_days}-day period`;
        break;
    }

    return {
      description: periodDescription,
      shouldShowDays,
      daysRemaining,
      hoursRemaining: Math.round(hoursRemaining),
      endDate
    };
  };

  // --- Storage Utilities ---
  const getAllAsyncStorageData = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);

      return items;

    } catch (error) {
      console.error('Error getting AsyncStorage data:', error);
      return [];
    }
  };

  const clearAsyncStorage = async () => {
    try {
      await AsyncStorage.clear();
      console.log('AsyncStorage has been cleared!');
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
    }
  };

  // --- Effects ---
  useFocusEffect(
    useCallback(() => {
      console.log('Study screen came into focus - refreshing dashboard');
      refreshDashboard();
      return () => {
        // Cleanup if needed when screen loses focus
      };
    }, [])
  );
  
  useEffect(() => {
    getAllAsyncStorageData();
    
    // Uncomment the next line when you want to clear storage
    //clearAsyncStorage();

    refreshClock();
    //console.log("Dashboard Data:", JSON.stringify(data, null, 2));
  }, [isLoading, data]);

  useEffect(() => {
    const exitHandler = () => {
      clockOutAndRefresh();
    };

    // Initial permission check
    handleLocationPermission();
    
    // Initialize map with user location when permissions are available
    if (backgroundStatus && foregroundStatus) {
      Location.getCurrentPositionAsync()
        .then(location => {
          updateMapRegion(location.coords.latitude, location.coords.longitude);
        })
        .catch(err => console.error('Error getting current position:', err));
    }
    
    // Set up an interval to check for background permissions until granted
    let permissionCheckInterval: any;
    if (!backgroundStatus || !foregroundStatus) {
      permissionCheckInterval = setInterval(async () => {
        console.log('Checking permission status...');
        const foreground = await Location.getForegroundPermissionsAsync();
        const background = await Location.getBackgroundPermissionsAsync();
        
        console.log('Current permissions - Foreground:', foreground.granted, 'Background:', background.granted);
        
        // If both permissions are granted, clear the interval
        if (foreground.granted && background.granted) {
          console.log('Both permissions granted, stopping interval checks');
          setBackgroundStatus(true);
          setForegroundStatus(true);
          clearInterval(permissionCheckInterval);
        }
      }, 1000); // Check every second
    }
    
    return () => {
      if (permissionCheckInterval) {
        clearInterval(permissionCheckInterval);
      }
      //TaskManager.unregisterTaskAsync(GEOFENCE_TASK);
    };
  }, [backgroundStatus, foregroundStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
        // App reopened - refresh data and clock
        refreshDashboard();
        refreshClock();
      } else if (nextAppState.match(/inactive|background/) && appState === 'active') {
        console.log('App going to background');
        // App going to background - stop the stopwatch
        if (isRunning) {
          stop();
        }
      }
      setAppState(nextAppState);
    });

    

    return () => {
      subscription.remove();
    };
  }, [appState, isRunning]);

  // Add effect to check location periodically when not studying
  useEffect(() => {
    if (!isStudying && backgroundStatus && foregroundStatus && !isLoading) {
      // Update location initially
      getStudyLocationGPS();
      
      // Check location every 30 seconds when not studying
      const locationInterval = setInterval(() => {
        getStudyLocationGPS();
      }, 30000);
      
      return () => clearInterval(locationInterval);
    }
  }, [isStudying, backgroundStatus, foregroundStatus, isLoading]);

  if (error) {
    return (
      <ScrollView className="flex-1 p-4">
        <Text className="text-red-500 text-lg font-bold">Error:</Text>
        <Text className="text-red-500">{JSON.stringify(error, null, 2)}</Text>
      </ScrollView>
    )
  }

  return (
    <SafeAreaView className="bg-white h-full">
      {/* New Header Bar */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center">
          <Image
            source={images.logoSmall}
            className="w-10 h-10" // Increased the size of the logo
            resizeMode="contain"
          />
          <Text className="font-psemibold text-lg ml-1">
            {data?.org?.name || 'Organization'}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="items-end">
            <Text className="font-psemibold text-gray-600, text-lg">
              {data?.first_name} {data?.last_name?.[0]}.
            </Text>
            {data?.group && (
              <Text className="font-pregular text-gray-500 text-sm">
                {data.group.name}
              </Text>
            )}
          </View>
          <Text className="font-psemibold text-green-600 text-2xl">
            {Math.round(hoursStudied())}h
          </Text>
        </View>
      </View>

      {/* Main content */}
      <View className="flex-1 flex-col justify-between">
        <ScrollView>
          {/* Admin Dashboard Button */}
          {data?.is_staff && (
            <View className="px-4 pt-4">
              <TouchableOpacity 
                onPress={navigateToAdmin}
                className="bg-green-600 p-4 rounded-xl shadow-sm"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="bg-white/20 p-2 rounded-full mr-3">
                      <Ionicons name="settings" size={20} color="white" />
                    </View>
                    <View>
                      <Text className="text-white font-psemibold text-lg">Admin Dashboard</Text>
                      <Text className="text-white/90 text-sm">Manage organization settings</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="white" />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Study Locations Button */}
          {data?.org_locations && data.org_locations.length > 0 && (
            <View className="px-4 pt-4">
              <TouchableOpacity 
                onPress={openLocationsList}
                className="bg-blue-600 p-4 rounded-xl shadow-sm"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="bg-white/20 p-2 rounded-full mr-3">
                      <Ionicons name="location" size={20} color="white" />
                    </View>
                    <View>
                      <Text className="text-white font-psemibold text-lg">Study Locations</Text>
                      <Text className="text-white/90 text-sm">View all {data.org_locations.length} study areas</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="white" />
                </View>
              </TouchableOpacity>
            </View>
          )}
          <View className='h-[33vh] w-full justify-center items-center px-4'>
            {backgroundStatus && foregroundStatus ? (
              <ClockButton
                title={!isStudying ? "Start Studying" : "Stop"}
                secondaryTitle={!isStudying 
                  ? (currentStudyLocation ? currentStudyLocation.name : "Not in a study area") 
                  : undefined}
                handlePress={handleClock}
                isStarted={isStudying}
                percentComplete={calculatePercentComplete()}
                time={time} // Use the actual stopwatch time
                isLoading={isLoading && !data} // Only show loading if we don't have data yet
              />
            ) : (
              <PermissionButton
                handlePress={handleLocationPermission} />
            )}
          </View>
          
          {/* Permission Error Message Area */}
          {(!backgroundStatus || !foregroundStatus) && (
            <View className="mx-4 mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <Text className="font-psemibold text-center text-red-700 mb-2">
                Location Permission Required
              </Text>
              <Text className="font-pregular text-center text-red-600 mb-3">
                {!foregroundStatus 
                  ? "You need to enable location access for this app to track your study sessions." 
                  : "Background location access is required to track when you leave study areas."}
              </Text>
              <View className="flex items-center">
                <TouchableOpacity 
                  onPress={() => Linking.openSettings()}
                  className="bg-red-600 py-2 px-4 rounded-md"
                >
                  <Text className="font-psemibold text-white text-center">
                    Open Settings
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* Simple Progress Section */}
          {data && (
            <View className="mx-4 mb-4">
              <Text className="font-psemibold text-center text-gray-800 text-lg mb-4">
                Study Progress
              </Text>
              
              {/* Progress Bar */}
              <View className="mb-2">
                <View className="bg-gray-200 rounded-full h-3 mb-2">
                  <View 
                    className="bg-blue-500 h-3 rounded-full"
                    style={{ width: `${Math.min(calculatePercentComplete(), 100)}%` }}
                  />
                </View>
                <Text className="font-pregular text-center text-gray-600 text-sm mb-2">
                  {calculatePercentComplete()}% Complete
                </Text>
                
                {/* Days Remaining */}
                {data?.active_period_setting && (
                  <Text className="font-pregular text-center text-sm text-gray-600">
                    {(() => {
                      const periodInfo = getActivePeriodInfo();
                      if (!periodInfo) return '';
                      
                      if (periodInfo.shouldShowDays) {
                        return (
                          <>
                            <Text className="text-green-600">
                              {periodInfo.daysRemaining} day{periodInfo.daysRemaining !== 1 ? 's' : ''}
                            </Text>
                            {' remaining'}
                          </>
                        );
                      } else if (periodInfo.hoursRemaining > 0) {
                        return (
                          <>
                            <Text className="text-red-600">
                              {periodInfo.hoursRemaining} hour{periodInfo.hoursRemaining !== 1 ? 's' : ''}
                            </Text>
                            {' remaining'}
                          </>
                        );
                      } else {
                        return 'Due now';
                      }
                    })()}
                  </Text>
                )}
              </View>
            </View>
          )}
          
          {/* Map view section */}
          <View className="mt-4 mx-4 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <View className="bg-green-50 px-4 py-3 border-b border-gray-200">
              <Text className="font-psemibold text-center text-green-800">
                Current Location
              </Text>
              {!currentStudyLocation && (
                <Text className="font-pregular text-center text-red-600 text-sm mt-1">
                  Not in a study area
                </Text>
              )}
            </View>
            
            {/* Map container with fixed height */}
            <View style={{ height: 250, position: 'relative' }}>
              {mapRegion && (
                <MapView
                  ref={mapRef}
                  style={{ width: '100%', height: '100%' }}
                  initialRegion={mapRegion}
                  showsUserLocation={true}
                  followsUserLocation={false}
                  mapType="hybrid"
                  zoomEnabled={true}
                  scrollEnabled={true}
                  pitchEnabled={true}
                  rotateEnabled={true}
                >
                  {/* Render all study locations as circles */}
                  {data?.org_locations && data.org_locations.map((location: LocationType) => (
                    <Circle
                      key={location.id}
                      center={{
                        latitude: location.gps_lat,
                        longitude: location.gps_long,
                      }}
                      radius={location.gps_radius}
                      strokeColor={
                        currentStudyLocation?.id === location.id
                          ? "rgba(16, 185, 129, 0.8)"  // Brighter green for current location
                          : "rgba(16, 185, 129, 0.5)"  // Regular green for other locations
                      }
                      strokeWidth={2}
                      fillColor={
                        currentStudyLocation?.id === location.id
                          ? "rgba(16, 185, 129, 0.3)"  // More visible fill for current location
                          : "rgba(16, 185, 129, 0.1)"  // Light fill for other locations
                      }
                    />
                  ))}
                </MapView>
              )}
              
              {/* Recenter button */}
              {mapRegion && backgroundStatus && foregroundStatus && (
                <TouchableOpacity
                  onPress={recenterMap}
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    backgroundColor: 'white',
                    borderRadius: 20,
                    width: 40,
                    height: 40,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                  }}
                >
                  <Ionicons name="locate" size={20} color="#16a34a" />
                </TouchableOpacity>
              )}
              
              {/* Show an overlay when map isn't available */}
              {(!mapRegion || !backgroundStatus || !foregroundStatus) && (
                <View className="absolute inset-0 bg-gray-100 items-center justify-center">
                  <Text className="text-gray-500 font-psemibold">
                    {!backgroundStatus || !foregroundStatus
                      ? "Location permissions required to view map"
                      : "Loading map..."}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Map legend */}
            <View className="p-3 bg-white border-t border-gray-200">
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <View className="h-3 w-3 rounded-full bg-green-500 mr-2" />
                  <Text className="text-sm text-gray-600">Study Areas</Text>
                </View>
                <View className="flex-row items-center">
                  <View className="h-3 w-3 rounded-full bg-blue-500 mr-2" />
                  <Text className="text-sm text-gray-600">Your Location</Text>
                </View>
                {currentStudyLocation && (
                  <Text className="text-sm font-psemibold text-green-600">
                    In: {currentStudyLocation.name}
                  </Text>
                )}
              </View>
            </View>
          </View>


          
          {/* Add some bottom padding */}
          <View className="h-6" />
        </ScrollView>
      </View>

      {/* Study Locations List Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={locationsListVisible}
        onRequestClose={() => setLocationsListVisible(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'transparent' }}>
          <View className="bg-white rounded-t-3xl max-h-3/4">
            <View className="p-4 border-b border-gray-200">
              <View className="flex-row justify-between items-center">
                <Text className="text-xl font-psemibold">Study Locations</Text>
                <TouchableOpacity
                  onPress={() => setLocationsListVisible(false)}
                  className="p-2"
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView className="px-4 py-2">
              {data?.org_locations && data.org_locations.map((location: LocationType) => (
                <View
                  key={location.id}
                  className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-3"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-psemibold text-lg">{location.name}</Text>
                      {location.gps_address && (
                        <Text className="text-gray-600 text-sm mt-1">
                          {location.gps_address.split(',')[0].trim()}
                        </Text>
                      )}
                      <Text className="text-gray-500 text-xs mt-1">
                        Radius: {location.gps_radius}m
                      </Text>
                      {currentStudyLocation?.id === location.id && (
                        <Text className="text-green-600 font-psemibold text-xs mt-1">
                          Currently in this area
                        </Text>
                      )}
                    </View>
                    <View className="ml-3">
                      <Ionicons name="location" size={24} color="#6B7280" />
                    </View>
                  </View>
                </View>
              ))}
              
              {/* Add some bottom padding for the last item */}
              <View className="h-4" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      
    </SafeAreaView>
  )
}

export default Study