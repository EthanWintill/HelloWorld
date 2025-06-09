import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import React, { useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import axios from 'axios'
import { API_URL } from '@/constants'

interface FormData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  registration_code: string;
}

const AddUser = () => {
  const { dashboardState, refreshDashboard } = useDashboard()
  const { isLoading, error, data } = dashboardState
  const router = useRouter()
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    registration_code: '',
  });
  
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update registration code when dashboard data changes
  React.useEffect(() => {
    if (data?.org?.reg_code) {
      setFormData(prev => ({
        ...prev,
        registration_code: data.org.reg_code
      }));
    }
  }, [data]);

  const validateForm = () => {
    const errors: Partial<FormData> = {};
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.first_name) errors.first_name = 'First name is required';
    if (!formData.last_name) errors.last_name = 'Last name is required';
    // Phone number is now optional
    if (!formData.registration_code) errors.registration_code = 'Registration code is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await axios.post(`${API_URL}api/signup/`, formData);
      
      Alert.alert(
        "Success",
        "User has been created successfully!",
        [{ 
          text: "OK", 
          onPress: () => {
            // Refresh dashboard data before navigating back
            if (refreshDashboard) {
              refreshDashboard();
            }
            router.back();
          } 
        }]
      );
    } catch (error: any) {
      console.error('Error creating user:', error.response?.data || error.message);
      
      const errorMessage = error.response?.data?.detail || 
                           error.response?.data?.message ||
                           "An error occurred while creating the user. Please try again.";
      
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <ScrollView className="flex-1 p-4">
        <Text className="text-red-500 text-lg font-bold">Error:</Text>
        <Text className="text-red-500">{JSON.stringify(error, null, 2)}</Text>
      </ScrollView>
    );
  }

  // Check if user is admin
  if (!data?.is_staff) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-4">
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text className="text-xl font-psemibold text-center mt-4 mb-2">Access Denied</Text>
        <Text className="text-gray-600 text-center">You don't have permission to access this page.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 p-4">
          <View className="flex-row items-center mb-6">
            <TouchableOpacity 
              onPress={() => router.back()} 
              className="mr-4"
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text className="text-2xl font-psemibold">Add New User</Text>
          </View>

          <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <View className="mb-4">
              <Text className="font-psemibold mb-1">First Name <Text className="text-red-500">*</Text></Text>
              <TextInput
                value={formData.first_name}
                onChangeText={(text) => handleInputChange('first_name', text)}
                className="border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Enter first name"
              />
              {formErrors.first_name && (
                <Text className="text-red-500 text-sm mt-1">{formErrors.first_name}</Text>
              )}
            </View>

            <View className="mb-4">
              <Text className="font-psemibold mb-1">Last Name <Text className="text-red-500">*</Text></Text>
              <TextInput
                value={formData.last_name}
                onChangeText={(text) => handleInputChange('last_name', text)}
                className="border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Enter last name"
              />
              {formErrors.last_name && (
                <Text className="text-red-500 text-sm mt-1">{formErrors.last_name}</Text>
              )}
            </View>

            <View className="mb-4">
              <Text className="font-psemibold mb-1">Email <Text className="text-red-500">*</Text></Text>
              <TextInput
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                className="border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {formErrors.email && (
                <Text className="text-red-500 text-sm mt-1">{formErrors.email}</Text>
              )}
            </View>

            <View className="mb-4">
              <Text className="font-psemibold mb-1">Password <Text className="text-red-500">*</Text></Text>
              <TextInput
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                className="border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Enter password"
                secureTextEntry
              />
              {formErrors.password && (
                <Text className="text-red-500 text-sm mt-1">{formErrors.password}</Text>
              )}
            </View>

            <View className="mb-4">
              <Text className="font-psemibold mb-1">Phone Number</Text>
              <TextInput
                value={formData.phone_number}
                onChangeText={(text) => handleInputChange('phone_number', text)}
                className="border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Enter phone number (optional)"
                keyboardType="phone-pad"
              />
              {formErrors.phone_number && (
                <Text className="text-red-500 text-sm mt-1">{formErrors.phone_number}</Text>
              )}
            </View>

            <View className="mb-4">
              <Text className="font-psemibold mb-1">Registration Code <Text className="text-red-500">*</Text></Text>
              <TextInput
                value={formData.registration_code}
                onChangeText={(text) => handleInputChange('registration_code', text)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
                placeholder="Organization registration code"
                editable={false}
              />
              {formErrors.registration_code && (
                <Text className="text-red-500 text-sm mt-1">{formErrors.registration_code}</Text>
              )}
              <Text className="text-gray-500 text-sm mt-1">This code is automatically filled from your organization settings</Text>
            </View>
          </View>

          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`p-3 rounded-lg flex-row items-center justify-center ${
              isSubmitting ? 'bg-gray-400' : 'bg-green-600'
            }`}
          >
            {isSubmitting ? (
              <Text className="text-white font-psemibold">Creating User...</Text>
            ) : (
              <>
                <Ionicons name="person-add" size={20} color="white" />
                <Text className="text-white font-psemibold ml-2">Create User</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddUser; 