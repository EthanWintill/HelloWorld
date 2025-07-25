import { View, Text, Image } from 'react-native'
import React from 'react'
import { Tabs, Redirect } from 'expo-router'

import { icons } from '../../constants'
import { DashboardProvider } from '../../context/DashboardContext'

interface TabIconProps {
    icon: any;
    color?: string;
    name?: string;
    focused?: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({icon, color, name, focused}) => {
    return (
        <View className="items-center justify-center gap-2">
            <Image 
            source={icon}
            resizeMode='contain'
            tintColor={color}
            className="w-7 h-7"
            />
            {/* <Text className={`${focused ? 'font-psemibold' : 'font-pregular'} text-xs`} style={{color:color}}>
                {name}
            </Text> */}
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
                    tabBarActiveTintColor: '#16A34A',
                    tabBarInactiveTintColor: '#000000',
                    tabBarStyle: {
                        backgroundColor: '#FFFFFF',
                        borderTopWidth: 1,
                        borderTopColor: '#E5E5E5',
                        height: 60,
                    }
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
                            icon={icons.home}
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
                            icon={icons.history}
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
                            icon={icons.list}
                            color={color}
                            name={"Leaderboard"}
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
                            icon={icons.profile}
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