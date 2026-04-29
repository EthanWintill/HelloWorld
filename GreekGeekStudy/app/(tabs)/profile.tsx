import React, { useState } from 'react'
import { Alert, Linking, Text, View, TouchableOpacity, SafeAreaView, ScrollView, Switch, Modal } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '@/constants';
import { router } from 'expo-router';
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'

const Profile = () => {
  const { dashboardState, refreshDashboard } = useDashboard()
  const { isLoading, error, data } = dashboardState

  // Notification toggles state
  const [notifyOrgStudying, setNotifyOrgStudying] = useState(data?.notify_org_starts_studying ?? true)
  const [notifyUserLeaves, setNotifyUserLeaves] = useState(data?.notify_user_leaves_zone ?? true)
  const [notifyDeadline, setNotifyDeadline] = useState(data?.notify_study_deadline_approaching ?? true)
  const [saving, setSaving] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)

  const signout = async () => {
    try {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'dashboardData']);
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  };

  const navigateToAdmin = () => {
    router.push('/(admin)');
  };

  const openUrl = async (path: string) => {
    await Linking.openURL(`${API_URL}${path}`)
  }

  const handleChangePassword = async () => {
    await Linking.openURL(`${API_URL}forgot-password/`)
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your GreekGeek account and sign you out. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('accessToken')
              if (!token) throw new Error('No access token found')
              await axios.delete(`${API_URL}api/me/`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'dashboardData'])
              router.replace('/(auth)/sign-in')
            } catch (error) {
              Alert.alert("Error", "Unable to delete your account. Please try again or contact support.")
            }
          }
        }
      ]
    )
  }

  // Save notification settings
  const handleSaveNotifications = async () => {
    setSaving(true)
    try {
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) throw new Error('No access token found')
      await axios.put(
        `${API_URL}api/user/${data.id}/`,
        {
          notify_org_starts_studying: notifyOrgStudying,
          notify_user_leaves_zone: notifyUserLeaves,
          notify_study_deadline_approaching: notifyDeadline,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (refreshDashboard) await refreshDashboard()
      setModalVisible(false)
    } catch (error) {
      // Optionally show a toast or error UI
    } finally {
      setSaving(false)
    }
  }

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

  return (
    <SafeAreaView className="flex-1 bg-gg-bg">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-4 pt-4">
          <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl p-4 shadow-sm">
            <View className="flex-row items-center">
              <View className="h-16 w-16 rounded-full bg-gg-surfaceLow items-center justify-center relative">
                <Ionicons name="person" size={34} color="#006b2c" />
                {data.live && (
                  <View className="absolute right-0 top-0 bg-gg-error w-4 h-4 rounded-full border-2 border-white" />
                )}
              </View>
              <View className="ml-4 flex-1">
                <Text className="font-psemibold text-gg-text text-2xl">
                  {data.first_name} {data.last_name}
                </Text>
                <Text className="font-pregular text-gg-muted mt-1">
                  {data.email}
                </Text>
              </View>
              {data.is_staff && (
                <View className="bg-gg-surfaceLow border border-gg-outlineVariant rounded-full px-3 py-1">
                  <Text className="font-psemibold text-gg-primary text-xs">Admin</Text>
                </View>
              )}
            </View>

            <View className="h-px bg-gg-surfaceHighest my-4" />

            <View className="flex-row">
              <View className="flex-1">
                <Text className="font-pregular text-gg-muted text-xs">Organization</Text>
                <Text className="font-psemibold text-gg-text mt-1">{data.org?.name || 'None'}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-pregular text-gg-muted text-xs">Group</Text>
                <Text className="font-psemibold text-gg-text mt-1">{data.group?.name || 'No group'}</Text>
              </View>
              <View className="flex-1 items-end">
                <Text className="font-pregular text-gg-muted text-xs">Status</Text>
                <Text className={`font-psemibold mt-1 ${data.live ? 'text-gg-error' : 'text-gg-text'}`}>
                  {data.live ? 'Studying' : 'Available'}
                </Text>
              </View>
            </View>
          </View>

          {data.is_staff && (
            <TouchableOpacity
              onPress={navigateToAdmin}
              className="bg-gg-primary rounded-xl p-4 mt-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1">
                <View className="h-10 w-10 rounded-full bg-gg-surface/10 items-center justify-center mr-3">
                  <Ionicons name="settings-outline" size={20} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-psemibold text-base">Admin dashboard</Text>
                  <Text className="text-white/70 font-pregular text-sm">Manage people, locations, and reports</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>
          )}

          <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl mt-4 shadow-sm overflow-hidden">
            <View className="px-4 py-3 border-b border-gg-outlineVariant">
              <Text className="font-psemibold text-gg-text text-lg">Account</Text>
            </View>

            <View className="px-4 py-4 border-b border-gg-outlineVariant flex-row items-center">
              <Ionicons name="mail-outline" size={21} color="#3e4a3d" />
              <View className="ml-3 flex-1">
                <Text className="font-pregular text-gg-muted text-xs">Email address</Text>
                <Text className="font-pmedium text-gg-text mt-1">{data.email}</Text>
              </View>
            </View>

            <View className="px-4 py-4 border-b border-gg-outlineVariant flex-row items-center">
              <Ionicons name="call-outline" size={21} color="#3e4a3d" />
              <View className="ml-3 flex-1">
                <Text className="font-pregular text-gg-muted text-xs">Phone number</Text>
                <Text className="font-pmedium text-gg-text mt-1">{data.phone_number || 'Not added'}</Text>
              </View>
            </View>

            <TouchableOpacity className="px-4 py-4 border-b border-gg-outlineVariant flex-row items-center"
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="notifications-outline" size={21} color="#3e4a3d" />
              <Text className="text-gg-text ml-3 font-pmedium flex-1">Notification settings</Text>
              <Ionicons name="chevron-forward" size={18} color="#6e7b6c" />
            </TouchableOpacity>

            <TouchableOpacity
              className="px-4 py-4 border-b border-gg-outlineVariant flex-row items-center"
              onPress={handleChangePassword}
            >
              <Ionicons name="lock-closed-outline" size={21} color="#3e4a3d" />
              <Text className="text-gg-text ml-3 font-pmedium flex-1">Change password</Text>
              <Ionicons name="chevron-forward" size={18} color="#6e7b6c" />
            </TouchableOpacity>

            <TouchableOpacity
              className="px-4 py-4 flex-row items-center"
              onPress={() => Linking.openURL('mailto:support@greekgeek.app')}
            >
              <Ionicons name="help-circle-outline" size={21} color="#3e4a3d" />
              <Text className="text-gg-text ml-3 font-pmedium flex-1">Help and support</Text>
              <Ionicons name="chevron-forward" size={18} color="#6e7b6c" />
            </TouchableOpacity>
          </View>

          <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl mt-4 shadow-sm overflow-hidden">
            <View className="px-4 py-3 border-b border-gg-outlineVariant">
              <Text className="font-psemibold text-gg-text text-lg">Legal and access</Text>
            </View>
            <TouchableOpacity
              className="px-4 py-4 border-b border-gg-outlineVariant flex-row items-center"
              onPress={() => openUrl('privacy/')}
            >
              <Ionicons name="shield-checkmark-outline" size={21} color="#3e4a3d" />
              <Text className="text-gg-text ml-3 font-pmedium flex-1">Privacy policy</Text>
              <Ionicons name="chevron-forward" size={18} color="#6e7b6c" />
            </TouchableOpacity>
            <TouchableOpacity
              className="px-4 py-4 border-b border-gg-outlineVariant flex-row items-center"
              onPress={() => openUrl('terms/')}
            >
              <Ionicons name="document-text-outline" size={21} color="#3e4a3d" />
              <Text className="text-gg-text ml-3 font-pmedium flex-1">Terms of service</Text>
              <Ionicons name="chevron-forward" size={18} color="#6e7b6c" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={signout}
              className="px-4 py-4 border-b border-gg-outlineVariant flex-row items-center"
            >
              <Ionicons name="log-out-outline" size={21} color="#3e4a3d" />
              <Text className="text-gg-text ml-3 font-pmedium flex-1">Sign out</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="px-4 py-4 flex-row items-center"
              onPress={handleDeleteAccount}
            >
              <Ionicons name="trash-outline" size={21} color="#ba1a1a" />
              <Text className="text-gg-error ml-3 font-pmedium flex-1">Delete account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-gg-surface p-5 rounded-t-2xl">
              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-xl font-psemibold text-gg-text">Notification settings</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="h-9 w-9 rounded-full bg-gg-surfaceContainer items-center justify-center"
                >
                  <Ionicons name="close" size={20} color="#3e4a3d" />
                </TouchableOpacity>
              </View>
              <View className="flex-row justify-between items-center py-3 border-b border-gg-outlineVariant">
                <Text className="text-gg-muted flex-1 font-pregular pr-4">Someone starts studying</Text>
                <Switch value={notifyOrgStudying} onValueChange={setNotifyOrgStudying} />
              </View>
              <View className="flex-row justify-between items-center py-3 border-b border-gg-outlineVariant">
                <Text className="text-gg-muted flex-1 font-pregular pr-4">A user leaves the study zone</Text>
                <Switch value={notifyUserLeaves} onValueChange={setNotifyUserLeaves} />
              </View>
              <View className="flex-row justify-between items-center py-3">
                <Text className="text-gg-muted flex-1 font-pregular pr-4">Study deadline is approaching</Text>
                <Switch value={notifyDeadline} onValueChange={setNotifyDeadline} />
              </View>
              <View className="flex-row mt-6">
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="flex-1 py-4 rounded-lg bg-gg-surfaceContainer mr-2 items-center"
                >
                  <Text className="text-gg-muted font-psemibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveNotifications}
                  className={`flex-1 py-4 rounded-lg bg-gg-primary ml-2 items-center ${saving ? 'opacity-60' : ''}`}
                  disabled={saving}
                >
                  <Text className="text-white font-psemibold">{saving ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Profile
