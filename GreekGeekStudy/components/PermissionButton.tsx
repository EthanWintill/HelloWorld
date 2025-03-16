import { Text, TouchableOpacity, Dimensions, View } from 'react-native'
import React from 'react'
import { StyleSheet } from 'react-native';

interface PermissionButtonProps {
  handlePress: () => void;
  containerStyles?: string;
}

const screen = Dimensions.get('window')

const PermissionButton: React.FC<PermissionButtonProps> = ({ handlePress, containerStyles }) => {
  return (
    <TouchableOpacity
      style={[
      styles.button,
      { backgroundColor: 'rgba(145, 145, 145, 0.46)' } // light gray inside
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      className={`border-5 rounded-full justify-center items-center border-gray-500 ${containerStyles}`}>
      <Text
      style={styles.title}
      className={`text-black text-xl font-medium font-plight mt-1 text-center`}
      >
      You must enable{'\n'}location sharing to use{'\n'}Greek Geek
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: screen.width / 2,
    height: screen.width / 2,
    borderRadius: screen.width / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    position: 'relative',
  },
  title: {
  },
})

export default PermissionButton