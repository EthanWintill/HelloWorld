import React, { useState } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, Switch, Modal } from 'react-native'
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
        <Text className="text-red-500 text-lg font-bold">Error:</Text>
        <Text className="text-red-500">{JSON.stringify(error, null, 2)}</Text>
      </ScrollView>
    )
  }

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-1 justify-between p-4">
        <View>
          <View className="bg-white p-4 rounded-lg shadow mb-4">
            <Text className="text-2xl font-bold mb-2">
              {data.first_name} {data.last_name}
            </Text>
            <Text className="text-gray-600 mb-1">{data.email}</Text>
            <Text className="text-gray-600 mb-1">{data.phone_number}</Text>
            {data.is_staff && (
              <Text className="text-blue-600 font-semibold">Staff Member</Text>
            )}
            <Text className="text-gray-600 mt-2 font-semibold">
              Organization: {data.org?.name}
            </Text>
          </View>

          {data.is_staff && (
            <TouchableOpacity 
              onPress={navigateToAdmin}
              className="bg-green-600 p-4 rounded-lg shadow mb-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <Ionicons name="settings-outline" size={24} color="white" />
                <Text className="text-white font-bold text-lg ml-2">Admin Dashboard</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="white" />
            </TouchableOpacity>
          )}

          <View className="bg-white p-4 rounded-lg shadow mb-4">
            <Text className="text-lg font-bold mb-3">Account Settings</Text>
            
            <TouchableOpacity className="flex-row items-center py-2 border-b border-gray-200">
              <Ionicons name="person-outline" size={20} color="#4B5563" className="mr-2" />
              <Text className="text-gray-700 ml-2">Edit Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-row items-center py-2 border-b border-gray-200">
              <Ionicons name="lock-closed-outline" size={20} color="#4B5563" className="mr-2" />
              <Text className="text-gray-700 ml-2">Change Password</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-row items-center py-2 border-b border-gray-200"
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="notifications-outline" size={20} color="#4B5563" className="mr-2" />
              <Text className="text-gray-700 ml-2">Notification Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-row items-center py-2">
              <Ionicons name="help-circle-outline" size={20} color="#4B5563" className="mr-2" />
              <Text className="text-gray-700 ml-2">Help & Support</Text>
            </TouchableOpacity>
          </View>

          {/* Notification Settings Modal */}
          <Modal
            visible={modalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setModalVisible(false)}
          >
            <View className="flex-1 justify-center items-center bg-black/40">
              <View className="bg-white p-6 rounded-lg w-11/12 max-w-xl">
                <Text className="text-xl font-bold mb-4 text-center">Notification Settings</Text>
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-gray-700 flex-1">Notify when someone in your org starts studying</Text>
                  <Switch value={notifyOrgStudying} onValueChange={setNotifyOrgStudying} />
                </View>
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-gray-700 flex-1">Notify when a user leaves the study zone</Text>
                  <Switch value={notifyUserLeaves} onValueChange={setNotifyUserLeaves} />
                </View>
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-gray-700 flex-1">Notify when a study period deadline is approaching</Text>
                  <Switch value={notifyDeadline} onValueChange={setNotifyDeadline} />
                </View>
                <View className="flex-row justify-end mt-6">
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    className="px-4 py-2 rounded-lg bg-gray-200 mr-2"
                  >
                    <Text className="text-gray-700 font-bold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
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
                    }}
                    className={`px-4 py-2 rounded-lg bg-green-600 ${saving ? 'opacity-60' : ''}`}
                    disabled={saving}
                  >
                    <Text className="text-white font-bold">{saving ? 'Saving...' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>

        <TouchableOpacity 
          onPress={signout}
          className="bg-red-500 px-8 py-3 rounded-lg"
        >
          <Text className="text-white font-bold text-lg text-center">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default Profile

const styles = StyleSheet.create({})