import { View, Text, ScrollView, Image, Alert } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { images } from "@/constants";
import FormField from '@/components/FormField';
import CustomButton from '@/components/CustomButton';
import { Link } from 'expo-router';
import { API_URL } from '@/constants'

const SignUp = () => {
  const [form, setform] = useState({
    email: '',
    password: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submit = () => {
    Alert.alert('API URL', API_URL)
  }
  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView contentContainerStyle={{ height: '100%' }}>

        <View className="w-full justify-center items-center px-4">



          <Image
            source={images.logo}
            className="w-[250px] h-[160px]" // Increased the size of the logo
            resizeMode="contain"
          />
        </View>
        <View>
          <View className="w-full items-center min-h-[85vh] px-4 my-6">

            <View className="w-full">
              <Text className="text-2xl text-black text-semibold font-psemibold">Find your Organization</Text>
              <FormField
                title="Email"
                value={form.email}
                placeholder="Enter your email"
                handleChangeText={(e: any) => setform({
                  ...form,
                  email: e
                })}
                otherStyles="mt-7"
                keyboardType="email-address"
              />
              <FormField
                title="Password"
                value={form.password}
                placeholder="Enter your password"
                handleChangeText={(e: any) => setform({
                  ...form,
                  password: e
                })}
                otherStyles="mt-7"
              />

              <CustomButton
                title="Sign Up"
                handlePress={submit}
                containerStyles='mt-7'
              />
              <View className="justify-center pt-5 flex-row gap-2">
                <Text className="text-lg text-gray-600 font-pregular">
                  Already have an account?
                </Text>
                <Link href="/sign-in" className="text-lg font-psemibold text-green-500">Sign In</Link>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default SignUp
