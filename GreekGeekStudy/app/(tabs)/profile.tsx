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
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="bg-white mx-4 mt-4 p-8 rounded-2xl shadow-sm">
          <View className="items-center mb-6">
            <View className="bg-green-100 p-6 rounded-full mb-4 relative">
              <Ionicons name="person" size={48} color="#16A34A" />
              {/* Live indicator */}
              {data.live && (
                <View className="absolute -top-1 -right-1 bg-red-500/75 w-5 h-5 rounded-full border-2 border-white" />
              )}
            </View>
            <Text className="text-3xl font-bold text-gray-900 text-center mb-2">
              {data.first_name} {data.last_name}
            </Text>
            {data.is_staff && (
              <View className="bg-green-600 px-4 py-2 rounded-full">
                <Text className="text-white font-semibold">Staff Member</Text>
              </View>
            )}
          </View>
        </View>

        <View className="px-4 mt-4">
          {/* Admin Dashboard */}
          {data.is_staff && (
            <TouchableOpacity 
              onPress={navigateToAdmin}
              className="bg-green-600 p-6 rounded-2xl shadow-sm mb-8"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="bg-white/20 p-3 rounded-full mr-4">
                    <Ionicons name="settings" size={28} color="white" />
                  </View>
                  <View>
                    <Text className="text-white font-bold text-xl">Admin Dashboard</Text>
                    <Text className="text-white/90 text-base">Manage your organization settings</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={28} color="white" />
              </View>
            </TouchableOpacity>
          )}

          {/* Contact Information */}
          <View className="bg-white p-6 rounded-2xl shadow-sm mb-8">
            <Text className="text-xl font-bold text-gray-900 mb-6">Contact Information</Text>
            
            <View className="space-y-4">
              <View className="flex-row items-center p-4 bg-gray-50 rounded-xl">
                <View className="bg-green-100 p-3 rounded-full mr-4">
                  <Ionicons name="mail" size={24} color="#16A34A" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Email Address</Text>
                  <Text className="text-gray-900 font-medium text-lg">{data.email}</Text>
                </View>
              </View>
              
              <View className="flex-row items-center p-4 bg-gray-50 rounded-xl">
                <View className="bg-green-100 p-3 rounded-full mr-4">
                  <Ionicons name="call" size={24} color="#16A34A" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Phone Number</Text>
                  <Text className="text-gray-900 font-medium text-lg">{data.phone_number}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Organization Information */}
          <View className="bg-white p-6 rounded-2xl shadow-sm mb-8">
            <Text className="text-xl font-bold text-gray-900 mb-6">Organization</Text>
            
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
            <View className="flex-row items-center p-4 bg-gray-50 rounded-xl">
              <View className="bg-green-100 p-3 rounded-full mr-4">
                <Ionicons name="business" size={24} color="#16A34A" />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-500 mb-1">Organization Name</Text>
                <Text className="text-gray-900 font-medium text-xl">{data.org?.name}</Text>
              </View>
            </View>
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

          {/* Group Information */}
          {data.group && (
            <View className="bg-white p-6 rounded-2xl shadow-sm mb-8">
              <Text className="text-xl font-bold text-gray-900 mb-6">Group</Text>
              
              <View className="flex-row items-center p-4 bg-gray-50 rounded-xl">
                <View className="bg-green-100 p-3 rounded-full mr-4">
                  <Ionicons name="people" size={24} color="#16A34A" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Group Name</Text>
                  <Text className="text-gray-900 font-medium text-xl">{data.group.name}</Text>
                </View>
              </View>
            </View>
          )}

        </View>

        {/* Sign Out Button */}
        <View className="px-4 pt-8 pb-8">
          <TouchableOpacity 
            onPress={signout}
            className="bg-white p-6 rounded-2xl shadow-sm border-2 border-red-200"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={24} color="#EF4444" />
              <Text className="text-red-500 font-bold text-xl ml-3">Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Profile

const styles = StyleSheet.create({})