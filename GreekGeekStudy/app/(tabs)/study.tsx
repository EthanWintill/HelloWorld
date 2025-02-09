import { View, Text, ScrollView, Alert, Linking } from 'react-native'
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
import { GEOFENCE_TASK } from '@/geofenceTask'
import haversine from 'haversine-distance'
import eventBus, { GEOFENCE_EXIT } from '@/helpers/eventBus';


const Study = () => {
  const { dashboardState, refreshDashboard, checkIsStudying, handleUnauthorized } = useDashboard()
  const { isLoading, error, data } = dashboardState
  const [locationGranted, setLocationGranted] = useState('UNKNOWN');

const showSettingsAlert = () => {
    Alert.alert(
      "Permission Required",
      "You must enable location sharing to use this app. Please go to settings to enable it.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Settings",
          onPress: () => Linking.openSettings()
        }
      ]
    );
  };

  const handleLocationPermission = async () => {
    const res = await Location.requestBackgroundPermissionsAsync();
    console.log('Location Permission:', res);
    if (res.status === 'granted') {
      setLocationGranted('GRANTED');
    } else if (!res.canAskAgain){
      setLocationGranted('BLOCKED');
      showSettingsAlert();
    } else {
      setLocationGranted('DENIED');
    }
  };

  
  const [isStudying, setIsStudying] = useState(false)

  /*
        TODO:
        -clock in can currently be bypassed with airplane mode since
        the server just takes a call for clock in and clock out and trusts
        it. If the app cannot make the clock out call, it will keep racking up hours.
        Fix: store locally if they leave location, or go airplane, then add a backend
        call to manually fix the hours on clock out so they cant rack up hours like that

        -Fix dashboard loading state, Instead of not rendering anything lets put a loading circle on stuff
        -Add loading state for clock in/ out requests, put loading circle on button.

        -obviously we need location, it is currently manually set to location_id 1 in the clock in function
        
        -Design stuff? Maybe org name at the top,  maybe some sort of menu on the top for stuff?

        -Admin stuff, add/modify locations, admin menu?
  */

  const clockIn = async () => {
    try {
      let currentStudyLocation;
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');

      // Get the current location of the user
      const location = await Location.getCurrentPositionAsync();
      console.log('Current location: ', location.coords);

      // Find the study location within the allowed radius
      const studyLocations = dashboardState.data['org_locations'];
      for (const studyLocation of studyLocations) {
        const distance = haversine(
          { latitude: location.coords.latitude, longitude: location.coords.longitude },
          { latitude: studyLocation['gps_lat'], longitude: studyLocation['gps_long'] }
        )
        console.log('Distance to', studyLocation['name'], ':', distance);
        if (distance < studyLocation['gps_radius']) {
          currentStudyLocation = studyLocation;
          break;
        }
      }

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

  const getAllAsyncStorageData = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);

      console.log('All AsyncStorage Data:');
      console.log('--------------------');
      items.forEach(([key, value]) => {
        console.log(`${key}:`, value);
      });
      console.log('--------------------');

      return items;

    } catch (error) {
      console.error('Error getting AsyncStorage data:', error);
      return [];
    }
  };
  const studyHoursLeft = () => {
    const hoursSoFar = data['user_sessions'].reduce((acc: number, session: any) => acc + session['hours'], 0);
    return data['org']['study_req'] - hoursSoFar;
  }

  useEffect(() => {
    getAllAsyncStorageData(); // Log all storage data
    handleLocationPermission();
  }, []);

  const clockOutAndRefresh = () => {
    clockOut().then(() => {
      // loading state
    }).finally(() => {
      refreshDashboard().finally(() => {
        refreshClock()
      })
    })
  }

  const handleClock = () => {
    console.log("HANDLE CLOCKY")
    if (!checkIsStudying()) {
      clockIn().then(() => {
        // set loading state
      }).finally(() => {
        refreshDashboard().finally(() => {
          refreshClock()
        })
      })

    } else {
      clockOut().then(() => {
        // loading state
      }).finally(() => {
        refreshDashboard().finally(() => {
          refreshClock()
        })
      })
    }

  }

  const getClockTime = () => {
    console.log("HELLOOOOOOOO")
    if (!checkIsStudying()) { return 0 }

    const lastSession = data.user_sessions[data.user_sessions.length - 1];

    const startTime = lastSession.start_time
    const startTimeMillis = new Date(startTime).getTime()
    console.log("START TIME")
    console.log(startTimeMillis)
    return startTimeMillis
  }

  const refreshClock = () => {
    console.log("REFRESHYYYYY")

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

  useEffect(() => {

    //getAllAsyncStorageData(); // Log all storage data
    refreshClock()
  }, [isLoading]);

  useEffect(() => {
    const exitHandler = () => {
      clockOutAndRefresh();
    };

    eventBus.on(GEOFENCE_EXIT, exitHandler);

    return () => {
      eventBus.off(GEOFENCE_EXIT, exitHandler);
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
      <ScrollView contentContainerStyle={{ height: '100%' }}>
        <View className='h-[33vh] w-full justify-center items-center px-4'>
          {locationGranted === 'GRANTED' || locationGranted === 'DENIED' ? (
            <ClockButton
              title={!isStudying ? "Start Studying" : "Stop"}
              secondaryTitle={!isStudying ? "Alkek Library" : undefined}
              handlePress={handleClock}
              isStarted={isStudying}
              percentComplete={50}
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
            {!data ? (
              "Loading..."
            ) : studyHoursLeft() > 0 ? (
              <>
                <Text className="font-bold text-green-600">
                  {numberToWords.toWords(studyHoursLeft()).charAt(0).toUpperCase() + numberToWords.toWords(studyHoursLeft()).slice(1)}
                </Text> hour{studyHoursLeft() > 1 ? 's' : ''} left to reach study goal of
                <Text className="font-bold text-green-600">
                  {" " + numberToWords.toWords(data['org']['study_req'])}
                </Text> hours.
              </>
            ) : (
              <>
                <Text className="font-bold text-green-600">
                  {numberToWords.toWords(data['user_sessions'].reduce((acc: number, session: any) => acc + session['hours'], 0)).charAt(0).toUpperCase() + numberToWords.toWords(data['user_sessions'].reduce((acc: number, session: any) => acc + session['hours'], 0)).slice(1)}
                </Text> hours studied so far.
              </>
            )}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Study