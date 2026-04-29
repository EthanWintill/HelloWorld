import { View, Text, ScrollView, Image, Alert, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { images } from "@/constants";
import FormField from '@/components/FormField';
import CustomButton from '@/components/CustomButton';
import { Link, router } from 'expo-router';
import axios from 'axios';
import { API_URL } from '@/constants'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

type FormFields = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  orgCode: string;
};

const SignUp = () => {
  const [form, setform] = useState<FormFields>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    orgCode: ''
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormFields, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [organizationName, setOrganizationName] = useState('')

  const search = async () => {
    setIsSubmitting(true)
    try {
      let result = await axios.request({
        method: 'GET',
        url: `${API_URL}api/org-by-code/?reg_code=${form.orgCode}`
      })
      if (result.status === 200) {
        setOrganizationName(result.data.name)
        setShowForm(true)
        setFormErrors((prevErrors) => ({ ...prevErrors, orgCode: undefined }))
      }
    } catch (error: any) {
      console.log(error.response)
      if (error.response) {
        setFormErrors((prevErrors) => ({ ...prevErrors, orgCode: "Organization not found with that code. Please check with your organization administrator." }))
        setShowForm(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const validateForm = () => {
    let errors: Partial<Record<keyof FormFields, string>> = {}
    let hasErrors = false
    for (const [key, value] of Object.entries(form)) {
      if (key === 'phoneNumber') {
        const patt = /^(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$/;
        if (value && !patt.test(value)) {
          errors[key] = 'Enter a valid phone number';
          hasErrors = true;
        }
      }
      else if (key === 'email') {
        if (!value) {
          errors[key] = 'This can not be blank'
          hasErrors = true
        }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors[key] = 'Enter a valid email address';
          hasErrors = true;
        }
      }
      else if (!value) {
        errors[key as keyof FormFields] = 'This can not be blank';
        hasErrors = true;
      }
    }
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      hasErrors = true;
    }
    setFormErrors(errors)
    return hasErrors

  }
  const submit = async () => {
    if (validateForm()) { return }
    setIsSubmitting(true)
    try {
      let result = await axios.request({
        method: 'POST',
        url: `${API_URL}api/signup/`,
        data: {
          email: form.email,
          password: form.password,
          first_name: form.firstName,
          last_name: form.lastName,
          phone_number: form.phoneNumber,
          registration_code: form.orgCode
        }
      })
      if (result.status === 201) {
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
          }
        } catch (error: any) {
          router.replace('/sign-in')
        }
      }
    } catch (error: any) {
      if (error.response && error.response.data.type === "validation_error") {
        const errors: Partial<Record<keyof FormFields, string>> = {}
        error.response.data.errors.forEach((err: any) => {
          const fieldMap: Record<string, keyof FormFields> = {
            email: 'email',
            password: 'password',
            first_name: 'firstName',
            last_name: 'lastName',
            phone_number: 'phoneNumber',
            registration_code: 'orgCode'
          }
          const formField = fieldMap[err.attr]
          if (formField) {
            errors[formField] = err.detail
          }
        })
        setFormErrors(errors)
      }
    } finally {
      setIsSubmitting(false)
    }
  }
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
              {showForm ? 'Create account' : 'Register with code'}
            </Text>
            <Text className="font-pregular text-gg-muted text-center mt-2">
              {showForm
                ? `Join ${organizationName} and start tracking study hours.`
                : 'Enter the code from your chapter or organization admin.'}
            </Text>
          </View>

          <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl p-4 shadow-sm">
            {!showForm && (
              <>
                <View className="bg-gg-surfaceLow border border-gg-outlineVariant rounded-lg p-3 mb-5 flex-row">
                  <Ionicons name="key-outline" size={20} color="#006b2c" />
                  <Text className="text-gg-primary font-pregular text-sm ml-2 flex-1">
                    Your code connects your account to the right roster and study rules.
                  </Text>
                </View>
                <FormField
                  title="Organization Code"
                  value={form.orgCode}
                  placeholder="ABC123"
                  handleChangeText={(e: any) => {
                    setform({
                      ...form,
                      orgCode: e
                    });
                  }}
                  otherStyles=""
                  keyboardType="default"
                  autoCapitalize="characters"
                  required={true}
                />
                {formErrors.orgCode && (
                  <View className="bg-[#ffdad6] border border-[#ffb4ab] rounded-lg p-3 mt-4 flex-row">
                    <Ionicons name="alert-circle" size={18} color="#ba1a1a" />
                    <Text className="text-sm text-gg-error ml-2 flex-1 font-pregular">{formErrors.orgCode}</Text>
                  </View>
                )}
              </>
            )}

            {showForm && (
              <>
                <View className="bg-gg-bg border border-gg-outlineVariant rounded-lg p-3 mb-5 flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="font-psemibold text-gg-text">{organizationName}</Text>
                    <Text className="font-pregular text-gg-muted text-sm">Code {form.orgCode}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowForm(false)}
                    className="px-3 py-2 rounded-lg bg-gg-surface border border-gg-outlineVariant"
                  >
                    <Text className="font-psemibold text-gg-muted text-sm">Change</Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-row justify-between">
                  <FormField
                    title="First Name"
                    value={form.firstName}
                    placeholder="First"
                    handleChangeText={(e: any) => setform({
                      ...form,
                      firstName: e
                    })}
                    otherStyles="flex-1 mr-2"
                    error={formErrors.firstName}
                    required={true}
                  />
                  <FormField
                    title="Last Name"
                    value={form.lastName}
                    placeholder="Last"
                    handleChangeText={(e: any) => setform({
                      ...form,
                      lastName: e
                    })}
                    otherStyles="flex-1 ml-2"
                    error={formErrors.lastName}
                    required={true}
                  />
                </View>
                <FormField
                  title="Phone Number"
                  value={form.phoneNumber}
                  placeholder="Optional"
                  handleChangeText={(e: any) => setform({
                    ...form,
                    phoneNumber: e
                  })}
                  otherStyles="mt-5"
                  keyboardType="phone-pad"
                  error={formErrors.phoneNumber}
                  required={false}
                />
                <FormField
                  title="Email"
                  value={form.email}
                  placeholder="you@example.com"
                  handleChangeText={(e: any) => setform({
                    ...form,
                    email: e
                  })}
                  otherStyles="mt-5"
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  error={formErrors.email}
                  required={true}
                />
                <FormField
                  title="Password"
                  value={form.password}
                  placeholder="At least 8 characters"
                  handleChangeText={(e: any) => setform({
                    ...form,
                    password: e
                  })}
                  otherStyles="mt-5"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  error={formErrors.password}
                  required={true}
                />
                <FormField
                  title="Confirm Password"
                  value={form.confirmPassword}
                  placeholder="Repeat password"
                  handleChangeText={(e: any) => setform({
                    ...form,
                    confirmPassword: e
                  })}
                  otherStyles="mt-5"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  error={formErrors.confirmPassword}
                  required={true}
                />
              </>
            )}

            <CustomButton
              title={showForm ? "Create account" : "Find organization"}
              handlePress={showForm ? submit : search}
              containerStyles='mt-6'
              isLoading={isSubmitting}
            />
          </View>

          <View className="justify-center pt-6 flex-row">
            <Text className="text-base text-gg-muted font-pregular">
              Already have an account?
            </Text>
            <Link href="/sign-in" className="text-base font-psemibold text-gg-primary ml-2">Sign in</Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default SignUp
