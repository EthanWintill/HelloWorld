import React from 'react'
import { ReactNode } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export const GG = {
  background: '#f4fcf0',
  surface: '#FFFFFF',
  surfaceLow: '#eff6ea',
  surfaceContainer: '#e9f0e5',
  surfaceHigh: '#e3eadf',
  surfaceHighest: '#dde5d9',
  primary: '#006b2c',
  primaryContainer: '#00873a',
  primaryFixed: '#7ffc97',
  text: '#171d16',
  muted: '#3e4a3d',
  outline: '#6e7b6c',
  border: '#bdcaba',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  warning: '#D97706',
  info: '#0051d5',
}

type ChildrenProps = {
  children: ReactNode
  className?: string
}

export const Card = ({ children, className = '' }: ChildrenProps) => (
  <View className={`bg-gg-surface border border-gg-outlineVariant rounded-xl p-4 ${className}`}>
    {children}
  </View>
)

export const SectionTitle = ({ children, className = '' }: ChildrenProps) => (
  <Text className={`font-psemibold text-gg-text text-[17px] leading-6 ${className}`}>{children}</Text>
)

export const Label = ({ children, className = '' }: ChildrenProps) => (
  <Text className={`font-pregular text-gg-muted text-xs tracking-wider ${className}`}>{children}</Text>
)

export const ScreenTitle = ({ children, className = '' }: ChildrenProps) => (
  <Text className={`font-psemibold text-gg-text text-[22px] leading-7 ${className}`}>{children}</Text>
)

type HeaderProps = {
  title: string
  subtitle?: string
  right?: ReactNode
}

export const ScreenHeader = ({ title, subtitle, right }: HeaderProps) => (
  <View className="px-4 pt-4 pb-4 bg-gg-bg">
    <View className="flex-row items-start justify-between">
      <View className="flex-1 pr-3">
        <ScreenTitle>{title}</ScreenTitle>
        {subtitle ? (
          <Text className="font-pregular text-gg-muted text-sm leading-5 mt-1">{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  </View>
)

type PillProps = {
  children: ReactNode
  tone?: 'green' | 'red' | 'blue' | 'amber' | 'gray'
  className?: string
}

export const Pill = ({ children, tone = 'gray', className = '' }: PillProps) => {
  const tones = {
    green: 'bg-gg-surfaceLow border-gg-outlineVariant text-gg-primary',
    red: 'bg-[#ffdad6] border-[#ffb4ab] text-gg-error',
    blue: 'bg-[#dbe1ff] border-[#b4c5ff] text-gg-secondary',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    gray: 'bg-gg-surfaceLow border-gg-outlineVariant text-gg-muted',
  }

  return (
    <View className={`border rounded-full px-3 py-1 ${tones[tone]} ${className}`}>
      <Text className={`font-psemibold text-xs ${tones[tone].split(' ').find(token => token.startsWith('text-'))}`}>
        {children}
      </Text>
    </View>
  )
}

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  tone?: 'primary' | 'neutral' | 'danger' | 'blue'
  disabled?: boolean
  accessibilityLabel?: string
}

export const IconButton = ({ icon, onPress, tone = 'neutral', disabled, accessibilityLabel }: IconButtonProps) => {
  const tones = {
    primary: ['bg-gg-surfaceLow', GG.primary],
    neutral: ['bg-gg-surfaceContainer', GG.text],
    danger: ['bg-[#ffdad6]', GG.error],
    blue: ['bg-[#dbe1ff]', GG.info],
  } as const
  const [bg, color] = tones[tone]

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      className={`h-10 w-10 rounded-full items-center justify-center ${bg} ${disabled ? 'opacity-50' : ''}`}
    >
      <Ionicons name={icon} size={20} color={color} />
    </TouchableOpacity>
  )
}

type NavRowProps = {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle?: string
  onPress?: () => void
  right?: ReactNode
}

export const NavRow = ({ icon, title, subtitle, onPress, right }: NavRowProps) => {
  const Wrapper = onPress ? TouchableOpacity : View

  return (
    <Wrapper
      onPress={onPress}
      className="min-h-[56px] py-3 flex-row items-center border-b border-gg-outlineVariant"
    >
      <View className="h-9 w-9 rounded-lg bg-gg-surfaceLow items-center justify-center mr-3">
        <Ionicons name={icon} size={19} color={GG.muted} />
      </View>
      <View className="flex-1">
        <Text className="font-psemibold text-gg-text text-base">{title}</Text>
        {subtitle ? <Text className="font-pregular text-gg-muted text-sm mt-0.5">{subtitle}</Text> : null}
      </View>
      {right || (onPress ? <Ionicons name="chevron-forward" size={18} color={GG.border} /> : null)}
    </Wrapper>
  )
}

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  message: string
}

export const EmptyState = ({ icon, title, message }: EmptyStateProps) => (
  <View className="items-center py-8 px-4">
    <View className="h-12 w-12 rounded-lg bg-gg-surfaceLow items-center justify-center mb-3">
      <Ionicons name={icon} size={24} color={GG.muted} />
    </View>
    <Text className="font-psemibold text-gg-text text-center">{title}</Text>
    <Text className="font-pregular text-gg-muted text-center mt-1">{message}</Text>
  </View>
)

type ProgressBarProps = {
  value: number
  tone?: 'green' | 'blue' | 'amber' | 'red'
}

export const ProgressBar = ({ value, tone = 'green' }: ProgressBarProps) => {
  const colors = {
    green: 'bg-gg-primary',
    blue: 'bg-gg-secondary',
    amber: 'bg-amber-500',
    red: 'bg-gg-error',
  }

  return (
    <View className="bg-gg-surfaceHighest rounded-full h-1 overflow-hidden">
      <View className={`${colors[tone]} h-2 rounded-full`} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </View>
  )
}
