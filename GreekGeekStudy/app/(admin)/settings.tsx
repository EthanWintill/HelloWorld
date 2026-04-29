import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Switch } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import API_URL from '../../constants/api'
import { Card, ScreenHeader } from '../../components/Design'

type AdminSettingsState = {
  requireLocationVerification: boolean
  allowManualEntry: boolean
  requirePhotos: boolean
  photoFrequency: number
  sendReminderEmails: boolean
  reminderFrequency: string
  sendProgressReports: boolean
  progressReportFrequency: string
  requirePasswordReset: number
  sessionTimeout: number
  allowMultipleDevices: boolean
  debugMode: boolean
  maintenanceMode: boolean
}

const defaultSettings: AdminSettingsState = {
  requireLocationVerification: true,
  allowManualEntry: false,
  requirePhotos: false,
  photoFrequency: 60,
  sendReminderEmails: true,
  reminderFrequency: 'daily',
  sendProgressReports: true,
  progressReportFrequency: 'weekly',
  requirePasswordReset: 90,
  sessionTimeout: 30,
  allowMultipleDevices: true,
  debugMode: false,
  maintenanceMode: false,
}

const mapApiToSettings = (apiSettings: any): AdminSettingsState => ({
  requireLocationVerification: apiSettings.require_location_verification,
  allowManualEntry: apiSettings.allow_manual_entry,
  requirePhotos: false,
  photoFrequency: apiSettings.photo_frequency,
  sendReminderEmails: apiSettings.send_reminder_emails,
  reminderFrequency: apiSettings.reminder_frequency,
  sendProgressReports: apiSettings.send_progress_reports,
  progressReportFrequency: apiSettings.progress_report_frequency,
  requirePasswordReset: apiSettings.require_password_reset_days,
  sessionTimeout: apiSettings.session_timeout_minutes,
  allowMultipleDevices: apiSettings.allow_multiple_devices,
  debugMode: apiSettings.debug_mode,
  maintenanceMode: apiSettings.maintenance_mode,
})

const mapSettingsToApi = (settings: AdminSettingsState) => ({
  require_location_verification: settings.requireLocationVerification,
  allow_manual_entry: settings.allowManualEntry,
  require_photos: false,
  maintenance_mode: settings.maintenanceMode,
})

