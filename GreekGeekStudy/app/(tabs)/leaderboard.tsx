import { View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native'
import React, { useCallback, useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { Card, EmptyState, GG, ProgressBar } from '../../components/Design'

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

interface GroupRank {
  id: number;
  name: string;
  total_hours: number;
  member_count: number;
  live_count: number;
  average_hours: number;
}

const Leaderboard = () => {
  const { dashboardState, refreshDashboard } = useDashboard()
  const { isLoading, error, data } = dashboardState
  const [activeTab, setActiveTab] = useState<'individual' | 'groups'>('individual')
  
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
      'text-gg-error', 
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
      'text-gg-error',
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
          <Text className="text-gg-error text-lg font-bold">Error:</Text>
          <Text className="text-gg-error">{JSON.stringify(error, null, 2)}</Text>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Get all users and sort by total_hours
  const allUsers = data?.org_users || [];
  
  // Create a sorted ranking of all users for trophy assignment
  const rankedUsers = [...allUsers].sort((a: User, b: User) => (b.total_hours || 0) - (a.total_hours || 0));
  
  const getRank = (userId: number): number => {
    const userRank = rankedUsers.findIndex(user => user.id === userId);
    return userRank + 1;
  };
  
  // Separate live and non-live users and sort by total_hours (highest first)
  const liveUsers = allUsers
    .filter((user: User) => user.live)
    .sort((a: User, b: User) => (b.total_hours || 0) - (a.total_hours || 0));
    
  const nonLiveUsers = allUsers
    .filter((user: User) => !user.live)
    .sort((a: User, b: User) => (b.total_hours || 0) - (a.total_hours || 0));
  const topUsers = rankedUsers.slice(0, 3);
  const listUsers = rankedUsers.slice(3);
  const initials = (user: User) => `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();

  const groupRankMap = allUsers.reduce((acc: Record<number, GroupRank>, user: User) => {
    if (!user.group) return acc;

    if (!acc[user.group.id]) {
      acc[user.group.id] = {
        id: user.group.id,
        name: user.group.name,
        total_hours: 0,
        member_count: 0,
        live_count: 0,
        average_hours: 0,
      };
    }

    acc[user.group.id].total_hours += user.total_hours || 0;
    acc[user.group.id].member_count += 1;
    acc[user.group.id].live_count += user.live ? 1 : 0;
    acc[user.group.id].average_hours = acc[user.group.id].total_hours / acc[user.group.id].member_count;

    return acc;
  }, {} as Record<number, GroupRank>);

  const rankedGroups: GroupRank[] = (Object.values(groupRankMap) as GroupRank[]).sort((a, b) => b.total_hours - a.total_hours);

  const topGroups = rankedGroups.slice(0, 3);
  const orderedGroupPodium = topGroups.length >= 3
    ? [topGroups[1], topGroups[0], topGroups[2]]
    : topGroups.length === 2
      ? [topGroups[1], topGroups[0]]
      : topGroups;
  const groupInitials = (group: GroupRank) => group.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'G';
  const groupGoal = (group: GroupRank) => (data?.active_period_setting?.required_hours || 0) * group.member_count;
  const groupPercent = (group: GroupRank) => {
    const goal = groupGoal(group);
    if (!goal) return 0;
    return Math.min(Math.round((group.total_hours / goal) * 100), 100);
  };

  return (
    <SafeAreaView className="bg-gg-bg flex-1">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <View className="px-4 py-6">
          <View className="bg-gg-surfaceLow p-1 rounded-lg flex-row items-center border border-gg-outlineVariant">
            <TouchableOpacity
              onPress={() => setActiveTab('individual')}
              className={`flex-1 py-2 rounded-md items-center ${activeTab === 'individual' ? 'bg-gg-surface' : ''}`}
            >
              <Text className={`font-psemibold ${activeTab === 'individual' ? 'text-gg-primary' : 'text-gg-muted'}`}>Individual</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('groups')}
              className={`flex-1 py-2 rounded-md items-center ${activeTab === 'groups' ? 'bg-gg-surface' : ''}`}
            >
              <Text className={`font-psemibold ${activeTab === 'groups' ? 'text-gg-primary' : 'text-gg-muted'}`}>Groups</Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'individual' ? (
          <>
        <View className="px-4 mb-8 flex-row items-end h-40">
          {[topUsers[1], topUsers[0], topUsers[2]].map((user, visualIndex) => {
            const rank = visualIndex === 0 ? 2 : visualIndex === 1 ? 1 : 3;
            const isFirst = rank === 1;
            const heightClass = isFirst ? 'h-24 pt-6' : rank === 2 ? 'h-20 pt-4' : 'h-16 pt-3';
            return (
              <View key={user?.id || rank} className="flex-1 items-center justify-end px-1">
                <View className="relative mb-2">
                  <View className={`${isFirst ? 'w-16 h-16 border-gg-primary' : 'w-14 h-14 border-gg-outlineVariant'} rounded-full border-2 bg-gg-surface items-center justify-center`}>
                    <Text className={`${isFirst ? 'text-lg' : 'text-base'} font-psemibold text-gg-primary`}>
                      {user ? initials(user) : '--'}
                    </Text>
                  </View>
                  <View className={`absolute -bottom-1 -right-1 rounded-full px-1.5 py-0.5 border ${isFirst ? 'bg-gg-primary border-gg-primary' : 'bg-gg-surface border-gg-outlineVariant'}`}>
                    <Text className={`text-[10px] font-pbold ${isFirst ? 'text-white' : 'text-gg-text'}`}>{rank}</Text>
                  </View>
                </View>
                <View className={`${heightClass} w-full rounded-t-xl border-x border-t items-center ${isFirst ? 'bg-gg-surface border-gg-primary' : rank === 2 ? 'bg-gg-surfaceContainer border-gg-outlineVariant' : 'bg-gg-surfaceHigh border-gg-outlineVariant'}`}>
                  <Text className="font-psemibold text-gg-text text-xs text-center px-1" numberOfLines={1}>
                    {user ? `${user.first_name} ${user.last_name?.[0] || ''}.` : 'Open'}
                  </Text>
                  <Text className="font-pbold text-gg-primary text-xs mt-1">{(user?.total_hours || 0).toFixed(1)}h</Text>
                  {user?.live && (
                    <View className="flex-row items-center mt-1">
                      <View className="h-1.5 w-1.5 rounded-full bg-gg-primary mr-1" />
                      <Text className="font-pbold text-gg-primary text-[8px] uppercase">Live</Text>
                    </View>
                  )}
                </View>
              </View>
            )
          })}
        </View>
          </>
        ) : (
          <View className="px-4 mb-8 flex-row items-end h-40">
            {orderedGroupPodium.map((group) => {
              const rank = rankedGroups.findIndex((rankedGroup) => rankedGroup.id === group.id) + 1;
              const isFirst = rank === 1;
              const heightClass = isFirst ? 'h-24 pt-6' : rank === 2 ? 'h-20 pt-4' : 'h-16 pt-3';
              return (
                <View key={group.id} className="flex-1 items-center justify-end px-1">
                  <View className="relative mb-2">
                    <View className={`${isFirst ? 'w-16 h-16 border-gg-primary' : 'w-14 h-14 border-gg-outlineVariant'} rounded-full border-2 bg-gg-surface items-center justify-center`}>
                      <Text className={`${isFirst ? 'text-lg' : 'text-base'} font-psemibold text-gg-primary`}>
                        {groupInitials(group)}
                      </Text>
                    </View>
                    <View className={`absolute -bottom-1 -right-1 rounded-full px-1.5 py-0.5 border ${isFirst ? 'bg-gg-primary border-gg-primary' : 'bg-gg-surface border-gg-outlineVariant'}`}>
                      <Text className={`text-[10px] font-pbold ${isFirst ? 'text-white' : 'text-gg-text'}`}>{rank}</Text>
                    </View>
                  </View>
                  <View className={`${heightClass} w-full rounded-t-xl border-x border-t items-center ${isFirst ? 'bg-gg-surface border-gg-primary' : rank === 2 ? 'bg-gg-surfaceContainer border-gg-outlineVariant' : 'bg-gg-surfaceHigh border-gg-outlineVariant'}`}>
                    <Text className="font-psemibold text-gg-text text-xs text-center px-1" numberOfLines={1}>
                      {group.name}
                    </Text>
                    <Text className="font-pbold text-gg-primary text-xs mt-1">{group.total_hours.toFixed(1)}h</Text>
                    {!!group.live_count && (
                      <View className="flex-row items-center mt-1">
                        <View className="h-1.5 w-1.5 rounded-full bg-gg-primary mr-1" />
                        <Text className="font-pbold text-gg-primary text-[8px] uppercase">{group.live_count} live</Text>
                      </View>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        <View className="bg-gg-surface rounded-t-3xl border-t border-gg-outlineVariant px-4 pt-6 min-h-[420px]">
          <Text className="font-psemibold text-gg-text text-[17px] mb-4">
            {activeTab === 'individual' ? 'Full Rankings' : 'Group Rankings'}
          </Text>
        
          {activeTab === 'individual' && rankedUsers.map((user: User) => (
            <View
              key={user.id} 
              className={`min-h-[56px] rounded-xl px-3 py-2 mb-2 flex-row items-center ${user.id === data.id ? 'border border-gg-primary bg-gg-surfaceLow' : ''}`}
            >
              <Text className={`w-7 font-pbold text-sm ${user.id === data.id ? 'text-gg-text' : 'text-gg-outline'}`}>{getRank(user.id)}</Text>
              <View className="h-10 w-10 rounded-full bg-gg-surfaceHighest border border-gg-outlineVariant items-center justify-center mr-3">
                <Text className="font-pbold text-gg-primary text-xs">{initials(user)}</Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="font-psemibold text-gg-text text-sm">
                    {user.first_name} {user.last_name}
                  </Text>
                  {user.id === data.id && (
                    <View className="bg-gg-primary rounded-full px-1.5 ml-2">
                      <Text className="font-pbold text-white text-[10px]">YOU</Text>
                    </View>
                  )}
                </View>
                <Text className="text-gg-muted font-pregular text-xs">{user.group?.name || 'No group'}</Text>
              </View>
              <View className="items-end">
                <Text className="text-gg-primary font-pbold text-sm">{(user.total_hours || 0).toFixed(1)}h</Text>
                {user.live && (
                  <View className="flex-row items-center">
                    <View className="h-1.5 w-1.5 rounded-full bg-gg-primary mr-1" />
                    <Text className="font-pbold text-gg-primary text-[8px] uppercase">Live</Text>
                  </View>
                )}
              </View>
            </View>
          ))}

          {activeTab === 'groups' && rankedGroups.map((group: GroupRank, index: number) => (
            <View
              key={group.id}
              className="min-h-[72px] rounded-xl px-3 py-3 mb-2 border border-gg-outlineVariant bg-gg-bg"
            >
              <View className="flex-row items-center">
                <Text className="w-7 font-pbold text-sm text-gg-outline">{index + 1}</Text>
                <View className="h-10 w-10 rounded-full bg-gg-surfaceHighest border border-gg-outlineVariant items-center justify-center mr-3">
                  <Text className="font-pbold text-gg-primary text-xs">{groupInitials(group)}</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="font-psemibold text-gg-text text-sm">{group.name}</Text>
                    {!!group.live_count && (
                      <View className="bg-gg-primary rounded-full px-1.5 ml-2">
                        <Text className="font-pbold text-white text-[10px]">{group.live_count} LIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-gg-muted font-pregular text-xs">
                    {group.member_count} member{group.member_count === 1 ? '' : 's'} • {group.average_hours.toFixed(1)}h avg
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-gg-primary font-pbold text-sm">{group.total_hours.toFixed(1)}h</Text>
                  <Text className="text-gg-muted font-pregular text-xs">{groupPercent(group)}%</Text>
                </View>
              </View>
              {groupGoal(group) > 0 && (
                <View className="mt-3">
                  <ProgressBar value={groupPercent(group)} />
                </View>
              )}
            </View>
          ))}
        
          {activeTab === 'individual' && allUsers.length === 0 && (
            <Card>
              <EmptyState icon="people-outline" title="No users yet" message="Members will appear here after they join the organization." />
            </Card>
          )}

          {activeTab === 'groups' && rankedGroups.length === 0 && (
            <Card>
              <EmptyState icon="albums-outline" title="No groups yet" message="Create groups and assign members to compare group rankings." />
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Leaderboard
