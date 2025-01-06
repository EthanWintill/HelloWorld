import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { useState } from 'react'
import { icons } from '../constants'

interface FormFieldProps {
  title: string;
  value: string;
  placeholder: string;
  handleChangeText: (text: string) => void;
  required: boolean;
  otherStyles?: string;
  error?: string;
  [key: string]: any;
}

const FormField: React.FC<FormFieldProps> = ({ title, value, placeholder, handleChangeText, otherStyles, error, required, ...props }) => {
  const [showPassword, setShowPassword] = useState(false)
  return (
    <View className={`space-y-2 ${otherStyles}`}>
      <Text className="text-base text-gray-600 font-pmedium">{title + (required ? " *" : "")}</Text>
      {error && <Text className="text-sm text-red-500 font-pregular">{error}</Text>}
      <View className={`w-full h-16 px-4 border-2 ${error ? "border-red-500 bg-red-50" : "border-slate-200 bg-slate-50"} rounded-2xl focus:border-secondary items-center flex-row`}>
        <TextInput
          className="flex-1 text-gray-600 font-psemibold text-base"
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#d1d5db"
          onChangeText={handleChangeText}
          secureTextEntry={(title === 'Password' || title === 'Confirm Password') && !showPassword}
          keyboardType={title === 'Email' ? 'email-address' : 'default'}
          autoCapitalize="none"
        />

        {(title === 'Password' || title === 'Confirm Password') && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Image source={!showPassword ? icons.eye : icons.eyeHide}
              resizeMode='contain'
              className="w-6 h-6"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

export default FormField

