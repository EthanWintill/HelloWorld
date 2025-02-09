import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants';
import axios from 'axios';
import { Alert } from 'react-native';
import { useDashboard } from './context/DashboardContext';
import eventBus, { GEOFENCE_EXIT } from './helpers/eventBus';

const GEOFENCE_TASK = 'GEOFENCE_TASK';

interface GeofencingEvent {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}

TaskManager.defineTask('GEOFENCE_TASK', async ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  const { eventType, region } = data as GeofencingEvent;
  let timeoutId: NodeJS.Timeout | null = null;

  if (eventType === Location.GeofencingEventType.Enter) {
    if(timeoutId) {
      clearTimeout(timeoutId);
    }
  } else if (eventType === Location.GeofencingEventType.Exit) {
    Alert.alert('Please enter the geofence to continue studying, you have 5 minutes to do so.');
    timeoutId = setTimeout(() => {
      eventBus.emit(GEOFENCE_EXIT);
    }, 300000);
  }
});

export { GEOFENCE_TASK };