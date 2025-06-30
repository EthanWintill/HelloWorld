import { View, Text, ScrollView, SafeAreaView, Image } from 'react-native'
import React, { useCallback } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { images } from "@/constants"
import { useFocusEffect } from '@react-navigation/native'

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  live: boolean;
  total_hours?: number;
  last_location?: {
    name: string;
  };
  group?: {
    id: number;
    name: string;
    org: number;
  };
}

const Leaderboard = () => {
  const { dashboardState, refreshDashboard } = useDashboard()
  const { isLoading, error, data } = dashboardState
  
  // Add useFocusEffect to refresh dashboard when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Leaderboard screen came into focus - refreshing dashboard');
      refreshDashboard();
      return () => {
        // Cleanup if needed when screen loses focus
      };
    }, [])
  );

  // Deterministic color assignment for groups
  const getGroupColor = (groupId: number): string => {
    const colors = [
      'text-purple-600',
      'text-red-600', 
      'text-orange-600',
      'text-indigo-600',
      'text-pink-600',
      'text-teal-600',
      'text-yellow-700',
      'text-rose-600',
      'text-amber-700',
      'text-violet-600',
      'text-fuchsia-600',
      'text-cyan-600',
      'text-purple-700',
      'text-red-700',
      'text-orange-700'
    ];
    
    // Use group ID to deterministically select a color
    return colors[groupId % colors.length];
  };

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

  // Only show loading screen on initial load, not during refreshes
  if (isLoading && !data) {
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

  // Get all users and sort by total_hours
  const allUsers = data?.org_users || [];
  
  // Create a sorted ranking of all users for trophy assignment
  const rankedUsers = [...allUsers].sort((a: User, b: User) => (b.total_hours || 0) - (a.total_hours || 0));
  
  // Function to get ranking emoji for top 3 users
  const getRankingEmoji = (userId: number): string => {
    const userRank = rankedUsers.findIndex(user => user.id === userId);
    switch (userRank) {
      case 0: return "🥇 ";
      case 1: return "🥈 ";
      case 2: return "🥉 ";
      default: return "";
    }
  };
  
  // Separate live and non-live users and sort by total_hours (highest first)
  const liveUsers = allUsers
    .filter((user: User) => user.live)
    .sort((a: User, b: User) => (b.total_hours || 0) - (a.total_hours || 0));
    
  const nonLiveUsers = allUsers
    .filter((user: User) => !user.live)
    .sort((a: User, b: User) => (b.total_hours || 0) - (a.total_hours || 0));

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
          <View className="items-end">
            <Text className="font-psemibold text-gray-600 text-lg">
              {data?.first_name} {data?.last_name?.[0]}.
            </Text>
            {data?.group && (
              <Text className="font-pregular text-gray-500 text-sm">
                {data.group.name}
              </Text>
            )}
          </View>
          <Text className="font-psemibold text-green-600 text-2xl">
            {hoursStudied().toFixed(0)}h
          </Text>
        </View>
      </View>

      {/* Main content */}
      <ScrollView className="p-4">
        {/* Optional loading indicator when refreshing with existing data */}
        
        
        <Text className="text-xl font-bold mb-6 text-center">
          {data?.org ? data.org.name : "Organization"} Leaderboard
        </Text>
        
        {/* Live users section */}
        {liveUsers.length > 0 && (
          <>
            <View className="flex-row items-center my-4">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="mx-4 text-gray-500 font-medium">Currently Studying</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>
            
            {liveUsers.map((user: User, index: number) => (
              <View 
                key={user.id} 
                className={`${user.id === data.id ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'} p-4 mb-3 rounded-lg shadow-sm border`}
              >
                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="font-bold text-lg text-gray-800">
                        {getRankingEmoji(user.id)}{user.first_name} {user.last_name}
                      </Text>
                      {user.id === data.id && (
                        <Text className="text-gray-500 ml-1">(You)</Text>
                      )}
                      <Text className="text-green-600 font-bold text-lg ml-2">
                        {(user.total_hours || 0).toFixed(1)}h
                      </Text>
                    </View>
                    <Text className="text-gray-600">{user.email}</Text>
                    {user.group && (
                      <Text className={getGroupColor(user.group.id)} font-medium mt-1>{user.group.name}</Text>
                    )}
                  </View>
                  <View className="items-end">
                    <View className="flex-row items-center bg-red-100 px-3 py-1 rounded-full">
                      <Text className="text-red-600 font-bold text-base mr-1">●</Text>
                      <Text className="text-red-600 font-bold text-base">LIVE</Text>
                    </View>
                    <Text className="text-gray-600 text-sm mt-1 text-right">
                      {user.last_location?.name}
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
            <Text className="mx-4 text-gray-500 font-medium">Not Currently Studying</Text>
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
                    {getRankingEmoji(user.id)}{user.first_name} {user.last_name}
                  </Text>
                  {user.id === data.id && (
                    <Text className="text-gray-500 ml-1">(You)</Text>
                  )}
                  <Text className="text-green-600 font-bold text-lg ml-2">
                    {(user.total_hours || 0).toFixed(1)}h
                  </Text>
                </View>
                <Text className="text-gray-600">{user.email}</Text>
                {user.group && (
                  <Text className={getGroupColor(user.group.id)} font-medium mt-1>{user.group.name}</Text>
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