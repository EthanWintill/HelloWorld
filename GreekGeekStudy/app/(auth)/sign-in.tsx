import { View, Text, ScrollView, Image, Alert, Linking, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { images } from "@/constants";
import FormField from '@/components/FormField';
import CustomButton from '@/components/CustomButton';
import { Link, router } from 'expo-router';
import { API_URL } from '@/constants'
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';


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
        <SafeAreaView className="bg-gg-bg h-full">
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                <View className="flex-1 px-5 pt-8 pb-6">
                    <View className="items-center mb-8">
                        <Image
                            source={images.logoSmall}
                            className="w-16 h-16"
                            resizeMode="contain"
                        />
                        <Text className="font-psemibold text-gg-text text-3xl mt-5 text-center">
                            Sign in
                        </Text>
                        <Text className="font-pregular text-gg-muted text-center mt-2">
                            Track verified study hours and chapter progress.
                        </Text>
                    </View>

                    <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl p-4 shadow-sm">
                            <FormField
                                title="Email"
                                value={form.email}
                                placeholder="you@example.com"
                                handleChangeText={(e: any) => setform({
                                    ...form,
                                    email: e
                                })}
                                otherStyles=""
                                keyboardType="email-address"
                                autoComplete="email"
                                textContentType="emailAddress"
                                required={false}
                            />
                            <FormField
                                title="Password"
                                value={form.password}
                                placeholder="Your password"
                                handleChangeText={(e: any) => setform({
                                    ...form,
                                    password: e
                                })}
                                otherStyles="mt-5"
                                autoComplete="password"
                                textContentType="password"
                                required={false}
                            />
                            {formError && (
                                <View className="bg-[#ffdad6] border border-[#ffb4ab] rounded-lg p-3 mt-4 flex-row">
                                    <Ionicons name="alert-circle" size={18} color="#ba1a1a" />
                                    <Text className="text-gg-error ml-2 flex-1 font-pregular text-sm">
                                        No account found with those credentials. Try again or reset your password.
                                    </Text>
                                </View>
                            )}
                            <View className="items-end mt-4 mb-1">
                                <TouchableOpacity
                                    onPress={() => Linking.openURL(`${API_URL}forgot-password/`)}
                                >
                                  <Text className="text-sm font-psemibold text-gg-primary">
                                    Forgot password?
                                  </Text>
                                </TouchableOpacity>
                            </View>

                            <CustomButton
                                title="Sign in"
                                handlePress={submit}
                                containerStyles='mt-4'
                                isLoading={isSubmitting}
                            />
                    </View>

                    <View className="justify-center pt-6 flex-row">
                        <Text className="text-base text-gg-muted font-pregular">
                            Need an account?
                        </Text>
                        <Link href="/sign-up" className="text-base font-psemibold text-gg-primary ml-2">Register with code</Link>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

export default SignIn
