import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, FlatList, Modal } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import API_URL from '../../constants/api'
import { Card, EmptyState, ScreenHeader } from '../../components/Design'

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
    org?: number;
  } | number | null;
}

const GroupsManagement = () => {
  const { dashboardState, refreshDashboard } = useDashboard()
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
      // Refresh both sources so membership labels and unassigned counts stay in sync.
      await fetchGroups()
      await refreshDashboard()
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
      await fetchGroups()
      await refreshDashboard()
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
               await fetchGroups()
               await refreshDashboard()
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

  const getUserAssignedGroup = (user: User) => {
    if (user.group && typeof user.group === 'object') {
      return user.group
    }

    const groupFromMembership = groups.find(group =>
      group.users.some(groupUser => groupUser.id === user.id)
    )

    return groupFromMembership
      ? { id: groupFromMembership.id, name: groupFromMembership.name }
      : null
  }

  const getUnassignedUsers = () => {
    return allUsers.filter(user => !getUserAssignedGroup(user))
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

  // Check if user is admin
  if (!data?.is_staff) {
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
        title="Groups"
        subtitle={`${groups.length} groups • ${getUnassignedUsers().length} unassigned`}
        right={(
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            className="h-10 w-10 rounded-full bg-gg-surfaceLow items-center justify-center"
          >
            <Ionicons name="add" size={22} color="#006b2c" />
          </TouchableOpacity>
        )}
      />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <Card className="mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-psemibold text-gg-text">Groups</Text>
            <TouchableOpacity 
              onPress={() => setShowCreateModal(true)}
              className="bg-gg-primary px-4 py-2 rounded-lg flex-row items-center"
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-psemibold ml-2">New Group</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <Text className="text-gg-muted text-center py-4 font-pregular">Loading...</Text>
          ) : groups.length === 0 ? (
            <EmptyState icon="people-outline" title="No groups yet" message="Create groups to segment leaderboard and reporting." />
          ) : (
            groups.map(group => (
              <View 
                key={group.id}
                className="p-4 bg-gg-bg border border-gg-outlineVariant rounded-lg mb-3"
              >
                <View className="flex-row justify-between items-center mb-2">
                  <View>
                    <Text className="font-psemibold text-gg-text">{group.name}</Text>
                    <Text className="text-gg-muted text-sm font-pregular">{group.users.length} members</Text>
                  </View>
                  <View className="flex-row">
                    <TouchableOpacity 
                      onPress={() => openEditModal(group)}
                      className="bg-[#dbe1ff] h-9 w-9 items-center justify-center rounded-full mr-2"
                    >
                      <Ionicons name="pencil" size={16} color="#0051d5" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDeleteGroup(group)}
                      className="bg-[#ffdad6] h-9 w-9 items-center justify-center rounded-full"
                    >
                      <Ionicons name="trash" size={16} color="#ba1a1a" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Group Members */}
                {group.users.length > 0 && (
                  <View className="mt-2">
                    {group.users.map(user => (
                      <View key={user.id} className="flex-row items-center py-1">
                        <Ionicons name="person" size={14} color="#3e4a3d" />
                        <Text className="text-gg-muted text-sm ml-2">
                          {user.first_name} {user.last_name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </Card>

        <Card>
          <Text className="text-lg font-psemibold mb-4 text-gg-text">Unassigned Users</Text>
          
          {getUnassignedUsers().length === 0 ? (
            <EmptyState icon="checkmark-circle-outline" title="All assigned" message="Every member currently belongs to a group." />
          ) : (
            getUnassignedUsers().map(user => (
              <View 
                key={user.id}
                className="p-3 bg-gg-bg border border-gg-outlineVariant rounded-lg flex-row justify-between items-center mb-2"
              >
                <View>
                  <Text className="font-psemibold text-gg-text">{user.first_name} {user.last_name}</Text>
                  <Text className="text-gg-muted text-sm font-pregular">{user.email}</Text>
                </View>
                <Ionicons name="person-outline" size={20} color="#3e4a3d" />
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      {/* Create Group Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-gg-surface">
          <View className="p-4 border-b border-gg-outlineVariant">
            <View className="flex-row justify-between items-center">
              <Text className="text-xl font-psemibold">Create New Group</Text>
              <TouchableOpacity onPress={resetCreateModal}>
                <Ionicons name="close" size={24} color="#3e4a3d" />
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView className="flex-1 p-4">
            <View className="mb-4">
              <Text className="font-psemibold mb-2">Group Name</Text>
              <TextInput
                value={newGroupName}
                onChangeText={setNewGroupName}
                className="border border-gg-outline rounded-lg p-3"
                placeholder="Enter group name"
              />
            </View>

            <Text className="font-psemibold mb-3">Select Users to Assign</Text>
            {allUsers.map(user => (
              <TouchableOpacity
                key={user.id}
                onPress={() => toggleUserSelection(user.id)}
                className={`p-3 rounded-lg mb-2 flex-row justify-between items-center ${
                  selectedUserIds.includes(user.id) ? 'bg-gg-surfaceLow' : 'bg-gg-bg'
                }`}
              >
                <View>
                  <Text className="font-psemibold">{user.first_name} {user.last_name}</Text>
                  <Text className="text-gg-muted text-sm">{user.email}</Text>
                  {getUserAssignedGroup(user) && (
                    <Text className="text-gg-secondary text-xs">Currently in: {getUserAssignedGroup(user)?.name}</Text>
                  )}
                </View>
                <Ionicons 
                  name={selectedUserIds.includes(user.id) ? "checkmark-circle" : "radio-button-off"} 
                  size={24} 
                  color={selectedUserIds.includes(user.id) ? "#006b2c" : "#3e4a3d"} 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="p-4 border-t border-gg-outlineVariant">
            <TouchableOpacity 
              onPress={handleCreateGroup}
              className="bg-gg-primary p-3 rounded-lg"
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
        <SafeAreaView className="flex-1 bg-gg-surface">
          <View className="p-4 border-b border-gg-outlineVariant">
            <View className="flex-row justify-between items-center">
              <Text className="text-xl font-psemibold">Edit {selectedGroupForEdit?.name}</Text>
              <TouchableOpacity onPress={resetEditModal}>
                <Ionicons name="close" size={24} color="#3e4a3d" />
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView className="flex-1 p-4">
            <View className="mb-4">
              <Text className="font-psemibold mb-2">Group Name</Text>
              <TextInput
                value={editGroupName}
                onChangeText={setEditGroupName}
                className="border border-gg-outline rounded-lg p-3"
                placeholder="Enter group name"
              />
            </View>

            <Text className="font-psemibold mb-3">Manage Group Members</Text>
            {allUsers.map(user => (
              <TouchableOpacity
                key={user.id}
                onPress={() => toggleUserSelection(user.id)}
                className={`p-3 rounded-lg mb-2 flex-row justify-between items-center ${
                  selectedUserIds.includes(user.id) ? 'bg-gg-surfaceLow' : 'bg-gg-bg'
                }`}
              >
                <View>
                  <Text className="font-psemibold">{user.first_name} {user.last_name}</Text>
                  <Text className="text-gg-muted text-sm">{user.email}</Text>
                  {getUserAssignedGroup(user) && getUserAssignedGroup(user)?.id !== selectedGroupForEdit?.id && (
                    <Text className="text-gg-secondary text-xs">Currently in: {getUserAssignedGroup(user)?.name}</Text>
                  )}
                </View>
                <Ionicons 
                  name={selectedUserIds.includes(user.id) ? "checkmark-circle" : "radio-button-off"} 
                  size={24} 
                  color={selectedUserIds.includes(user.id) ? "#006b2c" : "#3e4a3d"} 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="p-4 border-t border-gg-outlineVariant">
            <TouchableOpacity 
              onPress={handleUpdateGroup}
              className="bg-gg-secondary p-3 rounded-lg"
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
