import { View, Text, ScrollView } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaView } from 'react-native-safe-area-context'
import numberToWords from 'number-to-words';
import ClockButton from '@/components/ClockButton'
import { useStopWatch } from '@/hooks/useStopwatch'

const Study = () => {
  const { dashboardState, refreshDashboard, checkIsStudying } = useDashboard()
  const { isLoading, error, data } = dashboardState

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
  const handleClock = () => {
    console.log("HANDLE CLOCKY")
    if (!checkIsStudying()){
      start(0)
    } else {
      stop()
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
    const starter = getClockTime()
    if (checkIsStudying()) {
      start(starter)
    } else if (isRunning) {
      reset()
      stop()
    }
  }

  useEffect(() => {
    
    //getAllAsyncStorageData(); // Log all storage data
    refreshClock()
  }, [isLoading]);

  

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

  return (
    
    <SafeAreaView className="bg-white h-full">
      <ScrollView contentContainerStyle={{height: '100%'}}>
      <View className='h-[33vh] w-full justify-center items-center px-4'>
        <ClockButton
        title={!checkIsStudying() ? "Start" : "Stop"}
        handlePress={handleClock}
        isStarted={checkIsStudying()}
        percentComplete={50}
        time={time}

        />
        <Text>{time}</Text>
      </View>
      <View className='basis-1/3'>
        <Text className="font-pregular text-center text-xl">
          {studyHoursLeft() > 0 ? (
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