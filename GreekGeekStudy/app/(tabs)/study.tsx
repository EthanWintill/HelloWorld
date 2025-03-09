import { View, Text, ScrollView, Alert, Linking, Image } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaView } from 'react-native-safe-area-context'
import numberToWords from 'number-to-words';
import Geolocation from 'react-native-geolocation-service';
import * as Location from 'expo-location'
import ClockButton from '@/components/ClockButton'
import PermissionButton from '@/components/PermissionButton'
import { useStopWatch } from '@/hooks/useStopwatch'
import { API_URL } from '@/constants';
import axios, { AxiosError } from 'axios'
import { images } from "@/constants";
import haversine from 'haversine-distance'
import * as TaskManager from 'expo-task-manager';

const GEOFENCE_TASK = 'GEOFENCE_TASK';

let timeoutId: NodeJS.Timeout | null = null;

    TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
      if (error) {
        console.error(error);
        return;
      }
      console.log('Background task executed with data:', data);

      const { eventType } = data as GeofencingEvent;

      if (eventType === Location.GeofencingEventType.Enter) {
        console.log('You have entered the geofence');
        console.log('timeoutId:', timeoutId);
        if(timeoutId) {
          clearTimeout(timeoutId);
        }
      } else if (eventType === Location.GeofencingEventType.Exit) {
        console.log('You have exited the geofence');
        Alert.alert('Please enter the geofence to continue studying, you have 5 minutes to do so.');
        timeoutId = setTimeout(() => {
          console.log('5 minutes have passed');
          Alert.alert('You have been clocked out for not entering the geofence in time.');
          //clockOutAndRefresh();
        }, 15000);
        console.log('Timeout id:', timeoutId);
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

  const [backgroundStatus, backgroundRequestPermission] = Location.useBackgroundPermissions();
  const [foregroundStatus, foregroundRequestPermission] = Location.useForegroundPermissions();

  const [locationGranted, setLocationGranted] = useState('UNKNOWN');
  const [isStudying, setIsStudying] = useState(false)
  const {
    time,
    isRunning,
    start,
    stop,
    reset,
    lap,
    laps,
    currentLapTime,
    hasStarted,
    slowestLapTime,
    fastestLapTime,
  } = useStopWatch();

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
    let res = foregroundStatus
    console.log('Foreground Location Permission:', res);

    if (!res) {
      res = await foregroundRequestPermission();
      console.log('Foreground Location Permission:', res);
    } 

    while (!res.granted && res.canAskAgain) {
      await new Promise(resolve => setTimeout(resolve, 100));
      res = await foregroundRequestPermission();
      console.log('Foreground Location Permission:', res);
    }

    if (!res.granted && !res.canAskAgain) {
      setLocationGranted('BLOCKED')
      showSettingsAlert()
    }

    if (res.granted) {
      setLocationGranted('GRANTED');
    } else {
      setLocationGranted('DENIED');
    }

  } 
  const handleLocationPermission = async () => {
    await handleForegroundLocationPermission();
    let res = backgroundStatus
    console.log('Location Permission:', res);

    if (!res) {
      res = await backgroundRequestPermission();
      console.log('Location Permission:', res);
    }

    while (!res.granted && res.canAskAgain) {
      await new Promise(resolve => setTimeout(resolve, 100));
      res = await backgroundRequestPermission();
      console.log('Location Permission:', res);
    }

    if (!res.granted && !res.canAskAgain) {
      setLocationGranted('BLOCKED')
      showSettingsAlert()
    }

    if (res.granted) {
      setLocationGranted('GRANTED');
    
    } else {
      setLocationGranted('DENIED');
    }
  };

  const getStudyLocationGPS = async () => {
    await handleLocationPermission();
    if (locationGranted !== 'GRANTED') return null;
    const location = await Location.getCurrentPositionAsync();
    const studyLocations = dashboardState.data['org_locations'];
    for (const studyLocation of studyLocations) {
      const distance = haversine(
        { latitude: location.coords.latitude, longitude: location.coords.longitude },
        { latitude: studyLocation['gps_lat'], longitude: studyLocation['gps_long'] }
      )
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

      //If no location found, alert the user
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
      .then(() => {})
      .finally(() => {
        refreshDashboard().finally(() => refreshClock())
      })
  }

  const handleClock = () => {
    if (!checkIsStudying()) {
      clockIn()
        .then(() => {})
        .finally(() => {
          refreshDashboard().finally(() => refreshClock())
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

  const refreshClock = () => {
    if (checkIsStudying()) {
      const starter = getClockTime()
      setIsStudying(true)
      start(starter)
    } else {
      setIsStudying(false)
      reset()
      stop()
    }
  }

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
    handleLocationPermission();
    // Uncomment the next line when you want to clear storage
    //clearAsyncStorage();
    
    refreshClock();
    //console.log("Dashboard Data:", JSON.stringify(data, null, 2));
  }, [isLoading]);

  useEffect(() => {
    const exitHandler = () => {
      clockOutAndRefresh();
    };


    return () => {
      TaskManager.unregisterTaskAsync(GEOFENCE_TASK);
    };
  }, []);

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
          {locationGranted === 'GRANTED' || locationGranted === 'DENIED' ? (
            <ClockButton
              title={!isStudying ? "Start Studying" : "Stop"}
              secondaryTitle={!isStudying ? "Alkek Library" : undefined}
              handlePress={handleClock}
              isStarted={isStudying}
              percentComplete={calculatePercentComplete()}
              time={time}
              isLoading={isLoading}
            />
          ) : (
            <PermissionButton
              handlePress={handleLocationPermission}/>
            )}
          </View>
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
          
          {/* Period info section - moved inside ScrollView */}
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