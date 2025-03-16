import { View, Text, ScrollView, Alert, Linking, Image, TouchableOpacity, AppState } from 'react-native'
import React, { useEffect, useState } from 'react'
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

  const getStudyLocationGPS = async () => {
    await handleLocationPermission();
    if (!backgroundStatus) return null;
    const location = await Location.getCurrentPositionAsync();
    console.log('Current location:', location);
    const studyLocations = dashboardState.data['org_locations'];
    for (const studyLocation of studyLocations) {
      const distance = haversine(
        { latitude: location.coords.latitude, longitude: location.coords.longitude },
        { latitude: studyLocation['gps_lat'], longitude: studyLocation['gps_long'] }
      )
      console.log('Distance to', studyLocation['name'], ':', distance);
      if (distance < studyLocation['gps_radius']) {
        return studyLocation;
      }
    }
    return null;
  }

  // --- Clock Related Functions ---
  const clockIn = async () => {
    try {
      let currentStudyLocation = await getStudyLocationGPS();
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');

      if (!currentStudyLocation) {
        Alert.alert('No Study Location Found', 'Please go to a study location to clock in.');
        return;
      }

      // Start Geofence monitoring
      await Location.startGeofencingAsync(GEOFENCE_TASK, [{
        latitude: currentStudyLocation['gps_lat'],
        longitude: currentStudyLocation['gps_long'],
        radius: currentStudyLocation['gps_radius'],
        notifyOnExit: true
      }]);
      console.log('Geofence started');


      // Send clock-in request to the server
      const response = await axios.post(API_URL + 'api/clockin/', { "location_id": currentStudyLocation?.id }, {
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

    const endDate = new Date(activePeriodInstance.end_date);
    const now = new Date();
    const hoursRemaining = Math.max(0, (endDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    const daysRemaining = hoursRemaining / 24;

    // Show days only if we have 24 or more hours
    const shouldShowDays = daysRemaining >= 1;

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
      daysRemaining: Math.floor(daysRemaining),
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
          <Text className="font-psemibold text-gray-600, text-lg">
            {data?.first_name} {data?.last_name?.[0]}.
          </Text>
          <Text className="font-psemibold text-green-600 text-2xl">
            {Math.round(hoursStudied())}h
          </Text>
        </View>
      </View>

      {/* Main content */}
      <View className="flex-1 flex-col justify-between">
        <ScrollView>
          <View className='h-[33vh] w-full justify-center items-center px-4'>
            {backgroundStatus && foregroundStatus ? (
              <ClockButton
                title={!isStudying ? "Start Studying" : "Stop"}
                secondaryTitle={!isStudying ? "Alkek Library" : undefined}
                handlePress={handleClock}
                isStarted={isStudying}
                percentComplete={calculatePercentComplete()}
                time={time} // Use the actual stopwatch time
                isLoading={isLoading}
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
          
          <View className='basis-1/3'>
            <Text className="font-pregular text-center text-xl">
              {!data ? "Loading..." : (
                studyHoursLeft() === 0 || requiredHours() === 0 ? (
                  <>
                    <Text className="font-bold text-green-600">
                      {hoursStudied().toFixed(2)}
                    </Text>
                    {' hours studied'}
                  </>
                ) : (
                  <>
                    <Text className="font-bold text-green-600">
                      {studyHoursLeft().toFixed(2)}
                    </Text>
                    {` hour${studyHoursLeft() !== 1 ? 's' : ''} left to reach goal of `}
                    <Text className="font-bold text-green-600">
                      {requiredHours()}
                    </Text>
                    {' hours'}
                  </>
                )
              )}
            </Text>
          </View>
          
          {/* Period info section */}
          {data?.active_period_setting && (
            <View className="px-4 py-6 bg-gray-50 mt-4">
              <Text className="font-psemibold text-center mb-2">
                Current Study Period
              </Text>
              {(() => {
                const periodInfo = getActivePeriodInfo();
                if (!periodInfo) return null;
                
                return (
                  <>
                    <Text className="font-pregular text-center text-gray-600 mb-1">
                      {periodInfo.description}
                    </Text>
                    <Text className="font-pregular text-center text-gray-600">
                      {periodInfo.shouldShowDays ? (
                        <>
                          <Text className="font-bold text-green-600">
                            {periodInfo.daysRemaining} day{periodInfo.daysRemaining !== 1 ? 's' : ''}
                          </Text>
                          {' remaining'}
                        </>
                      ) : periodInfo.hoursRemaining > 0 ? (
                        <>
                          <Text className="font-bold text-red-600">
                            {periodInfo.hoursRemaining} hour{periodInfo.hoursRemaining !== 1 ? 's' : ''}
                          </Text>
                          {' remaining'}
                        </>
                      ) : (
                        'Due now'
                      )}
                    </Text>
                    <Text className="font-pregular text-center text-gray-500 text-sm mt-1">
                      Due {periodInfo.endDate.toLocaleDateString()} at{' '}
                      {periodInfo.endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </>
                );
              })()}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

export default Study