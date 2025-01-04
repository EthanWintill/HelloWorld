import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { useState } from 'react'
import { icons} from '../constants'

interface FormFieldProps {
  title: string;
  value: string;
  placeholder: string;
  handleChangeText: (text: string) => void;
  otherStyles?: string;
  [key: string]: any;
}

const FormField: React.FC<FormFieldProps> = ({title, value, placeholder, handleChangeText, otherStyles, ...props}) => {
    const [showPassword, setShowPassword] = useState(false)
return (
    <View className={`space-y-2 ${otherStyles}`}>
      <Text className="text-base text-gray-600 font-pmedium">{title}</Text>

      <View className="w-full h-16 px-4 border-2 border-slate-200 bg-slate-50 rounded-2xl focus:border-secondary items-center flex-row">
        <TextInput
            className="flex-1 text-gray-600 font-psemibold text-base"
            value={value}
            placeholder={placeholder}
            placeholderTextColor="#d1d5db"
            onChangeText={handleChangeText}
            secureTextEntry={title === 'Password' && !showPassword}
        />

        {title === 'Password' && (
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

