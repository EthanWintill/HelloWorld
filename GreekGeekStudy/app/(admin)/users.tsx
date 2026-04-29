import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, FlatList } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Card, EmptyState, ScreenHeader } from '../../components/Design'

// Define user type
interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  is_staff?: boolean;
  group?: {
    id: number;
    name: string;
    org: number;
  };
  total_hours: number;
}

const UsersManagement = () => {
  const { dashboardState } = useDashboard()
  const { isLoading, error, data } = dashboardState
  const router = useRouter()
  
  const [users, setUsers] = useState<User[]>(data?.org_users || [])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGroup, setFilterGroup] = useState<string | null>(null)

  // Update users when dashboard data changes
  useEffect(() => {
    if (data && data.org_users) {
      setUsers(data.org_users)
    }
  }, [data])

  // Get unique groups for filter buttons
  const uniqueGroups = Array.from(new Set(users.filter(user => user.group).map(user => user.group!.name)))
  
  const filteredUsers = users.filter((user: User) => {
    const matchesSearch = 
      searchQuery === '' || 
      user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesGroupFilter = 
      filterGroup === null || 
      (user.group && user.group.name === filterGroup)
    
    return matchesSearch && matchesGroupFilter
  })

  const handleViewUser = (userId: number) => {
    // In a real app, navigate to user detail page with the user ID
    router.push({
      pathname: "/(admin)/user-detail",
      params: { id: userId }
    } as any)
  }

  const handleToggleUserStatus = (userId: number) => {
    const updatedUsers = users.map((user: User) => 
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
        title="Manage Users"
        subtitle={`${filteredUsers.length} of ${users.length} members shown`}
        right={(
          <TouchableOpacity
            className="h-10 w-10 rounded-full bg-gg-surfaceLow items-center justify-center"
            onPress={() => router.push('/(admin)/add-user')}
          >
            <Ionicons name="add" size={22} color="#006b2c" />
          </TouchableOpacity>
        )}
      />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          <Card className="mb-4">
            
            <View className="mb-4">
              <View className="flex-row items-center border border-gg-outline rounded-lg px-3 h-14 mb-3 bg-gg-surface">
                <Ionicons name="search" size={20} color="#6e7b6c" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="flex-1 ml-2 font-pregular text-gg-text"
                  placeholder="Search users..."
                  placeholderTextColor="#6e7b6c"
                />
                {searchQuery !== '' && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#6e7b6c" />
                  </TouchableOpacity>
                )}
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                className="mb-2"
                contentContainerStyle={{ paddingVertical: 4 }}
              >
                <TouchableOpacity 
                  onPress={() => setFilterGroup(null)}
                  className={`px-4 py-2 rounded-full mr-2 border ${filterGroup === null ? 'bg-gg-primary border-gg-primary' : 'bg-gg-bg border-gg-outlineVariant'}`}
                >
                  <Text className={`font-psemibold text-sm ${filterGroup === null ? 'text-white' : 'text-gg-muted'}`}>All</Text>
                </TouchableOpacity>
                {uniqueGroups.map((groupName) => (
                  <TouchableOpacity 
                    key={groupName}
                    onPress={() => setFilterGroup(groupName)}
                    className={`px-4 py-2 rounded-full mr-2 border ${filterGroup === groupName ? 'bg-gg-primary border-gg-primary' : 'bg-gg-bg border-gg-outlineVariant'}`}
                  >
                    <Text className={`font-psemibold text-sm ${filterGroup === groupName ? 'text-white' : 'text-gg-muted'}`}>{groupName}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {filteredUsers.length === 0 ? (
              <EmptyState icon="people-outline" title="No users found" message="Adjust the search or group filter." />
            ) : (
              <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity className="border-b border-gg-outlineVariant py-3" onPress={() => handleViewUser(item.id)}>
                    <View className="flex-row justify-between items-center">
                      <View className="h-10 w-10 rounded-full bg-gg-surfaceLow items-center justify-center mr-3">
                        <Text className="font-psemibold text-gg-primary">
                          {item.first_name?.[0]}{item.last_name?.[0]}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-psemibold text-gg-text">
                          {item.first_name} {item.last_name}
                        </Text>
                        <Text className="font-pregular text-gg-muted text-sm">{item.email}</Text>
                        <View className="flex-row items-center mt-1">
                          {item.is_staff ? (
                            <Text className="text-gg-secondary text-sm font-pmedium">
                            Admin
                            </Text>
                          ):(
                            <Text className="text-gg-muted text-sm font-pmedium">
                            User
                            </Text>
                          )}
                          {item.group && (
                            <Text className="text-gg-muted text-sm ml-2">
                             • {item.group.name}
                            </Text>
                          )}
                          <Text className="text-gg-muted text-sm ml-2">
                            • {item.total_hours.toFixed(1)}h
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#6e7b6c" />
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </Card>

          <TouchableOpacity 
            className="bg-gg-primary min-h-[56px] rounded-lg flex-row items-center justify-center"
            onPress={() => router.push('/(admin)/add-user')}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-psemibold ml-2">Add New User</Text>
          </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

export default UsersManagement 
