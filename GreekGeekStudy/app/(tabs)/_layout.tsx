import { View, Text } from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { DashboardProvider } from '../../context/DashboardContext'

interface TabIconProps {
    icon: keyof typeof Ionicons.glyphMap;
    color?: string;
    name?: string;
    focused?: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({icon, color, name, focused}) => {
    return (
        <View className={`items-center justify-center min-w-[72px] h-[48px] rounded-full ${focused ? 'bg-gg-surfaceLow border border-gg-outlineVariant' : ''}`}>
            <Ionicons name={icon} size={focused ? 22 : 21} color={color} />
            <Text className={`${focused ? 'font-psemibold' : 'font-pregular'} text-[11px] mt-0.5`} style={{color:color}}>
                {name}
            </Text>
        </View>
    )
}

const TabsLayout = () => {
  return (
    <DashboardProvider>
      <Tabs
            screenOptions={
                {
                    tabBarShowLabel: false,
                    tabBarActiveTintColor: '#006b2c',
                    tabBarInactiveTintColor: '#3e4a3d',
                    tabBarStyle: {
                        backgroundColor: '#FFFFFF',
                        borderTopWidth: 1,
                        borderTopColor: '#bdcaba',
                        height: 76,
                        paddingTop: 9,
                        paddingBottom: 11,
                    },
                    tabBarItemStyle: {
                        height: 56,
                    },
                }
            }
        >
            <Tabs.Screen
                name="study"
                options={{
                    title: 'Study',
                    headerShown: false,
                    tabBarIcon: ({color, focused}) => (
                        <TabIcon 
                            icon={focused ? "timer" : "timer-outline"}
                            color={color}
                            name={"Study"}
                            focused={focused}
                        />
                    )
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    title: 'History',
                    headerShown: false,
                    tabBarIcon: ({color, focused}) => (
                        <TabIcon 
                            icon={focused ? "time" : "time-outline"}
                            color={color}
                            name={"History"}
                            focused={focused}
                        />
                    )
                }}
            />
            <Tabs.Screen
                name="leaderboard"
                options={{
                    title: 'Leaderboard',
                    headerShown: false,
                    tabBarIcon: ({color, focused}) => (
                        <TabIcon 
                            icon={focused ? "podium" : "podium-outline"}
                            color={color}
                            name={"Ranks"}
                            focused={focused}
                        />
                    )
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    headerShown: false,
                    tabBarIcon: ({color, focused}) => (
                        <TabIcon 
                            icon={focused ? "person-circle" : "person-circle-outline"}
                            color={color}
                            name={"Profile"}
                            focused={focused}
                        />
                    )
                }}
            />
        </Tabs>
    </DashboardProvider>
  )
}

export default TabsLayout
