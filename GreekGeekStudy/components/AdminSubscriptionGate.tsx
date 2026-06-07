import React, { ReactNode } from 'react'
import { ActivityIndicator, Modal, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LoadingScreen } from './LoadingScreen'
import { useDashboard } from '@/context/DashboardContext'
import { OrgSubscriptionGate, useOrgSubscriptionGate } from '@/hooks/useOrgSubscriptionGate'

type AdminSubscriptionCTAProps = {
  gate: OrgSubscriptionGate
  title?: string
  message?: string
  buttonLabel?: string
}

export const AdminSubscriptionCTA = ({
  gate,
  title = 'Start your free trial',
  message = 'Unlock admin tools and Pro access for your organization.',
  buttonLabel = 'Start Free Trial',
}: AdminSubscriptionCTAProps) => {
  if (!gate.shouldGateAdmin) return null

  return (
    <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl p-4 shadow-sm">
      <View className="flex-row items-start">
        <View className="h-10 w-10 rounded-full bg-gg-surfaceLow items-center justify-center">
          <Ionicons name="lock-closed-outline" size={20} color="#006b2c" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-psemibold text-gg-text text-base">{title}</Text>
          <Text className="font-pregular text-gg-muted text-sm mt-1">{message}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={gate.openPaywall}
        disabled={gate.revenueCatLoading || gate.subscriptionAction === 'paywall'}
        className={`mt-4 rounded-lg bg-gg-primary py-3 flex-row items-center justify-center ${(gate.revenueCatLoading || gate.subscriptionAction === 'paywall') ? 'opacity-60' : ''}`}
      >
        {gate.subscriptionAction === 'paywall' ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Ionicons name="card-outline" size={18} color="white" />
        )}
        <Text className="font-psemibold text-white ml-2">{buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

export const OrgPaywallModal = ({ gate }: { gate: OrgSubscriptionGate }) => (
  <Modal
    visible={gate.paywallVisible}
    animationType="slide"
    onRequestClose={gate.closePaywall}
  >
    <SafeAreaView className="flex-1 bg-gg-bg">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <View className="flex-row justify-end">
          <TouchableOpacity
            onPress={gate.closePaywall}
            className="h-10 w-10 rounded-full bg-gg-surface border border-gg-outlineVariant items-center justify-center"
            accessibilityLabel="Close paywall"
          >
            <Ionicons name="close" size={20} color="#3e4a3d" />
          </TouchableOpacity>
        </View>

        <View className="items-center mt-4 mb-6">
          <View className="h-16 w-16 rounded-full bg-gg-primary items-center justify-center mb-4">
            <Ionicons name="sparkles" size={30} color="white" />
          </View>
          <Text className="text-gg-text font-pbold text-3xl text-center">GreekGeek Pro</Text>
          <Text className="text-gg-muted font-pregular text-base text-center mt-3">
            Upgrade {gate.org?.name || 'your organization'} for every member in the chapter.
          </Text>
        </View>

        <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl p-4 mb-4">
          <View className="flex-row mb-4">
            <Ionicons name="people-outline" size={22} color="#006b2c" />
            <View className="ml-3 flex-1">
              <Text className="text-gg-text font-psemibold">Organization-wide access</Text>
              <Text className="text-gg-muted font-pregular text-sm mt-1">One subscription covers everyone in your org.</Text>
            </View>
          </View>
          <View className="flex-row mb-4">
            <Ionicons name="location-outline" size={22} color="#006b2c" />
            <View className="ml-3 flex-1">
              <Text className="text-gg-text font-psemibold">Verified study tracking</Text>
              <Text className="text-gg-muted font-pregular text-sm mt-1">Run study hours with location-based check-ins and admin controls.</Text>
            </View>
          </View>
          <View className="flex-row">
            <Ionicons name="bar-chart-outline" size={22} color="#006b2c" />
            <View className="ml-3 flex-1">
              <Text className="text-gg-text font-psemibold">Chapter reporting</Text>
              <Text className="text-gg-muted font-pregular text-sm mt-1">Keep officers aligned on member progress and requirements.</Text>
            </View>
          </View>
        </View>

        <View className="bg-gg-surface border-2 border-gg-primary rounded-xl p-4 mb-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-gg-text font-psemibold text-lg">{gate.proTitle}</Text>
              <Text className="text-gg-muted font-pregular text-sm mt-1">{gate.proDescription}</Text>
            </View>
            <View className="items-end">
              <Text className="text-gg-primary font-pbold text-xl">{gate.proPrice || 'Yearly'}</Text>
              <Text className="text-gg-muted font-pregular text-xs mt-1">{gate.proPrice ? 'subscription' : gate.proProductIdentifier}</Text>
            </View>
          </View>
        </View>

        {gate.revenueCatError && (
          <View className="bg-[#ffdad6] border border-[#ffb4ab] rounded-lg p-3 mb-4 flex-row">
            <Ionicons name="alert-circle" size={18} color="#ba1a1a" />
            <Text className="text-gg-error ml-2 flex-1 font-pregular text-sm">{gate.revenueCatError}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={gate.purchasePro}
          disabled={!gate.proPackage || gate.revenueCatLoading || Boolean(gate.subscriptionAction)}
          className={`bg-gg-primary rounded-xl py-4 items-center ${(!gate.proPackage || gate.revenueCatLoading || Boolean(gate.subscriptionAction)) ? 'opacity-60' : ''}`}
        >
          {gate.subscriptionAction === 'paywall' ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-pbold text-base">Start Free Trial</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={gate.restorePro}
          disabled={gate.revenueCatLoading || Boolean(gate.subscriptionAction)}
          className={`py-4 items-center ${(gate.revenueCatLoading || Boolean(gate.subscriptionAction)) ? 'opacity-60' : ''}`}
        >
          <Text className="text-gg-primary font-psemibold">Restore purchases</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  </Modal>
)

export const AdminSubscriptionBlocker = ({ children }: { children: ReactNode }) => {
  const { dashboardState } = useDashboard()
  const gate = useOrgSubscriptionGate()

  if (dashboardState.isLoading && !dashboardState.data) {
    return <LoadingScreen />
  }

  if (!gate.shouldGateAdmin) {
    return <>{children}</>
  }

  return (
    <SafeAreaView className="flex-1 bg-gg-bg">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <View className="items-center pt-10 pb-6">
          <View className="h-16 w-16 rounded-full bg-gg-surfaceLow border border-gg-outlineVariant items-center justify-center mb-4">
            <Ionicons name="lock-closed-outline" size={30} color="#006b2c" />
          </View>
          <Text className="text-gg-text font-pbold text-2xl text-center">Admin tools are locked</Text>
          <Text className="text-gg-muted font-pregular text-base text-center mt-2">
            Start the free trial to configure your organization, manage members, and view admin reports.
          </Text>
        </View>
        <AdminSubscriptionCTA
          gate={gate}
          title="Start GreekGeek Pro"
          message="Your members can keep using the app. Admin setup and reporting unlock after the trial starts."
        />
      </ScrollView>
      <OrgPaywallModal gate={gate} />
    </SafeAreaView>
  )
}
