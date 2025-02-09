import { View, Text, ScrollView, Image } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaView } from 'react-native-safe-area-context'
import numberToWords from 'number-to-words';
import ClockButton from '@/components/ClockButton'
import { useStopWatch } from '@/hooks/useStopwatch'
import { API_URL } from '@/constants';
import axios, { AxiosError } from 'axios'
import { images } from "@/constants";

const Study = () => {
  const { dashboardState, refreshDashboard, checkIsStudying, handleUnauthorized } = useDashboard()
  const { isLoading, error, data } = dashboardState

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
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');
                      //GET LOCATION ID FROM GPS INSTEAD OF THIS ->>>>>\/\/\/\/\
      const response = await axios.post(API_URL + 'api/clockin/', {"location_id":1}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

    } catch (error) {
      console.log(error)
      if (error instanceof AxiosError && error.response?.status === 401) {
        await handleUnauthorized()
      }
    }
  }

  const clockOut = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');
                      //GET LOCATION ID FROM GPS INSTEAD OF THIS ->>>>>\/\/\/\/\
      const response = await axios.post(API_URL + 'api/clockout/', {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

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
    const percentage = (studied / required) * 100;
    return Math.min(Math.round(percentage), 100);
  }

  const handleClock = () => {
    console.log("HANDLE CLOCKY")
    if (!checkIsStudying()){
      clockIn().then(() => {
        // set loading state
      }).finally(() => {
        refreshDashboard().finally(() =>{
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
    if (!checkIsStudying()){return 0}
    
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
      
    } else {setIsStudying(false)
      reset()
      stop()
      
    }
  }

  useEffect(() => {
    
    //getAllAsyncStorageData(); // Log all storage data
    refreshClock()

    console.log("Dashboard Data:", JSON.stringify(data, null, 2));

  }, [isLoading]);

  

 

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

      <ScrollView contentContainerStyle={{height: '100%'}}>
        <View className='h-[33vh] w-full justify-center items-center px-4'>
          <ClockButton
          title={!isStudying ? "Start Studying" : "Stop"}
          secondaryTitle={!isStudying ? "Alkek Library" : undefined}
          handlePress={handleClock}
          isStarted={isStudying}
          percentComplete={calculatePercentComplete()}
          time={time}
          isLoading={isLoading}
          />
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
      </ScrollView>
    </SafeAreaView>
  )
}

export default Study