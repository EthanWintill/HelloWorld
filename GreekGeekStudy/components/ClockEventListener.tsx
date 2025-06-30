import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { onClockIn, onClockOut } from '@/services/DashboardService';

/**
 * A component that listens for clock in/out events and displays the last event
 */
const ClockEventListener: React.FC = () => {
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [eventTime, setEventTime] = useState<Date | null>(null);

  useEffect(() => {
    // Subscribe to clock in events
    const unsubscribeClockIn = onClockIn(() => {
      setLastEvent('Clock In');
      setEventTime(new Date());
    });

    // Subscribe to clock out events
    const unsubscribeClockOut = onClockOut(() => {
      setLastEvent('Clock Out');
      setEventTime(new Date());
    });

    // Clean up subscriptions when component unmounts
    return () => {
      unsubscribeClockIn();
      unsubscribeClockOut();
    };
  }, []);

  if (!lastEvent || !eventTime) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Last Clock Event:</Text>
      <Text style={styles.event}>{lastEvent}</Text>
      <Text style={styles.time}>
        {eventTime.toLocaleTimeString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginVertical: 8,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  event: {
    fontSize: 16,
    color: '#333',
  },
  time: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default ClockEventListener; 