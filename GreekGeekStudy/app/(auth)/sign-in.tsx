import { View, Text, ScrollView, Image, Alert } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { images } from "@/constants";
import FormField from '@/components/FormField';
import CustomButton from '@/components/CustomButton';
import { Link, router } from 'expo-router';
import { API_URL } from '@/constants'
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';


const SignIn = () => {
    const [form, setform] = useState({
        email: '',
        password: '',
    })
    const [formError, setFormError] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)


    const submit = async () => {
        setIsSubmitting(true);
        setFormError(false)
        try {
            const response = await axios.post(`${API_URL}api/token/`, {
                email: form.email.toLowerCase(),
                password: form.password,
            });

            const data = response.data;

            if (response.status === 200) {
                await AsyncStorage.setItem('accessToken', data.access);
                await AsyncStorage.setItem('refreshToken', data.refresh);
                router.replace('/study');
            } else {
                setFormError(true)
            }
        } catch (error: any) {
            setFormError(true)
        } finally {
            setIsSubmitting(false);
        }
    };

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
                            <Text className="text-2xl text-black text-semibold font-psemibold">Sign in to GreekGeek</Text>
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
                                required={false}
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
                                required={false}
                            />
                            {formError && (
                                <Text className="text-m text-red-500 mt-4 font-pregular text-center">No account found with those credentials, please try again.</Text>
                            )}

                            <CustomButton
                                title="Sign In"
                                handlePress={submit}
                                containerStyles='mt-7'
                                isLoading={isSubmitting}
                            />
                            <View className="justify-center pt-5 flex-row gap-2">
                                <Text className="text-lg text-gray-600 font-pregular">
                                    Don't have an account?
                                </Text>
                                <Link href="/sign-up" className="text-lg font-psemibold text-green-500">Sign Up</Link>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

export default SignIn
