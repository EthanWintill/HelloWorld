import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, FlatList, Modal } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import API_URL from '../../constants/api'

// Define types
interface Group {
  id: number;
  name: string;
  users: User[];
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  group?: {
    id: number;
    name: string;
    org: number;
  };
}

const GroupsManagement = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState
  
  const [groups, setGroups] = useState<Group[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<Group | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [editGroupName, setEditGroupName] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])

  // Load groups and users from the API
  useEffect(() => {
    if (data && data.org_users) {
      setAllUsers(data.org_users)
      fetchGroups()
    }
  }, [data])

  const fetchGroups = async () => {
    try {
      setLoading(true)
      
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) {
        console.error("No access token found in AsyncStorage")
        Alert.alert('Error', 'Authentication required')
        setLoading(false)
        return
      }
      
      const response = await axios.get(`${API_URL}api/groups/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      setGroups(response.data)
    } catch (error) {
      console.error('Error fetching groups:', error)
      if (axios.isAxiosError(error)) {
        console.error('API Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        })
        
        if (error.response?.status === 401) {
          Alert.alert('Error', 'Authentication failed')
        } else {
          Alert.alert('Error', 'Failed to load groups')
        }
      } else {
        Alert.alert('Error', 'Failed to load groups')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name')
      return
    }

    try {
      setLoading(true)
      
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) {
        console.error("No access token found in AsyncStorage")
        Alert.alert('Error', 'Authentication required')
        setLoading(false)
        return
      }
      
      const response = await axios.post(`${API_URL}api/groups/`, {
        name: newGroupName.trim(),
        user_ids: selectedUserIds
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })

      const newGroup = response.data
      setGroups([...groups, newGroup])
      setNewGroupName('')
      setSelectedUserIds([])
      setShowCreateModal(false)
      Alert.alert('Success', 'Group created successfully')
      // Refresh data to update user assignments
      fetchGroups()
    } catch (error) {
      console.error('Error creating group:', error)
      if (axios.isAxiosError(error)) {
        console.error('API Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        })
        
        if (error.response?.status === 401) {
          Alert.alert('Error', 'Authentication failed')
        } else {
          Alert.alert('Error', error.response?.data?.detail || 'Failed to create group')
        }
      } else {
        Alert.alert('Error', 'Failed to create group')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateGroup = async () => {
    if (!selectedGroupForEdit) return
    
    if (!editGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name')
      return
    }

    try {
      setLoading(true)
      
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) {
        console.error("No access token found in AsyncStorage")
        Alert.alert('Error', 'Authentication required')
        setLoading(false)
        return
      }
      
      const response = await axios.put(`${API_URL}api/groups/${selectedGroupForEdit.id}/`, {
        name: editGroupName.trim(),
        user_ids: selectedUserIds
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })

      const updatedGroup = response.data
      setGroups(groups.map(g => g.id === updatedGroup.id ? updatedGroup : g))
      setShowEditModal(false)
      setSelectedGroupForEdit(null)
      setSelectedUserIds([])
      Alert.alert('Success', 'Group updated successfully')
      // Refresh data to update user assignments
      fetchGroups()
    } catch (error) {
      console.error('Error updating group:', error)
      if (axios.isAxiosError(error)) {
        console.error('API Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        })
        
        if (error.response?.status === 401) {
          Alert.alert('Error', 'Authentication failed')
        } else {
          Alert.alert('Error', error.response?.data?.detail || 'Failed to update group')
        }
      } else {
        Alert.alert('Error', 'Failed to update group')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = (group: Group) => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${group.name}"? Users in this group will be unassigned.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
                     onPress: async () => {
             try {
               setLoading(true)
               
               // Get token from AsyncStorage
               const token = await AsyncStorage.getItem('accessToken')
               if (!token) {
                 console.error("No access token found in AsyncStorage")
                 Alert.alert('Error', 'Authentication required')
                 setLoading(false)
                 return
               }
               
               const response = await axios.delete(`${API_URL}api/groups/${group.id}/`, {
                 headers: {
                   'Authorization': `Bearer ${token}`,
                   'Content-Type': 'application/json',
                 },
               })

               setGroups(groups.filter(g => g.id !== group.id))
               Alert.alert('Success', 'Group deleted successfully')
               fetchGroups()
             } catch (error) {
               console.error('Error deleting group:', error)
               if (axios.isAxiosError(error)) {
                 console.error('API Error details:', {
                   status: error.response?.status,
                   statusText: error.response?.statusText,
                   data: error.response?.data
                 })
                 
                 if (error.response?.status === 401) {
                   Alert.alert('Error', 'Authentication failed')
                 } else {
                   Alert.alert('Error', error.response?.data?.detail || 'Failed to delete group')
                 }
               } else {
                 Alert.alert('Error', 'Failed to delete group')
               }
             } finally {
               setLoading(false)
             }
           }
        }
      ]
    )
  }

  const openEditModal = (group: Group) => {
    setSelectedGroupForEdit(group)
    setEditGroupName(group.name)
    setSelectedUserIds(group.users.map(user => user.id))
    setShowEditModal(true)
  }

  const resetCreateModal = () => {
    setNewGroupName('')
    setSelectedUserIds([])
    setShowCreateModal(false)
  }

  const resetEditModal = () => {
    setSelectedGroupForEdit(null)
    setEditGroupName('')
    setSelectedUserIds([])
    setShowEditModal(false)
  }

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const getUnassignedUsers = () => {
    return allUsers.filter(user => !user.group)
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
  if (!data?.is_staff) {
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
        {/* Groups Section */}
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-psemibold">Groups</Text>
            <TouchableOpacity 
              onPress={() => setShowCreateModal(true)}
              className="bg-green-600 px-4 py-2 rounded-lg flex-row items-center"
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-psemibold ml-2">New Group</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <Text className="text-gray-500 text-center py-4">Loading...</Text>
          ) : groups.length === 0 ? (
            <Text className="text-gray-500 italic text-center py-4">No groups created yet</Text>
          ) : (
            groups.map(group => (
              <View 
                key={group.id}
                className="p-4 bg-gray-50 rounded-lg mb-3"
              >
                <View className="flex-row justify-between items-center mb-2">
                  <View>
                    <Text className="font-psemibold text-lg">{group.name}</Text>
                    <Text className="text-gray-600 text-sm">{group.users.length} members</Text>
                  </View>
                  <View className="flex-row">
                    <TouchableOpacity 
                      onPress={() => openEditModal(group)}
                      className="bg-blue-100 p-2 rounded-full mr-2"
                    >
                      <Ionicons name="pencil" size={16} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDeleteGroup(group)}
                      className="bg-red-100 p-2 rounded-full"
                    >
                      <Ionicons name="trash" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Group Members */}
                {group.users.length > 0 && (
                  <View className="mt-2">
                    {group.users.map(user => (
                      <View key={user.id} className="flex-row items-center py-1">
                        <Ionicons name="person" size={14} color="#6B7280" />
                        <Text className="text-gray-700 text-sm ml-2">
                          {user.first_name} {user.last_name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Unassigned Users Section */}
        <View className="bg-white rounded-lg shadow-sm p-4">
          <Text className="text-xl font-psemibold mb-4">Unassigned Users</Text>
          
          {getUnassignedUsers().length === 0 ? (
            <Text className="text-gray-500 italic text-center py-4">All users are assigned to groups</Text>
          ) : (
            getUnassignedUsers().map(user => (
              <View 
                key={user.id}
                className="p-3 bg-gray-50 rounded-lg flex-row justify-between items-center mb-2"
              >
                <View>
                  <Text className="font-psemibold">{user.first_name} {user.last_name}</Text>
                  <Text className="text-gray-600 text-sm">{user.email}</Text>
                </View>
                <Ionicons name="person-outline" size={20} color="#6B7280" />
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Create Group Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="p-4 border-b border-gray-200">
            <View className="flex-row justify-between items-center">
              <Text className="text-xl font-psemibold">Create New Group</Text>
              <TouchableOpacity onPress={resetCreateModal}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView className="flex-1 p-4">
            <View className="mb-4">
              <Text className="font-psemibold mb-2">Group Name</Text>
              <TextInput
                value={newGroupName}
                onChangeText={setNewGroupName}
                className="border border-gray-300 rounded-lg p-3"
                placeholder="Enter group name"
              />
            </View>

            <Text className="font-psemibold mb-3">Select Users to Assign</Text>
            {allUsers.map(user => (
              <TouchableOpacity
                key={user.id}
                onPress={() => toggleUserSelection(user.id)}
                className={`p-3 rounded-lg mb-2 flex-row justify-between items-center ${
                  selectedUserIds.includes(user.id) ? 'bg-green-100' : 'bg-gray-50'
                }`}
              >
                <View>
                  <Text className="font-psemibold">{user.first_name} {user.last_name}</Text>
                  <Text className="text-gray-600 text-sm">{user.email}</Text>
                  {user.group && (
                    <Text className="text-blue-600 text-xs">Currently in: {user.group.name}</Text>
                  )}
                </View>
                <Ionicons 
                  name={selectedUserIds.includes(user.id) ? "checkmark-circle" : "radio-button-off"} 
                  size={24} 
                  color={selectedUserIds.includes(user.id) ? "#16A34A" : "#6B7280"} 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="p-4 border-t border-gray-200">
            <TouchableOpacity 
              onPress={handleCreateGroup}
              className="bg-green-600 p-3 rounded-lg"
              disabled={loading}
            >
              <Text className="text-white font-psemibold text-center">
                {loading ? 'Creating...' : 'Create Group'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="p-4 border-b border-gray-200">
            <View className="flex-row justify-between items-center">
              <Text className="text-xl font-psemibold">Edit {selectedGroupForEdit?.name}</Text>
              <TouchableOpacity onPress={resetEditModal}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView className="flex-1 p-4">
            <View className="mb-4">
              <Text className="font-psemibold mb-2">Group Name</Text>
              <TextInput
                value={editGroupName}
                onChangeText={setEditGroupName}
                className="border border-gray-300 rounded-lg p-3"
                placeholder="Enter group name"
              />
            </View>

            <Text className="font-psemibold mb-3">Manage Group Members</Text>
            {allUsers.map(user => (
              <TouchableOpacity
                key={user.id}
                onPress={() => toggleUserSelection(user.id)}
                className={`p-3 rounded-lg mb-2 flex-row justify-between items-center ${
                  selectedUserIds.includes(user.id) ? 'bg-green-100' : 'bg-gray-50'
                }`}
              >
                <View>
                  <Text className="font-psemibold">{user.first_name} {user.last_name}</Text>
                  <Text className="text-gray-600 text-sm">{user.email}</Text>
                  {user.group && user.group.id !== selectedGroupForEdit?.id && (
                    <Text className="text-blue-600 text-xs">Currently in: {user.group.name}</Text>
                  )}
                </View>
                <Ionicons 
                  name={selectedUserIds.includes(user.id) ? "checkmark-circle" : "radio-button-off"} 
                  size={24} 
                  color={selectedUserIds.includes(user.id) ? "#16A34A" : "#6B7280"} 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="p-4 border-t border-gray-200">
            <TouchableOpacity 
              onPress={handleUpdateGroup}
              className="bg-blue-600 p-3 rounded-lg"
              disabled={loading}
            >
              <Text className="text-white font-psemibold text-center">
                {loading ? 'Updating...' : 'Update Group'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

export default GroupsManagement 