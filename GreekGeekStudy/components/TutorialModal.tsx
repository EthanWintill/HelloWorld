import React, { useState } from 'react'
import { Modal, View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const STEPS = [
  {
    icon: 'time-outline' as const,
    title: 'Clock In & Out',
    body: 'Tap the big button to start tracking your study time. Tap again when you\'re done.',
  },
  {
    icon: 'location-outline' as const,
    title: 'Study Areas',
    body: 'Your org sets approved locations. You need to be inside one to clock in — the map shows where.',
  },
  {
    icon: 'trending-up-outline' as const,
    title: 'Track Your Progress',
    body: 'The progress bar shows how many hours you\'ve logged toward your period requirement.',
  },
  {
    icon: 'list-outline' as const,
    title: 'Study History',
    body: 'The History tab shows every session you\'ve logged and how they count toward your periods.',
  },
  {
    icon: 'trophy-outline' as const,
    title: 'Leaderboard',
    body: 'See how you rank against your chapter. Updated as everyone logs hours.',
  },
]

interface TutorialModalProps {
  visible: boolean
  onClose: () => void
}

export default function TutorialModal({ visible, onClose }: TutorialModalProps) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const handleClose = () => {
    setStep(0)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-gg-surface rounded-t-2xl px-6 pt-5 pb-10">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-gg-muted text-xs font-pregular tracking-wider uppercase">
              Step {step + 1} of {STEPS.length}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text className="text-gg-muted text-sm font-pregular">Skip</Text>
            </TouchableOpacity>
          </View>

          <View className="items-center mb-6">
            <View className="bg-gg-surfaceLow rounded-full p-4 mb-4">
              <Ionicons name={current.icon} size={36} color="#006b2c" />
            </View>
            <Text className="text-xl font-psemibold text-gg-text text-center mb-2">
              {current.title}
            </Text>
            <Text className="text-gg-muted font-pregular text-center text-base leading-6">
              {current.body}
            </Text>
          </View>

          <View className="flex-row justify-center mb-6">
            {STEPS.map((_, i) => (
              <View
                key={i}
                className={`w-2 h-2 rounded-full mx-1 ${i === step ? 'bg-gg-primary' : 'bg-gg-outlineVariant'}`}
              />
            ))}
          </View>

          <TouchableOpacity
            onPress={isLast ? handleClose : () => setStep(s => s + 1)}
            className="bg-gg-primary rounded-lg py-3 items-center"
          >
            <Text className="text-white font-psemibold text-base">
              {isLast ? 'Done' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
