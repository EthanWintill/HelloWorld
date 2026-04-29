import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { useState } from 'react'
import { icons } from '../constants'
import { GG } from './Design'

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
    <View className={`${otherStyles}`}>
      <Text className="text-xs text-gg-muted font-psemibold mb-2">{title + (required ? " *" : "")}</Text>
      {error && <Text className="text-sm text-gg-error font-pregular mb-1">{error}</Text>}
      <View
        className="w-full h-14 px-4 border rounded-lg items-center flex-row"
        style={{
          backgroundColor: error ? GG.errorContainer : GG.surface,
          borderColor: error ? GG.error : GG.outline,
        }}
      >
        <TextInput
          className="flex-1 text-gg-text font-pregular text-base"
          value={value}
          placeholder={placeholder}
          placeholderTextColor={GG.muted}
          onChangeText={handleChangeText}
          secureTextEntry={(title === 'Password' || title === 'Confirm Password') && !showPassword}
          keyboardType={props.keyboardType || (title === 'Email' ? 'email-address' : 'default')}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
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
