import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native'
import React from 'react'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Card, EmptyState, ProgressBar, ScreenHeader } from '../../components/Design'

type ChecklistItem = {
  key: string
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  complete: boolean
  route: string
}

const SetupChecklist = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <ScrollView className="flex-1 p-4 bg-gg-bg">
        <Text className="text-gg-error text-lg font-psemibold">Error:</Text>
        <Text className="text-gg-error">{JSON.stringify(error, null, 2)}</Text>
      </ScrollView>
    )
  }

  if (!data?.is_staff) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-4 bg-gg-bg">
        <EmptyState
          icon="lock-closed-outline"
          title="Access denied"
          message="You do not have permission to access setup."
        />
      </SafeAreaView>
    )
  }

  const orgGroups = data?.org_groups || []
  const users = data?.org_users || []
  const locations = data?.org_locations || []

  const items: ChecklistItem[] = [
    {
      key: 'details',
      title: 'Confirm organization details',
      subtitle: data?.org?.name && data?.org?.school ? `${data.org.name} at ${data.org.school}` : 'Add organization name and school.',
      icon: 'business-outline',
      complete: Boolean(data?.org?.name && data?.org?.school && data?.org?.reg_code),
      route: '/(admin)/organization',
    },
    {
      key: 'locations',
      title: 'Define study locations',
      subtitle: locations.length ? `${locations.length} approved study area${locations.length === 1 ? '' : 's'} configured.` : 'Add GPS-approved study areas.',
      icon: 'map-outline',
      complete: locations.length > 0,
      route: '/(admin)/study-locations',
    },
    {
      key: 'groups',
      title: 'Create student groups',
      subtitle: orgGroups.length ? `${orgGroups.length} group${orgGroups.length === 1 ? '' : 's'} ready.` : 'Create groups for reporting and leaderboards.',
      icon: 'people-outline',
      complete: orgGroups.length > 0,
      route: '/(admin)/groups',
    },
    {
      key: 'rules',
      title: 'Set academic rules',
      subtitle: data?.active_period_setting ? `${data.active_period_setting.required_hours} required hours are active.` : 'Create required hours and period cadence.',
      icon: 'clipboard-outline',
      complete: Boolean(data?.active_period_setting),
      route: '/(admin)/study-periods',
    },
    {
      key: 'members',
      title: 'Invite or add members',
      subtitle: users.length ? `${users.length} member${users.length === 1 ? '' : 's'} on the roster.` : 'Add the first member or share the registration code.',
      icon: 'person-add-outline',
      complete: users.length > 1,
      route: '/(admin)/users',
    },
    {
      key: 'verification',
      title: 'Review verification settings',
      subtitle: data?.org_settings?.require_location_verification === false ? 'Location verification is disabled.' : 'Location verification is enabled.',
      icon: 'shield-checkmark-outline',
      complete: Boolean(data?.org_settings),
      route: '/(admin)/settings',
    },
  ]

  const completed = items.filter(item => item.complete).length
  const completion = Math.round((completed / items.length) * 100)
  const nextItem = items.find(item => !item.complete)

  return (
    <SafeAreaView className="flex-1 bg-gg-bg">
      <ScreenHeader
        title="Setup Checklist"
        subtitle={`${completed} of ${items.length} steps complete`}
        right={(
          <View className="h-11 w-11 rounded-full bg-gg-surfaceLow items-center justify-center">
            <Text className="font-psemibold text-gg-primary">{completion}%</Text>
          </View>
        )}
      />

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <Card className="mb-5">
          <View className="flex-row justify-between items-end mb-3">
            <View>
              <Text className="font-pmedium text-gg-muted text-xs uppercase tracking-wider">Setup Completion</Text>
              <Text className="font-psemibold text-gg-text text-2xl mt-1">{completion}%</Text>
            </View>
            <Text className="font-pregular text-gg-muted">{completed}/{items.length}</Text>
          </View>
          <ProgressBar value={completion} />
        </Card>

        <View className="mb-5">
          {items.map((item, index) => {
            const isActive = !item.complete && item.key === nextItem?.key
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => router.push(item.route as any)}
                className={`bg-gg-surface border rounded-xl p-4 mb-3 flex-row items-center shadow-sm ${isActive ? 'border-gg-primary' : 'border-gg-outlineVariant'}`}
              >
                {isActive && <View className="absolute left-0 top-0 bottom-0 w-1 bg-gg-primary rounded-l-xl" />}
                <View className={`h-11 w-11 rounded-lg items-center justify-center mr-3 ${item.complete ? 'bg-gg-surfaceLow' : 'bg-gg-bg'}`}>
                  <Ionicons
                    name={item.complete ? 'checkmark-circle-outline' : item.icon}
                    size={23}
                    color={item.complete ? '#006b2c' : '#3e4a3d'}
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className={`font-pmedium text-xs uppercase tracking-wider ${isActive ? 'text-gg-primary' : 'text-gg-muted'}`}>
                      {item.complete ? 'Configured' : isActive ? 'Active' : 'Pending'}
                    </Text>
                    <View className={`border rounded-full px-2 py-0.5 ${item.complete ? 'bg-gg-surfaceLow border-gg-outlineVariant' : 'bg-[#ffdad6] border-[#ffb4ab]'}`}>
                      <Text className={`font-psemibold text-xs ${item.complete ? 'text-gg-primary' : 'text-gg-error'}`}>
                        {item.complete ? 'Ready' : 'Incomplete'}
                      </Text>
                    </View>
                  </View>
                  <Text className="font-psemibold text-gg-text mt-1">{item.title}</Text>
                  <Text className="font-pregular text-gg-muted text-sm mt-1">{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color="#6e7b6c" />
              </TouchableOpacity>
            )
          })}
        </View>

        <Card className="mb-4">
          <View className="flex-row items-start">
            <View className="h-10 w-10 rounded-full bg-[#dbe1ff] items-center justify-center mr-3">
              <Ionicons name="information-circle-outline" size={22} color="#0051d5" />
            </View>
            <View className="flex-1">
              <Text className="font-psemibold text-gg-secondary">Need help with rules?</Text>
              <Text className="font-pregular text-gg-muted text-sm mt-1">
                Start with locations and required hours. Groups and reports become more useful once members begin clocking verified sessions.
              </Text>
            </View>
          </View>
        </Card>

        <TouchableOpacity
          onPress={() => router.replace('/(admin)' as any)}
          className="bg-gg-primary min-h-[56px] rounded-lg items-center justify-center"
        >
          <Text className="text-white font-psemibold">Go to Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          className="h-12 items-center justify-center"
        >
          <Text className="text-gg-muted font-psemibold">Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

export default SetupChecklist
