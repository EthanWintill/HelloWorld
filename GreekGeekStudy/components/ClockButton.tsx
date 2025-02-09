import { Text, TouchableOpacity, Dimensions, View, ActivityIndicator } from 'react-native'
import React from 'react'
import { StyleSheet } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

interface ClockButtonProps {
  title: string;
  secondaryTitle?: string;
  handlePress: () => void;
  containerStyles?: string;
  textStyles?: string;
  isLoading?: boolean;
  isStarted: boolean;
  percentComplete: number;
  time?: string;
}

const screen = Dimensions.get('window')

const ClockButton: React.FC<ClockButtonProps> = ({ title, secondaryTitle, handlePress, containerStyles, textStyles, isLoading, isStarted, percentComplete, time}) => {
  // Split the title into words and render each on its own line
  const titleWords = title.split(' ');
  
  return (
    <View style={styles.container}>
      
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: isStarted ? 'rgba(239, 68, 68, 0.1)' : 'rgba(22, 163, 74, 0.1)',
            zIndex: 1 }
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={isLoading}
        className={`border-5 rounded-full justify-center items-center ${isStarted ? 'border-red-500' : 'border-green-500'} ${containerStyles}`}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#FFA001" />
        ) : (
          <>
            <View className="items-center">
              {titleWords.map((word, index) => (
                <Text 
                  key={index}
                  style={styles.title} 
                  className={`text-black text-4xl font-plight ${textStyles}`}
                >
                  {word}
                </Text>
              ))}
              {secondaryTitle && (
                <Text className="text-gray-400 text-lg font-plight mt-1">
                  {secondaryTitle}
                </Text>
              )}
            </View>
            {isStarted && <Text style={styles.timer} className="text-gray-400 text-2xl font-plight">{time}</Text>}
          </>
        )}
      </TouchableOpacity>
      <AnimatedCircularProgress
        size={screen.width / 2}
        width={12}
        fill={percentComplete}
        tintColor="blue"
        rotation={0}
        dashedTint={{width:3, gap:10}}
        backgroundColor='rgba(0,0,0,0.1)'
      />
      
    </View>
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
    position: 'absolute',
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
  progressCircle: {
    position: 'absolute',
    zIndex: 0
  }
})

export default ClockButton