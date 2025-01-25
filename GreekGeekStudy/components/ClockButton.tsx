import { Text, TouchableOpacity, Dimensions, View } from 'react-native'
import React from 'react'
import { StyleSheet } from 'react-native';

interface ClockButtonProps {
  title: string;
  handlePress: () => void;
  containerStyles?: string;
  textStyles?: string;
  isLoading?: boolean;
  isStarted: boolean;
  percentComplete: number;
  time?: string;
}

const screen = Dimensions.get('window')

const ClockButton: React.FC<ClockButtonProps> = ({ title, handlePress, containerStyles, textStyles, isLoading, isStarted, percentComplete, time}) => {
  return (

    <TouchableOpacity
        style={styles.button}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={isLoading}
      className={`border-5 rounded-full justify-center items-center ${isStarted ? 'border-red-500' : 'border-green-500'} ${containerStyles}`}>
      
      <Text style={styles.title}className={`text-black text-4xl font-plight ${textStyles}`}>{title}</Text>
      {isStarted && <Text style={styles.timer} className="text-gray-400 text-2xl font-plight">{time}</Text>}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    width:screen.width / 2,
    height:screen.width / 2,
    borderRadius: screen.width / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    position: 'relative',
  },
  progressContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 50,
    overflow: 'hidden',
  },
  progress: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: 'blue',
    transform: [{ rotate: '90deg' }],
  },
  title: {
  },
  timer: {
  },
})

export default ClockButton