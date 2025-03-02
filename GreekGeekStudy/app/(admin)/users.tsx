import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, FlatList } from 'react-native'
import React, { useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'


const UsersManagement = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState
  const router = useRouter()
  
  const [users, setUsers] = useState(data.org_users)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterActive, setFilterActive] = useState<boolean | null>(null)

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      searchQuery === '' || 
      user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesActiveFilter = 
      filterActive === null || 
      user.is_active === filterActive
    
    return matchesSearch && matchesActiveFilter
  })

  const handleViewUser = (userId: number) => {
    // In a real app, navigate to user detail page with the user ID
    router.push({
      pathname: "/(admin)/user-detail",
      params: { id: userId }
    } as any)
  }

  const handleToggleUserStatus = (userId: number) => {
    const updatedUsers = users.map(user => 
      user.id === userId ? {...user, is_active: !user.is_active} : user
    )
    setUsers(updatedUsers)
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
      <ScrollView className="flex-1">
        <View className="p-4">
          <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <Text className="text-xl font-psemibold mb-4">Users</Text>
            
            <View className="mb-4">
              <View className="flex-row items-center border border-gray-300 rounded-lg px-3 py-2 mb-3">
                <Ionicons name="search" size={20} color="#9CA3AF" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="flex-1 ml-2"
                  placeholder="Search users..."
                />
                {searchQuery !== '' && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
              
              <View className="flex-row mb-2">
                <TouchableOpacity 
                  onPress={() => setFilterActive(null)}
                  className={`px-4 py-2 rounded-lg mr-2 ${filterActive === null ? 'bg-green-600' : 'bg-gray-200'}`}
                >
                  <Text className={filterActive === null ? 'text-white' : 'text-gray-700'}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setFilterActive(true)}
                  className={`px-4 py-2 rounded-lg mr-2 ${filterActive === true ? 'bg-green-600' : 'bg-gray-200'}`}
                >
                  <Text className={filterActive === true ? 'text-white' : 'text-gray-700'}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setFilterActive(false)}
                  className={`px-4 py-2 rounded-lg ${filterActive === false ? 'bg-green-600' : 'bg-gray-200'}`}
                >
                  <Text className={filterActive === false ? 'text-white' : 'text-gray-700'}>Inactive</Text>
                </TouchableOpacity>
              </View>
            </View>

            {filteredUsers.length === 0 ? (
              <Text className="text-gray-500 italic text-center py-4">No users found</Text>
            ) : (
              <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View className="border-b border-gray-200 py-3">
                    <View className="flex-row justify-between items-center">
                      <View className="flex-1">
                        <Text className="font-psemibold text-lg">
                          {item.first_name} {item.last_name}
                        </Text>
                        <Text className="text-gray-600">{item.email}</Text>
                        <View className="flex-row items-center mt-1">
                          {item.is_staff ? (
                            <Text className="text-blue-500 text-sm ml-2">
                            Admin
                            </Text>
                          ):(
                            <Text className="text-gray-500 text-sm ml-2">
                            User
                            </Text>
                          )}
                          {item.group && (
                            <Text className="text-gray-500 text-sm ml-2">
                             • {item.group}
                            </Text>
                          )}
                          <Text className="text-gray-500 text-sm ml-2">
                            • {item.total_hours.toFixed(2)}h studied
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row">
                        
                        <TouchableOpacity 
                          onPress={() => handleViewUser(item.id)}
                          className="bg-blue-100 p-2 rounded-full"
                        >
                          <Ionicons name="eye" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              />
            )}
          </View>

          <TouchableOpacity 
            className="bg-green-600 p-3 rounded-lg flex-row items-center justify-center"
          >
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-psemibold ml-2">Add New User</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default UsersManagement 