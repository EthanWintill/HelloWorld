import { View, Text, ScrollView, SafeAreaView, Image } from 'react-native'
import React from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { images } from "@/constants"

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  live: boolean;
  hours?: number;
}

const Leaderboard = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState

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

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1">
        <ScrollView className="p-4">
          <Text className="text-red-500 text-lg font-bold">Error:</Text>
          <Text className="text-red-500">{JSON.stringify(error, null, 2)}</Text>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Create current user object with hours
  const currentUser = {
    ...data,
    hours: hoursStudied()
  };

  // Add placeholder hours for other users
  const otherUsersWithHours = data?.org_users
    ?.filter((user: User) => user.id !== data.id)
    .map((user: User, index: number) => ({
      ...user,
      hours: 10 - (index * 1.5) // Placeholder hours that decrease with index
    })) || [];

  // Combine current user with others and sort by hours
  const allUsers = [currentUser, ...otherUsersWithHours];
  
  // Separate live and non-live users
  const liveUsers = allUsers
    .filter(user => user.live)
    .sort((a: User, b: User) => (b.hours || 0) - (a.hours || 0));
    
  const nonLiveUsers = allUsers
    .filter(user => !user.live)
    .sort((a: User, b: User) => (b.hours || 0) - (a.hours || 0));

  return (
    <SafeAreaView className="bg-white flex-1">
      {/* Header Bar */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center">
          <Image
            source={images.logoSmall}
            className="w-10 h-10"
            resizeMode="contain"
          />
          <Text className="font-psemibold text-lg ml-1">
            {data?.org?.name || 'Organization'}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="font-psemibold text-gray-600 text-lg">
            {data?.first_name} {data?.last_name?.[0]}.
          </Text>
          <Text className="font-psemibold text-green-600 text-2xl">
            {hoursStudied().toFixed(0)}h
          </Text>
        </View>
      </View>

      {/* Main content */}
      <ScrollView className="p-4">
        <Text className="text-xl font-bold mb-6 text-center">
          {data.org ? data.org.name : "Organization"} Leaderboard
        </Text>
        
        {/* Live users section */}
        {liveUsers.length > 0 && (
          <>
            
            
            {liveUsers.map((user: User, index: number) => (
              <View 
                key={user.id} 
                className={`${user.id === data.id ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'} p-4 mb-3 rounded-lg shadow-sm border`}
              >
                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="font-bold text-lg text-gray-800">
                        {user.first_name} {user.last_name}
                      </Text>
                      {user.id === data.id && (
                        <Text className="text-gray-500 ml-1">(You)</Text>
                      )}
                      <Text className="text-green-600 font-bold text-lg ml-2">
                        {(user.hours || 0).toFixed(1)}h
                      </Text>
                    </View>
                    <Text className="text-gray-600">{user.email}</Text>
                    {user.is_staff && (
                      <Text className="text-blue-600 font-semibold mt-1">Staff Member</Text>
                    )}
                  </View>
                  <View className="items-end">
                    <View className="flex-row items-center bg-green-100 px-3 py-1 rounded-full">
                      <Text className="text-green-600 font-bold text-base mr-1">●</Text>
                      <Text className="text-green-600 font-bold text-base">LIVE</Text>
                    </View>
                    <Text className="text-gray-600 text-sm mt-1 text-right">
                      {index % 3 === 0 ? "Alkek Library" : 
                       index % 3 === 1 ? "Student Center" : 
                       "UAC Building"}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
        
        {/* Separator between live and non-live users */}
        {liveUsers.length > 0 && nonLiveUsers.length > 0 && (
          <View className="flex-row items-center my-4">
            <View className="flex-1 h-px bg-gray-200" />
            
            <View className="flex-1 h-px bg-gray-200" />
          </View>
        )}
        
        {/* Non-live users section */}
        {nonLiveUsers.map((user: User) => (
          <View 
            key={user.id} 
            className={`${user.id === data.id ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'} p-4 mb-3 rounded-lg shadow-sm border`}
          >
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="font-bold text-lg text-gray-800">
                    {user.first_name} {user.last_name}
                  </Text>
                  {user.id === data.id && (
                    <Text className="text-gray-500 ml-1">(You)</Text>
                  )}
                  <Text className="text-green-600 font-bold text-lg ml-2">
                    {(user.hours || 0).toFixed(1)}h
                  </Text>
                </View>
                <Text className="text-gray-600">{user.email}</Text>
                {user.is_staff && (
                  <Text className="text-blue-600 font-semibold mt-1">Staff Member</Text>
                )}
              </View>
            </View>
          </View>
        ))}
        
        {allUsers.length === 0 && (
          <View className="items-center justify-center py-10">
            <Text className="text-gray-500 text-center italic">
              No users in your organization
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default Leaderboard