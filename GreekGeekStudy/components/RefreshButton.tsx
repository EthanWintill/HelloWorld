import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { refreshDashboard } from '@/services/DashboardService';
import { Ionicons } from '@expo/vector-icons';

interface RefreshButtonProps {
  label?: string;
  style?: any;
}

/**
 * A button component that triggers a dashboard refresh when pressed
 */
const RefreshButton: React.FC<RefreshButtonProps> = ({ 
  label = 'Refresh', 
  style 
}) => {
  const handlePress = () => {
    // This will trigger the dashboard refresh via the event emitter
    refreshDashboard();
  };

  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="refresh" size={16} color="#fff" style={styles.icon} />
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
  },
  icon: {
    marginRight: 6,
  }
});

export default RefreshButton; 