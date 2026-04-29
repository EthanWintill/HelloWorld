import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Card, GG, ScreenHeader } from '../../components/Design'

interface AdminMenuItemProps {
  title: string;
  icon: any;
  route: string;
  description: string;
}

const AdminMenuItem: React.FC<AdminMenuItemProps> = ({ title, icon, route, description }) => {
  const router = useRouter()
  
  return (
    <TouchableOpacity 
      className="p-4 flex-row items-center border-b border-gg-outlineVariant"
      onPress={() => router.push(route as any)}
    >
      <View className="h-10 w-10 mr-3 items-center justify-center">
        <Ionicons name={icon} size={22} color={GG.muted} />
      </View>
      <View className="flex-1">
        <Text className="font-psemibold text-gg-text text-sm">{title}</Text>
        <Text className="font-pregular text-gg-muted text-xs mt-1">{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#6e7b6c" />
    </TouchableOpacity>
  )
}

const AdminDashboard = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState
  const router = useRouter()
  
  if (isLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <ScrollView className="flex-1 p-4">
        <Text className="text-gg-error text-lg font-bold">Error:</Text>
        <Text className="text-gg-error">{JSON.stringify(error, null, 2)}</Text>
      </ScrollView>
    )
  }

  // Check if user is admin
  if (!data.is_staff) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-4">
        <Ionicons name="alert-circle" size={64} color="#ba1a1a" />
        <Text className="text-xl font-psemibold text-center mt-4 mb-2">Access Denied</Text>
        <Text className="text-gg-muted text-center">You don't have permission to access the admin panel.</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gg-bg">
      <ScreenHeader
        title="Admin Dashboard"
        subtitle={`${data?.org?.name || 'Organization'} operations`}
      />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row flex-wrap -mx-1 mb-6">
          <View className="w-full px-1 mb-2">
            <Card className="flex-row items-center justify-between">
              <View>
                <Text className="font-psemibold text-gg-text text-[17px]">Live users</Text>
                <Text className="font-pbold text-gg-primary text-3xl mt-1">
                  {(data?.org_users || []).filter((user: any) => user.live).length}
                </Text>
              </View>
              <View className="w-12 h-12 bg-gg-surfaceLow rounded-full items-center justify-center">
                <Ionicons name="radio-outline" size={24} color={GG.primary} />
              </View>
            </Card>
          </View>
          <View className="w-1/2 px-1">
            <Card>
              <Ionicons name="map-outline" size={22} color={GG.primary} />
              <Text className="font-pregular text-gg-muted text-xs uppercase mt-2">Active Areas</Text>
              <Text className="font-psemibold text-gg-text text-[17px] mt-1">{data?.org_locations?.length || 0} Areas</Text>
            </Card>
          </View>
          <View className="w-1/2 px-1">
            <View className="bg-gg-surface border border-gg-outlineVariant border-l-4 border-l-gg-tertiary rounded-xl p-4">
              <Ionicons name="warning-outline" size={22} color={GG.error} />
              <Text className="font-pregular text-gg-muted text-xs uppercase mt-2">Behind Target</Text>
              <Text className="font-psemibold text-gg-text text-[17px] mt-1">
                {(data?.org_users || []).filter((user: any) => (user.total_hours || 0) < (data?.active_period_setting?.required_hours || 0)).length} Users
              </Text>
            </View>
          </View>
        </View>

        <Text className="font-psemibold mb-2 text-gg-muted text-[17px]">Setup Checklist</Text>
        <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl overflow-hidden mb-6">
          {[
            {
              title: 'Configure Study Areas',
              detail: `${data?.org_locations?.length || 0} zones defined`,
              complete: (data?.org_locations?.length || 0) > 0,
              route: '/(admin)/study-locations',
            },
            {
              title: 'Set Period Requirements',
              detail: data?.active_period_setting ? `${data.active_period_setting.required_hours} required hours` : 'Incomplete • Missing active rules',
              complete: Boolean(data?.active_period_setting),
              route: '/(admin)/study-periods',
            },
            {
              title: 'Import Membership Roster',
              detail: `${data?.org_users?.length || 0} active records synced`,
              complete: (data?.org_users?.length || 0) > 1,
              route: '/(admin)/users',
            },
          ].map((item, index) => (
            <TouchableOpacity
              key={item.title}
              onPress={() => router.push(item.route as any)}
              className={`p-4 flex-row items-center ${index < 2 ? 'border-b border-gg-outlineVariant' : ''} ${item.complete ? 'opacity-70' : ''}`}
            >
              <Ionicons
                name={item.complete ? 'checkmark-circle' : 'radio-button-off'}
                size={22}
                color={item.complete ? GG.primary : GG.outline}
              />
              <View className="flex-1 ml-3">
                <Text className="font-psemibold text-gg-text text-sm">{item.title}</Text>
                <Text className={`font-pregular text-xs mt-1 ${item.complete ? 'text-gg-muted' : 'text-gg-tertiary'}`}>{item.detail}</Text>
              </View>
              {!item.complete && (
                <View className="bg-gg-primary rounded-full px-3 py-1">
                  <Text className="font-psemibold text-white text-xs">Fix</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View className="mb-6">
          <Text className="font-pregular text-gg-muted text-xs uppercase tracking-wider mb-2">People & Access</Text>
          <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl overflow-hidden">
            <AdminMenuItem 
              title="Member Directory" 
              icon="people" 
              route="/(admin)/users" 
              description={`Manage ${data?.org_users?.length || 0} GreekGeek members`}
            />
            <AdminMenuItem 
              title="Groups" 
              icon="albums" 
              route="/(admin)/groups" 
              description={`${new Set((data?.org_users || []).map((user: any) => user.group?.id).filter(Boolean)).size} groups currently active`}
            />
          </View>
        </View>

        <View className="mb-6">
          <Text className="font-pregular text-gg-muted text-xs uppercase tracking-wider mb-2">Academic Governance</Text>
          <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl overflow-hidden">
            <AdminMenuItem 
              title="Organization Settings" 
              icon="business" 
              route="/(admin)/organization" 
              description="Chapter details and registration code"
            />
            <AdminMenuItem 
              title="Study Locations" 
              icon="map" 
              route="/(admin)/study-locations" 
              description={`${data?.org_locations?.length || 0} approved study area${data?.org_locations?.length === 1 ? '' : 's'}`}
            />
            <AdminMenuItem 
              title="Study Periods" 
              icon="calendar" 
              route="/(admin)/study-periods" 
              description={data?.active_period_setting ? `${data.active_period_setting.required_hours} required hours` : 'Configure active requirements'}
            />
          </View>
        </View>

        <View className="mb-6">
          <Text className="font-pregular text-gg-muted text-xs uppercase tracking-wider mb-2">Intel & Exports</Text>
          <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl overflow-hidden">
            <AdminMenuItem 
              title="Weekly Performance" 
              icon="analytics" 
              route="/(admin)/reports" 
              description="Export chapter CSV reports"
            />
            <AdminMenuItem 
              title="Admin Settings" 
              icon="settings" 
              route="/(admin)/settings" 
              description="Verification and operational controls"
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(admin)/setup-checklist' as any)}
          className="bg-gg-primary min-h-[56px] rounded-lg mb-2 items-center justify-center"
        >
          <Text className="font-psemibold text-white">Open Setup Checklist</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

export default AdminDashboard 
