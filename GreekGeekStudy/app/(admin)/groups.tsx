import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, FlatList } from 'react-native'
import React, { useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'

// Mock data for groups
const MOCK_GROUPS = [
  { id: 1, name: 'Freshmen', memberCount: 12 },
  { id: 2, name: 'Sophomores', memberCount: 8 },
  { id: 3, name: 'Juniors', memberCount: 15 },
  { id: 4, name: 'Seniors', memberCount: 10 },
]

// Mock data for users
const MOCK_USERS = [
  { id: 1, name: 'John Doe', email: 'john@example.com', group: 'Freshmen' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', group: 'Sophomores' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', group: 'Juniors' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', group: 'Seniors' },
  { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', group: null },
  { id: 6, name: 'Diana Miller', email: 'diana@example.com', group: null },
]

const GroupsManagement = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState
  
  const [groups, setGroups] = useState(MOCK_GROUPS)
  const [users, setUsers] = useState(MOCK_USERS)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null)
  const [showAddGroup, setShowAddGroup] = useState(false)

  const handleAddGroup = () => {
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name')
      return
    }

    const newGroup = {
      id: groups.length + 1,
      name: newGroupName.trim(),
      memberCount: 0
    }

    setGroups([...groups, newGroup])
    setNewGroupName('')
    setShowAddGroup(false)
  }

  const handleDeleteGroup = (groupId: number) => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? Users in this group will be unassigned.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setGroups(groups.filter(group => group.id !== groupId))
            setUsers(users.map(user => 
              user.group === groups.find(g => g.id === groupId)?.name 
                ? {...user, group: null} 
                : user
            ))
            setSelectedGroup(null)
          }
        }
      ]
    )
  }

  const handleAssignRandomly = () => {
    if (groups.length === 0) {
      Alert.alert('Error', 'Please create at least one group first')
      return
    }

    const updatedUsers = [...users]
    updatedUsers.forEach(user => {
      const randomGroup = groups[Math.floor(Math.random() * groups.length)]
      user.group = randomGroup.name
    })

    setUsers(updatedUsers)
    updateGroupCounts(updatedUsers)
    
    Alert.alert('Success', 'Users have been randomly assigned to groups')
  }

  const updateGroupCounts = (updatedUsers = users) => {
    const updatedGroups = [...groups]
    updatedGroups.forEach(group => {
      group.memberCount = updatedUsers.filter(user => user.group === group.name).length
    })
    setGroups(updatedGroups)
  }

  const handleAssignUserToGroup = (userId: number, groupName: string | null) => {
    const updatedUsers = users.map(user => 
      user.id === userId ? {...user, group: groupName} : user
    )
    setUsers(updatedUsers)
    updateGroupCounts(updatedUsers)
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
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-psemibold">Groups</Text>
            <TouchableOpacity 
              onPress={() => setShowAddGroup(!showAddGroup)}
              className="bg-green-100 p-2 rounded-full"
            >
              <Ionicons name={showAddGroup ? "close" : "add"} size={20} color="#16A34A" />
            </TouchableOpacity>
          </View>

          {showAddGroup && (
            <View className="mb-4 flex-row">
              <TextInput
                value={newGroupName}
                onChangeText={setNewGroupName}
                className="border border-gray-300 rounded-lg p-2 flex-1 mr-2"
                placeholder="Enter group name"
              />
              <TouchableOpacity 
                onPress={handleAddGroup}
                className="bg-green-600 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-psemibold">Add</Text>
              </TouchableOpacity>
            </View>
          )}

          {groups.length === 0 ? (
            <Text className="text-gray-500 italic text-center py-4">No groups created yet</Text>
          ) : (
            groups.map(group => (
              <TouchableOpacity 
                key={group.id}
                className={`p-3 rounded-lg flex-row justify-between items-center mb-2 ${
                  selectedGroup === group.id ? 'bg-green-100' : 'bg-gray-100'
                }`}
                onPress={() => setSelectedGroup(selectedGroup === group.id ? null : group.id)}
              >
                <View>
                  <Text className="font-psemibold">{group.name}</Text>
                  <Text className="text-gray-600 text-sm">{group.memberCount} members</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => handleDeleteGroup(group.id)}
                  className="bg-red-100 p-2 rounded-full"
                >
                  <Ionicons name="trash" size={16} color="#EF4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity 
            onPress={handleAssignRandomly}
            className="bg-blue-500 p-3 rounded-lg flex-row items-center justify-center mt-4"
          >
            <Ionicons name="shuffle" size={20} color="white" />
            <Text className="text-white font-psemibold ml-2">Assign Users Randomly</Text>
          </TouchableOpacity>
        </View>

        {selectedGroup !== null && (
          <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <Text className="text-xl font-psemibold mb-4">
              {groups.find(g => g.id === selectedGroup)?.name} Members
            </Text>
            
            {users.filter(user => user.group === groups.find(g => g.id === selectedGroup)?.name).length === 0 ? (
              <Text className="text-gray-500 italic text-center py-4">No members in this group</Text>
            ) : (
              users
                .filter(user => user.group === groups.find(g => g.id === selectedGroup)?.name)
                .map(user => (
                  <View 
                    key={user.id}
                    className="p-3 bg-gray-100 rounded-lg flex-row justify-between items-center mb-2"
                  >
                    <View>
                      <Text className="font-psemibold">{user.name}</Text>
                      <Text className="text-gray-600 text-sm">{user.email}</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleAssignUserToGroup(user.id, null)}
                      className="bg-gray-200 p-2 rounded-full"
                    >
                      <Ionicons name="close" size={16} color="#4B5563" />
                    </TouchableOpacity>
                  </View>
                ))
            )}
          </View>
        )}

        <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Text className="text-xl font-psemibold mb-4">Unassigned Users</Text>
          
          {users.filter(user => user.group === null).length === 0 ? (
            <Text className="text-gray-500 italic text-center py-4">No unassigned users</Text>
          ) : (
            users
              .filter(user => user.group === null)
              .map(user => (
                <View 
                  key={user.id}
                  className="p-3 bg-gray-100 rounded-lg flex-row justify-between items-center mb-2"
                >
                  <View>
                    <Text className="font-psemibold">{user.name}</Text>
                    <Text className="text-gray-600 text-sm">{user.email}</Text>
                  </View>
                  <View className="flex-row">
                    {groups.map(group => (
                      <TouchableOpacity 
                        key={group.id}
                        onPress={() => handleAssignUserToGroup(user.id, group.name)}
                        className="bg-green-100 p-2 rounded-full ml-1"
                      >
                        <Text className="text-green-600 text-xs">{group.name[0]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default GroupsManagement 