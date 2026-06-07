import React, { useState } from 'react'
import { ActivityIndicator, Alert, Image, Linking, Text, View, TouchableOpacity, SafeAreaView, ScrollView, Switch, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '@/constants';
import { router } from 'expo-router';
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

const Profile = () => {
  const { dashboardState, refreshDashboard } = useDashboard()
  const { isLoading, error, data } = dashboardState

  // Notification toggles state
  const [notifyOrgStudying, setNotifyOrgStudying] = useState(data?.notify_org_starts_studying ?? true)
  const [notifyUserLeaves, setNotifyUserLeaves] = useState(data?.notify_user_leaves_zone ?? true)
  const [notifyDeadline, setNotifyDeadline] = useState(data?.notify_study_deadline_approaching ?? true)
  const [saving, setSaving] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [profilePictureUploading, setProfilePictureUploading] = useState(false)
  const [contactVisible, setContactVisible] = useState(false)
  const [contactTopic, setContactTopic] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactSending, setContactSending] = useState(false)
  const CONTACT_TOPICS = ['Organization setup', 'Member access', 'Study locations', 'Billing or trial', 'Technical support', 'Other']

  const withTimeout = async <T,>(promise: Promise<T>, milliseconds: number, label: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout>
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${milliseconds}ms`)), milliseconds)
    })

    try {
      return await Promise.race([promise, timeoutPromise])
    } finally {
      clearTimeout(timeoutId!)
    }
  }

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

  const handleProfilePicturePress = async () => {
    try {
      console.log('[ProfilePicture] Starting profile picture update')
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      console.log('[ProfilePicture] Photo library permission:', permission.status)
      if (!permission.granted) {
        Alert.alert("Permission Required", "Photo library access is needed to choose a profile picture.")
        return
      }

      console.log('[ProfilePicture] Launching image library')
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      })

      if (result.canceled || !result.assets?.length) {
        console.log('[ProfilePicture] Image selection cancelled')
        return
      }

      const asset = result.assets[0]
      const contentType = asset.mimeType || 'image/jpeg'
      console.log('[ProfilePicture] Selected asset:', {
        uri: asset.uri,
        contentType,
        fileSize: asset.fileSize,
        width: asset.width,
        height: asset.height,
      })
      const longestSide = Math.max(asset.width || 0, asset.height || 0)
      const resizeAction = longestSide > 512
        ? asset.width >= asset.height
          ? { resize: { width: 512 } }
          : { resize: { height: 512 } }
        : { resize: { width: asset.width || 512 } }
      console.log('[ProfilePicture] Compressing avatar before upload')
      const compressedAsset = await withTimeout(
        ImageManipulator.manipulateAsync(
          asset.uri,
          [resizeAction],
          {
            compress: 0.72,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        ),
        15000,
        'Profile picture compression'
      )
      const compressedInfo = await FileSystem.getInfoAsync(compressedAsset.uri)
      const uploadContentType = 'image/jpeg'
      console.log('[ProfilePicture] Compressed asset:', {
        uri: compressedAsset.uri,
        width: compressedAsset.width,
        height: compressedAsset.height,
        originalSize: asset.fileSize,
        compressedSize: compressedInfo.exists ? compressedInfo.size : undefined,
      })
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) throw new Error('No access token found')

      setProfilePictureUploading(true)
      console.log('[ProfilePicture] Requesting presigned upload URL')
      const presignResponse = await withTimeout(
        axios.post(
          `${API_URL}api/profile-picture/`,
          {
            action: 'presign',
            content_type: uploadContentType,
            file_size: compressedInfo.exists ? compressedInfo.size : undefined,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000,
          }
        ),
        15000,
        'Profile picture presign'
      )
      console.log('[ProfilePicture] Presign complete:', {
        objectKey: presignResponse.data.object_key,
        contentType: presignResponse.data.content_type,
        expiresIn: presignResponse.data.expires_in,
      })

      console.log('[ProfilePicture] Uploading file directly to S3')
      const uploadResponse = await withTimeout(
        FileSystem.uploadAsync(presignResponse.data.upload_url, compressedAsset.uri, {
          httpMethod: 'PUT',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
          headers: {
            'Content-Type': presignResponse.data.content_type,
          },
        }),
        30000,
        'Profile picture S3 upload'
      )
      console.log('[ProfilePicture] S3 upload response:', uploadResponse.status)

      if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
        console.log('[ProfilePicture] S3 upload body:', uploadResponse.body)
        throw new Error(`S3 upload failed with status ${uploadResponse.status}`)
      }

      console.log('[ProfilePicture] Completing upload with backend')
      await withTimeout(
        axios.post(
          `${API_URL}api/profile-picture/`,
          {
            action: 'complete',
            object_key: presignResponse.data.object_key,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000,
          }
        ),
        15000,
        'Profile picture complete'
      )

      console.log('[ProfilePicture] Refreshing dashboard after upload')
      await refreshDashboard()
      console.log('[ProfilePicture] Profile picture update complete')
    } catch (error) {
      console.error('Profile picture upload failed:', error)
      Alert.alert("Error", "Unable to update your profile picture. Please try again.")
    } finally {
      setProfilePictureUploading(false)
    }
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

  const handleSendContact = async () => {
    if (!contactTopic) { Alert.alert('Required', 'Please choose a topic.'); return }
    if (contactMessage.trim().length < 12) { Alert.alert('Required', 'Please add more detail to your message.'); return }
    setContactSending(true)
    try {
      await axios.post(`${API_URL}api/contact/`, {
        name: `${data?.first_name ?? ''} ${data?.last_name ?? ''}`.trim() || 'App user',
        email: data?.email ?? '',
        topic: contactTopic,
        message: contactMessage.trim(),
        organization: data?.org?.name ?? '',
      })
      setContactVisible(false)
      setContactTopic('')
      setContactMessage('')
      Alert.alert('Sent', 'Your message has been sent to support@greekgeek.app.')
    } catch {
      Alert.alert('Error', 'Could not send your message. Email support@greekgeek.app directly.')
    } finally {
      setContactSending(false)
    }
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error && !data) {
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
            <View className="items-center">
              <View className="relative mb-3">
                <View className="h-28 w-28 rounded-full bg-gg-surfaceLow border border-gg-outlineVariant items-center justify-center overflow-hidden">
                  {data.profile_picture_url ? (
                    <Image
                      source={{ uri: data.profile_picture_url }}
                      className="h-28 w-28 rounded-full"
                    />
                  ) : (
                    <Ionicons name="person" size={52} color="#006b2c" />
                  )}
                </View>
                {data.live && (
                  <View className="absolute right-2 top-2 bg-gg-error w-4 h-4 rounded-full border-2 border-white" />
                )}
                <TouchableOpacity
                  onPress={handleProfilePicturePress}
                  disabled={profilePictureUploading}
                  className="absolute -right-2 bottom-1 h-10 w-10 rounded-full bg-gg-primary border-2 border-white items-center justify-center shadow-sm"
                  accessibilityLabel="Change profile picture"
                >
                  {profilePictureUploading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="camera" size={18} color="white" />
                  )}
                </TouchableOpacity>
              </View>
              <Text className="font-psemibold text-gg-text text-2xl text-center">
                {data.first_name} {data.last_name}
              </Text>
              <Text className="font-pregular text-gg-muted mt-1 text-center">
                {data.email}
              </Text>
              {data.is_staff && (
                <View className="bg-gg-surfaceLow border border-gg-outlineVariant rounded-full px-3 py-1 mt-3">
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
              onPress={() => setContactVisible(true)}
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
          <View className="flex-1 justify-end">
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

        <Modal
          visible={contactVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setContactVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 justify-end"
          >
            <View className="bg-gg-surface p-5 rounded-t-2xl">
              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-xl font-psemibold text-gg-text">Contact support</Text>
                <TouchableOpacity
                  onPress={() => setContactVisible(false)}
                  className="h-9 w-9 rounded-full bg-gg-surfaceContainer items-center justify-center"
                >
                  <Ionicons name="close" size={20} color="#3e4a3d" />
                </TouchableOpacity>
              </View>

              <Text className="text-gg-muted font-pregular text-xs uppercase tracking-wider mb-2">Topic</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {CONTACT_TOPICS.map(t => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setContactTopic(t)}
                    className={`px-3 py-1.5 rounded-full border ${contactTopic === t ? 'bg-gg-primary border-gg-primary' : 'bg-gg-surface border-gg-outlineVariant'}`}
                  >
                    <Text className={`font-pmedium text-sm ${contactTopic === t ? 'text-white' : 'text-gg-text'}`}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-gg-muted font-pregular text-xs uppercase tracking-wider mb-2">Message</Text>
              <TextInput
                value={contactMessage}
                onChangeText={setContactMessage}
                placeholder="Describe your issue or question…"
                placeholderTextColor="#6e7b6c"
                multiline
                numberOfLines={4}
                className="border border-gg-outlineVariant rounded-xl bg-gg-bg p-3 font-pregular text-gg-text mb-5"
                style={{ minHeight: 100, textAlignVertical: 'top' }}
              />

              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => setContactVisible(false)}
                  className="flex-1 py-4 rounded-lg bg-gg-surfaceContainer mr-2 items-center"
                >
                  <Text className="text-gg-muted font-psemibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSendContact}
                  disabled={contactSending}
                  className={`flex-1 py-4 rounded-lg bg-gg-primary ml-2 items-center ${contactSending ? 'opacity-60' : ''}`}
                >
                  <Text className="text-white font-psemibold">{contactSending ? 'Sending…' : 'Send'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Profile
