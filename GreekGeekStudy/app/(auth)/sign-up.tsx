import { View, Text, ScrollView, Image, Alert } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { images } from "@/constants";
import FormField from '@/components/FormField';
import CustomButton from '@/components/CustomButton';
import { Link, router } from 'expo-router';
import axios from 'axios';
import { API_URL } from '@/constants'
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [showForm, setShowForm] = useState(true)
  const [organizationName, setOrganizationName] = useState('')

  const search = async () => {
    setIsSubmitting(true)
    try {
      let result = await axios.request({
        method: 'GET',
        url: `${API_URL}/api/org-by-code/?reg_code=${form.orgCode}`
      })
      if (result.status === 200) {
        setOrganizationName(result.data.name)
        setShowForm(true)
        setFormErrors((prevErrors) => ({ ...prevErrors, orgCode: undefined }))
      }
    } catch (error: any) {
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
    setFormErrors(errors)
    return hasErrors

  }
  const submit = async () => {
    if (validateForm()) { return }
    setIsSubmitting(true)
    try {
      let result = await axios.request({
        method: 'POST',
        url: `${API_URL}/api/signup/`,
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
    <SafeAreaView className="bg-white h-full">
      <ScrollView contentContainerStyle={showForm ? { flexGrow: 1 } : { height: '100%' }}>
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
              <Text className="text-2xl text-black text-semibold font-psemibold">
                {showForm ? (
                  <>
                    {organizationName}{" "}
                    <Text className="text-lg text-gray-600">({form.orgCode})</Text>
                  </>
                ) : (
                  "Find your Organization"
                )}
              </Text>
              {(!showForm &&
                <>
                  <FormField
                    title="Organization Code"
                    value={form.orgCode}
                    placeholder="Enter your organization code"
                    handleChangeText={(e: any) => {
                      setform({
                        ...form,
                        orgCode: e
                      });

                    }}
                    otherStyles="mt-7"
                    keyboardType="default"
                    required={true}

                  />
                  {formErrors.orgCode && (
                    <Text className="text-sm text-red-500 mt-2 font-pregular text-center">{formErrors.orgCode}</Text>
                  )}
                </>
              )}
              {(showForm &&
                <>
                  <View className="flex-row justify-between">
                    <FormField
                      title="First Name"
                      value={form.firstName}
                      placeholder="Enter your first name"
                      handleChangeText={(e: any) => setform({
                        ...form,
                        firstName: e
                      })}
                      otherStyles="mt-7 flex-1 mr-2"
                      error={formErrors.firstName}
                      required={true}
                    />
                    <FormField
                      title="Last Name"
                      value={form.lastName}
                      placeholder="Enter your last name"
                      handleChangeText={(e: any) => setform({
                        ...form,
                        lastName: e
                      })}
                      otherStyles="mt-7 flex-1 ml-2"
                      error={formErrors.lastName}
                      required={true}
                    />
                  </View>
                  <FormField
                    title="Phone Number"
                    value={form.phoneNumber}
                    placeholder="Enter your phone number"
                    handleChangeText={(e: any) => setform({
                      ...form,
                      phoneNumber: e
                    })}
                    otherStyles="mt-7"
                    keyboardType="phone-pad"
                    error={formErrors.phoneNumber}
                    required={false}
                  />
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
                    error={formErrors.email}
                    required={true}
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
                    error={formErrors.password}
                    required={true}
                  />
                  <FormField
                    title="Confirm Password"
                    value={form.confirmPassword}
                    placeholder="Confirm your password"
                    handleChangeText={(e: any) => setform({
                      ...form,
                      confirmPassword: e
                    })}
                    otherStyles="mt-7"
                    error={formErrors.confirmPassword}
                    required={true}
                  />
                </>
              )}
              <CustomButton
                title={showForm ? "Sign Up" : "Search"}
                handlePress={showForm ? submit : search}
                containerStyles='mt-7'
                isLoading={isSubmitting}
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
