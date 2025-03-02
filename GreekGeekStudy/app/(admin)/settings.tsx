import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Switch } from 'react-native'
import React, { useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'

const AdminSettings = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState
  
  // Settings state
  const [settings, setSettings] = useState({
    // Verification settings
    requireLocationVerification: true,
    allowManualEntry: false,
    requirePhotos: false,
    photoFrequency: 60, // minutes
    
    // Notification settings
    sendReminderEmails: true,
    reminderFrequency: 'daily', // 'daily', 'weekly', 'never'
    sendProgressReports: true,
    progressReportFrequency: 'weekly', // 'daily', 'weekly', 'monthly', 'never'
    
    // Security settings
    requirePasswordReset: 90, // days
    sessionTimeout: 30, // minutes
    allowMultipleDevices: true,
    
    // Advanced settings
    debugMode: false,
    maintenanceMode: false,
  })

  const handleSaveSettings = () => {
    // This would normally call an API to update the settings
    Alert.alert(
      "Success",
      "Settings have been saved.",
      [{ text: "OK" }]
    )
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
          onPress: () => {
            setSettings({
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
            })
            
            Alert.alert("Success", "Settings have been reset to defaults.")
          }
        }
      ]
    )
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

  // Check if user is admin
  if (!data.is_staff) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-4">
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text className="text-xl font-psemibold text-center mt-4 mb-2">Access Denied</Text>
        <Text className="text-gray-600 text-center">You don't have permission to access this page.</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 p-4">
        {/* Study Verification Settings */}
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Text className="text-xl font-psemibold mb-4">Study Verification</Text>
          
          <View className="mb-4 flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-psemibold">Location Verification</Text>
              <Text className="text-gray-600 text-sm">Require GPS location to verify study sessions</Text>
            </View>
            <Switch
              value={settings.requireLocationVerification}
              onValueChange={(value) => setSettings({...settings, requireLocationVerification: value})}
              trackColor={{ false: "#767577", true: "#16A34A" }}
              thumbColor="#f4f3f4"
            />
          </View>
          
          <View className="mb-4 flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-psemibold">Allow Manual Entry</Text>
              <Text className="text-gray-600 text-sm">Allow users to manually log study hours</Text>
            </View>
            <Switch
              value={settings.allowManualEntry}
              onValueChange={(value) => setSettings({...settings, allowManualEntry: value})}
              trackColor={{ false: "#767577", true: "#16A34A" }}
              thumbColor="#f4f3f4"
            />
          </View>
          
          <View className="mb-4 flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-psemibold">Require Photos</Text>
              <Text className="text-gray-600 text-sm">Require periodic photos during study sessions</Text>
            </View>
            <Switch
              value={settings.requirePhotos}
              onValueChange={(value) => setSettings({...settings, requirePhotos: value})}
              trackColor={{ false: "#767577", true: "#16A34A" }}
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
                  className="border border-gray-300 rounded-lg p-2 w-20 mr-2"
                  keyboardType="numeric"
                />
                <Text className="text-gray-600">minutes</Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Notification Settings */}
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Text className="text-xl font-psemibold mb-4">Notifications</Text>
          
          <View className="mb-4 flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-psemibold">Send Reminder Emails</Text>
              <Text className="text-gray-600 text-sm">Send emails to remind users to study</Text>
            </View>
            <Switch
              value={settings.sendReminderEmails}
              onValueChange={(value) => setSettings({...settings, sendReminderEmails: value})}
              trackColor={{ false: "#767577", true: "#16A34A" }}
              thumbColor="#f4f3f4"
            />
          </View>
          
          {settings.sendReminderEmails && (
            <View className="mb-4">
              <Text className="font-psemibold mb-1">Reminder Frequency</Text>
              <View className="flex-row mt-1">
                <TouchableOpacity 
                  onPress={() => setSettings({...settings, reminderFrequency: 'daily'})}
                  className={`px-4 py-2 rounded-lg mr-2 ${settings.reminderFrequency === 'daily' ? 'bg-green-600' : 'bg-gray-200'}`}
                >
                  <Text className={settings.reminderFrequency === 'daily' ? 'text-white' : 'text-gray-700'}>Daily</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setSettings({...settings, reminderFrequency: 'weekly'})}
                  className={`px-4 py-2 rounded-lg mr-2 ${settings.reminderFrequency === 'weekly' ? 'bg-green-600' : 'bg-gray-200'}`}
                >
                  <Text className={settings.reminderFrequency === 'weekly' ? 'text-white' : 'text-gray-700'}>Weekly</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setSettings({...settings, reminderFrequency: 'never'})}
                  className={`px-4 py-2 rounded-lg ${settings.reminderFrequency === 'never' ? 'bg-green-600' : 'bg-gray-200'}`}
                >
                  <Text className={settings.reminderFrequency === 'never' ? 'text-white' : 'text-gray-700'}>Never</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          <View className="mb-4 flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-psemibold">Send Progress Reports</Text>
              <Text className="text-gray-600 text-sm">Send emails with study progress reports</Text>
            </View>
            <Switch
              value={settings.sendProgressReports}
              onValueChange={(value) => setSettings({...settings, sendProgressReports: value})}
              trackColor={{ false: "#767577", true: "#16A34A" }}
              thumbColor="#f4f3f4"
            />
          </View>
          
          {settings.sendProgressReports && (
            <View className="mb-4">
              <Text className="font-psemibold mb-1">Progress Report Frequency</Text>
              <View className="flex-row flex-wrap mt-1">
                <TouchableOpacity 
                  onPress={() => setSettings({...settings, progressReportFrequency: 'daily'})}
                  className={`px-4 py-2 rounded-lg mr-2 mb-2 ${settings.progressReportFrequency === 'daily' ? 'bg-green-600' : 'bg-gray-200'}`}
                >
                  <Text className={settings.progressReportFrequency === 'daily' ? 'text-white' : 'text-gray-700'}>Daily</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setSettings({...settings, progressReportFrequency: 'weekly'})}
                  className={`px-4 py-2 rounded-lg mr-2 mb-2 ${settings.progressReportFrequency === 'weekly' ? 'bg-green-600' : 'bg-gray-200'}`}
                >
                  <Text className={settings.progressReportFrequency === 'weekly' ? 'text-white' : 'text-gray-700'}>Weekly</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setSettings({...settings, progressReportFrequency: 'monthly'})}
                  className={`px-4 py-2 rounded-lg mr-2 mb-2 ${settings.progressReportFrequency === 'monthly' ? 'bg-green-600' : 'bg-gray-200'}`}
                >
                  <Text className={settings.progressReportFrequency === 'monthly' ? 'text-white' : 'text-gray-700'}>Monthly</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setSettings({...settings, progressReportFrequency: 'never'})}
                  className={`px-4 py-2 rounded-lg mb-2 ${settings.progressReportFrequency === 'never' ? 'bg-green-600' : 'bg-gray-200'}`}
                >
                  <Text className={settings.progressReportFrequency === 'never' ? 'text-white' : 'text-gray-700'}>Never</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        
        {/* Security Settings */}
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Text className="text-xl font-psemibold mb-4">Security</Text>
          
          <View className="mb-4">
            <Text className="font-psemibold mb-1">Password Reset Period (days)</Text>
            <View className="flex-row items-center">
              <TextInput
                value={settings.requirePasswordReset.toString()}
                onChangeText={(text) => {
                  const days = parseInt(text) || 90
                  setSettings({...settings, requirePasswordReset: days})
                }}
                className="border border-gray-300 rounded-lg p-2 w-20 mr-2"
                keyboardType="numeric"
              />
              <Text className="text-gray-600">days (0 = never)</Text>
            </View>
            <Text className="text-gray-500 text-sm mt-1">
              Require users to reset their password after this many days
            </Text>
          </View>
          
          <View className="mb-4">
            <Text className="font-psemibold mb-1">Session Timeout (minutes)</Text>
            <View className="flex-row items-center">
              <TextInput
                value={settings.sessionTimeout.toString()}
                onChangeText={(text) => {
                  const minutes = parseInt(text) || 30
                  setSettings({...settings, sessionTimeout: minutes})
                }}
                className="border border-gray-300 rounded-lg p-2 w-20 mr-2"
                keyboardType="numeric"
              />
              <Text className="text-gray-600">minutes</Text>
            </View>
            <Text className="text-gray-500 text-sm mt-1">
              Automatically log out inactive users after this many minutes
            </Text>
          </View>
          
          <View className="mb-4 flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-psemibold">Allow Multiple Devices</Text>
              <Text className="text-gray-600 text-sm">Allow users to be logged in on multiple devices</Text>
            </View>
            <Switch
              value={settings.allowMultipleDevices}
              onValueChange={(value) => setSettings({...settings, allowMultipleDevices: value})}
              trackColor={{ false: "#767577", true: "#16A34A" }}
              thumbColor="#f4f3f4"
            />
          </View>
        </View>
        
        {/* Advanced Settings */}
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Text className="text-xl font-psemibold mb-4">Advanced</Text>
          
          <View className="mb-4 flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-psemibold">Debug Mode</Text>
              <Text className="text-gray-600 text-sm">Enable detailed logging for troubleshooting</Text>
            </View>
            <Switch
              value={settings.debugMode}
              onValueChange={(value) => setSettings({...settings, debugMode: value})}
              trackColor={{ false: "#767577", true: "#16A34A" }}
              thumbColor="#f4f3f4"
            />
          </View>
          
          <View className="mb-4 flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-psemibold">Maintenance Mode</Text>
              <Text className="text-gray-600 text-sm">Temporarily disable the app for maintenance</Text>
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
              trackColor={{ false: "#767577", true: "#16A34A" }}
              thumbColor="#f4f3f4"
            />
          </View>
        </View>
        
        {/* Action Buttons */}
        <View className="flex-row justify-between mb-4">
          <TouchableOpacity 
            onPress={handleResetSettings}
            className="bg-red-500 p-3 rounded-lg flex-1 mr-2 items-center"
          >
            <Text className="text-white font-psemibold">Reset to Defaults</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleSaveSettings}
            className="bg-green-600 p-3 rounded-lg flex-1 ml-2 items-center"
          >
            <Text className="text-white font-psemibold">Save Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default AdminSettings 