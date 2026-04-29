import { Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import React from 'react'
import { GG } from './Design'

interface CustomButtonProps {
  title: string;
  handlePress: () => void;
  containerStyles?: string;
  textStyles?: string;
  isLoading?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({ title, handlePress, containerStyles, textStyles, isLoading }) => {
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={isLoading}
      className={`rounded-lg min-h-[56px] justify-center items-center ${containerStyles} ${isLoading ? 'opacity-50' : ''}`}
      style={{ backgroundColor: GG.primary }}>
      {isLoading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <Text className={`text-white font-psemibold text-base ${textStyles}`}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

export default CustomButton