const AdminSettings = () => {
  const { dashboardState, handleUnauthorized } = useDashboard()
  const { isLoading, error, data } = dashboardState
  const [settings, setSettings] = useState<AdminSettingsState>(defaultSettings)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true)
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) throw new Error('No access token found')

      const response = await axios.get(`${API_URL}api/org-settings/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSettings(mapApiToSettings(response.data))
    } catch (error: any) {
      console.error('Error loading settings:', error)
      if (error.response?.status === 401) {
        await handleUnauthorized()
      } else {
        Alert.alert("Error", "Failed to load settings. Defaults are shown until this is fixed.")
      }
    } finally {
      setSettingsLoading(false)
    }
  }

  useEffect(() => {
    if (!isLoading && data?.is_staff) {
      fetchSettings()
    } else if (!isLoading) {
      setSettingsLoading(false)
    }
  }, [isLoading, data?.is_staff])

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true)
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) throw new Error('No access token found')

      const response = await axios.put(
        `${API_URL}api/org-settings/`,
        mapSettingsToApi(settings),
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSettings(mapApiToSettings(response.data))
      Alert.alert("Success", "Settings have been saved.", [{ text: "OK" }])
    } catch (error: any) {
      console.error('Error saving settings:', error)
      if (error.response?.status === 401) {
        await handleUnauthorized()
      } else {
        Alert.alert("Error", error.response?.data?.detail || "Failed to save settings. Please try again.")
      }
    } finally {
      setSavingSettings(false)
    }
  }

  const handleResetSettings = () => {
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to reset all settings to default values?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          style: "destructive",
          onPress: async () => {
            try {
              setSavingSettings(true)
              const token = await AsyncStorage.getItem('accessToken')
              if (!token) throw new Error('No access token found')

              const response = await axios.delete(`${API_URL}api/org-settings/`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              setSettings(mapApiToSettings(response.data))
              Alert.alert("Success", "Settings have been reset to defaults.")
            } catch (error: any) {
              console.error('Error resetting settings:', error)
              if (error.response?.status === 401) {
                await handleUnauthorized()
              } else {
                Alert.alert("Error", "Failed to reset settings. Please try again.")
              }
            } finally {
              setSavingSettings(false)
            }
          }
        }
      ]
    )
  }

  if (isLoading || settingsLoading) {
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
        <Text className="text-gg-muted text-center">You don't have permission to access this page.</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gg-bg">
      <ScreenHeader
        title="Admin Settings"
        subtitle="Verification, notifications, and operational controls"
      />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <Card className="mb-4">
          <Text className="text-lg font-psemibold mb-4 text-gg-text">Study Verification</Text>
          
          <View className="mb-4 flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-psemibold">Location Verification</Text>
              <Text className="text-gg-muted text-sm">Require GPS location to verify study sessions</Text>
            </View>
            <Switch
              value={settings.requireLocationVerification}
              onValueChange={(value) => setSettings({...settings, requireLocationVerification: value})}
              trackColor={{ false: "#767577", true: "#006b2c" }}
              thumbColor="#f4f3f4"
            />
          </View>
          
          <View className="mb-4 flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-psemibold">Allow Manual Entry</Text>
              <Text className="text-gg-muted text-sm">Allow users to manually log study hours</Text>
            </View>
            <Switch
              value={settings.allowManualEntry}
              onValueChange={(value) => setSettings({...settings, allowManualEntry: value})}
              trackColor={{ false: "#767577", true: "#006b2c" }}
              thumbColor="#f4f3f4"
            />
          </View>
          
          <View className="mb-4 flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-psemibold">Require Photos</Text>
              <Text className="text-gg-muted text-sm">Photo verification is not available yet</Text>
            </View>
            <Switch
              value={false}
              onValueChange={() => Alert.alert("Coming Soon", "Photo verification is intentionally deferred for now.")}
              trackColor={{ false: "#767577", true: "#006b2c" }}
              thumbColor="#f4f3f4"
            />
          </View>
          
          {settings.requirePhotos && (
            <View className="mb-4">
              <Text className="font-psemibold mb-1">Photo Frequency (minutes)</Text>
              <View className="flex-row items-center">
                <TextInput
                  value={settings.photoFrequency.toString()}
                  onChangeText={(text) => {
                    const frequency = parseInt(text) || 60
                    setSettings({...settings, photoFrequency: frequency})
                  }}
                  className="border border-gg-outline rounded-lg p-2 w-20 mr-2"
                  keyboardType="numeric"
                />
                <Text className="text-gg-muted">minutes</Text>
              </View>
            </View>
          )}
        </Card>
        
        <Card className="mb-4">
          <Text className="text-lg font-psemibold mb-4 text-gg-text">Planned Notifications</Text>
          
          <View className="mb-4 flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-psemibold text-gg-muted">Reminder Emails</Text>
              <Text className="text-gg-muted text-sm">Not active yet. Reminder scheduling is not enabled.</Text>
            </View>
            <Switch
              value={false}
              disabled={true}
              trackColor={{ false: "#767577", true: "#006b2c" }}
              thumbColor="#f4f3f4"
            />
          </View>
          
          <View className="mb-4 flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-psemibold text-gg-muted">Progress Report Emails</Text>
              <Text className="text-gg-muted text-sm">Not active yet. Report generation is manual from Reports.</Text>
            </View>
            <Switch
              value={false}
              disabled={true}
              trackColor={{ false: "#767577", true: "#006b2c" }}
              thumbColor="#f4f3f4"
            />
          </View>
        </Card>
        
        <Card className="mb-4">
          <Text className="text-lg font-psemibold mb-4 text-gg-text">Planned Security Controls</Text>
          
          <View className="mb-4">
            <Text className="font-psemibold mb-1 text-gg-muted">Password Reset Period</Text>
            <View className="flex-row items-center">
              <TextInput
                value={settings.requirePasswordReset.toString()}
                editable={false}
                className="border border-gg-outlineVariant bg-gg-surfaceContainer rounded-lg p-2 w-20 mr-2 text-gg-muted"
                keyboardType="numeric"
              />
              <Text className="text-gg-muted">not active yet</Text>
            </View>
            <Text className="text-gg-muted text-sm mt-1">
              Password age enforcement needs an auth policy pass before launch.
            </Text>
          </View>
          
          <View className="mb-4">
            <Text className="font-psemibold mb-1 text-gg-muted">Session Timeout</Text>
            <View className="flex-row items-center">
              <TextInput
                value={settings.sessionTimeout.toString()}
                editable={false}
                className="border border-gg-outlineVariant bg-gg-surfaceContainer rounded-lg p-2 w-20 mr-2 text-gg-muted"
                keyboardType="numeric"
              />
              <Text className="text-gg-muted">not active yet</Text>
            </View>
            <Text className="text-gg-muted text-sm mt-1">
              Current JWT tokens do not support server-side inactivity timeout.
            </Text>
          </View>
          
          <View className="mb-4 flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-psemibold text-gg-muted">Allow Multiple Devices</Text>
              <Text className="text-gg-muted text-sm">Not active yet. Device session tracking is not enabled.</Text>
            </View>
            <Switch
              value={false}
              disabled={true}
              trackColor={{ false: "#767577", true: "#006b2c" }}
              thumbColor="#f4f3f4"
            />
          </View>
        </Card>
        
        <Card className="mb-4">
          <Text className="text-lg font-psemibold mb-4 text-gg-text">Advanced</Text>
          
          <View className="mb-4 flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-psemibold text-gg-muted">Debug Mode</Text>
              <Text className="text-gg-muted text-sm">Not active yet. Server logging is configured outside the app.</Text>
            </View>
            <Switch
              value={false}
              disabled={true}
              trackColor={{ false: "#767577", true: "#006b2c" }}
              thumbColor="#f4f3f4"
            />
          </View>
          
          <View className="mb-4 flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-psemibold">Maintenance Mode</Text>
              <Text className="text-gg-muted text-sm">Temporarily disable the app for maintenance</Text>
            </View>
            <Switch
              value={settings.maintenanceMode}
              onValueChange={(value) => {
                if (value) {
                  Alert.alert(
                    "Enable Maintenance Mode",
                    "This will prevent all users from accessing the app. Are you sure?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { 
                        text: "Enable", 
                        onPress: () => setSettings({...settings, maintenanceMode: true})
                      }
                    ]
                  )
                } else {
                  setSettings({...settings, maintenanceMode: false})
                }
              }}
              trackColor={{ false: "#767577", true: "#006b2c" }}
              thumbColor="#f4f3f4"
            />
          </View>
        </Card>
        
        {/* Action Buttons */}
        <View className="flex-row justify-between mb-4">
          <TouchableOpacity 
            onPress={handleResetSettings}
            disabled={savingSettings}
            className={`min-h-[56px] rounded-lg flex-1 mr-2 items-center justify-center ${savingSettings ? 'bg-[#ffb4ab]' : 'bg-gg-error'}`}
          >
            <Text className="text-white font-psemibold">Reset to Defaults</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleSaveSettings}
            disabled={savingSettings}
            className={`min-h-[56px] rounded-lg flex-1 ml-2 items-center justify-center ${savingSettings ? 'bg-gg-surfaceHigh' : 'bg-gg-primary'}`}
          >
            <Text className="text-white font-psemibold">{savingSettings ? 'Saving...' : 'Save Settings'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default AdminSettings
