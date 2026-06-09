import { Image, View, Text, ScrollView, Alert, Linking, TouchableOpacity, AppState, Modal, TextInput, Platform } from 'react-native'
import React, { useEffect, useState, useRef, useCallback } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { useDashboard } from '../../context/DashboardContext'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import { useStopWatch } from '@/hooks/useStopwatch'
import { API_URL } from '@/constants';
import axios, { AxiosError } from 'axios'
import haversine from 'haversine-distance'
import * as TaskManager from 'expo-task-manager';
import eventEmitter, { EVENTS } from '@/services/EventEmitter';
import MapView, { Marker, Region, Circle } from 'react-native-maps';
import { useFocusEffect } from 'expo-router/react-navigation';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AdminSubscriptionCTA, OrgPaywallModal } from '../../components/AdminSubscriptionGate';
import { useOrgSubscriptionGate } from '../../hooks/useOrgSubscriptionGate';
import TutorialModal from '../../components/TutorialModal';

interface LocationType {
  id: number;
  name: string;
  org: number;
  gps_lat: number;
  gps_long: number;
  gps_radius: number;
  gps_address?: string;
}

interface NearestLocationInfo {
  location: LocationType;
  distance: number;
}

const GEOFENCE_TASK = 'GEOFENCE_TASK';
const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';
const ACTIVE_STUDY_LOCATION_KEY = 'activeStudyLocation';
const PENDING_CLOCK_OUT_KEY = 'pendingClockOut';
const TUTORIAL_PROMPT_KEY = 'hasSeenTutorialPrompt';

const stopBackgroundStudyMonitoring = async () => {
  const geofenceStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
  if (geofenceStarted) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  }

  const locationUpdatesStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (locationUpdatesStarted) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }

  await AsyncStorage.removeItem(ACTIVE_STUDY_LOCATION_KEY);
};

const clockOutFromBackgroundLocation = async () => {
  const token = await AsyncStorage.getItem('accessToken');
  if (!token) return;

  try {
    await axios.post(API_URL + 'api/clockout/', {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    eventEmitter.emit(EVENTS.DASHBOARD_REFRESH);
    eventEmitter.emit(EVENTS.CLOCK_OUT);
  } catch (error) {
    if (error instanceof AxiosError && !error.response) {
      const ts = new Date().toISOString();
      console.log('[PendingClockOut] background: network error — storing pending clock-out at', ts);
      await AsyncStorage.setItem(PENDING_CLOCK_OUT_KEY, JSON.stringify({ timestamp: ts }));
    } else {
      console.log('[PendingClockOut] background: server error, not storing pending:', error);
    }
  } finally {
    await stopBackgroundStudyMonitoring();
  }
};

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  console.log('Background task executed with data:', data);

  const { eventType } = data as GeofencingEvent;

  if (eventType === Location.GeofencingEventType.Enter) {
    console.log('You have entered the geofence');
    
  } else if (eventType === Location.GeofencingEventType.Exit) {
    console.log('You have exited the geofence');
    try {
      await clockOutFromBackgroundLocation();
    } catch(error) {
      console.log(error);
    }
  }
});

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }

  try {
    const activeLocationData = await AsyncStorage.getItem(ACTIVE_STUDY_LOCATION_KEY);
    if (!activeLocationData) return;

    const activeLocation = JSON.parse(activeLocationData) as LocationType;
    const { locations } = data as { locations?: Location.LocationObject[] };
    const latestLocation = locations?.[locations.length - 1];
    if (!latestLocation) return;

    const distance = haversine(
      {
        latitude: latestLocation.coords.latitude,
        longitude: latestLocation.coords.longitude,
      },
      {
        latitude: activeLocation.gps_lat,
        longitude: activeLocation.gps_long,
      }
    );

    console.log('Background distance to study location:', distance);

    if (distance > activeLocation.gps_radius) {
      await clockOutFromBackgroundLocation();
    }
  } catch (taskError) {
    console.log(taskError);
  }
});

interface GeofencingEvent {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}

const Study = () => {
  // --- Hooks and State ---
  const { dashboardState, refreshDashboard, checkIsStudying, handleUnauthorized } = useDashboard()
  const { isLoading, error, data } = dashboardState
  const subscriptionGate = useOrgSubscriptionGate()

  const [backgroundStatus, setBackgroundStatus] = useState(false)
  const [foregroundStatus, setForegroundStatus] = useState(false)

  const [isStudying, setIsStudying] = useState(false)
  const [pendingClockOut, setPendingClockOut] = useState(false)
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false)
  const [tutorialVisible, setTutorialVisible] = useState(false)
  
  // Add state for current study location with proper type
  const [currentStudyLocation, setCurrentStudyLocation] = useState<LocationType | null>(null);
  const [nearestLocation, setNearestLocation] = useState<NearestLocationInfo | null>(null);
  
  // Map related state
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const mapRef = useRef<MapView>(null);
  
  // New state for study locations list
  const [locationsListVisible, setLocationsListVisible] = useState(false);
  const [manualEntryVisible, setManualEntryVisible] = useState(false);
  const [manualHours, setManualHours] = useState('');
  const [manualStartTime, setManualStartTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Use our reimplemented stopwatch
  const {
    time,
    isRunning,
    hasStarted,
    start,
    stop,
    reset  } = useStopWatch();

  const [appState, setAppState] = useState(AppState.currentState);
  const orgSettings = data?.org_settings;
  const requiresLocationVerification = orgSettings?.require_location_verification !== false;
  const allowManualEntry = orgSettings?.allow_manual_entry === true;
  const maintenanceMode = orgSettings?.maintenance_mode === true && !data?.is_staff;

  // --- Location Related Functions ---
  const openAppSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert(
        'Unable to Open Settings',
        Platform.OS === 'ios'
          ? 'Open Settings, choose GreekGeek, then set Location to Always.'
          : 'Open Settings, choose GreekGeek, then enable Location permissions.'
      );
    }
  };

  const showSettingsAlert = () => {
    Alert.alert(
      "Location Permission Required",
      !foregroundStatus
        ? "GreekGeek needs location access to verify study sessions."
        : "GreekGeek needs background location access to end sessions when you leave.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => { openAppSettings(); } }
      ]
    );
  };

  const handleForegroundLocationPermission = async () => {
    let foregroundPermission = await Location.getForegroundPermissionsAsync()
    if (foregroundPermission.status === 'granted'){
      setForegroundStatus(true)
      return true
    }
    let res = await Location.requestForegroundPermissionsAsync()
    console.log('Foreground Location Permission:', res.status);

    

    while (res.status !== 'granted' && res.canAskAgain) {
      await new Promise(resolve => setTimeout(resolve, 100));
      res = await Location.requestForegroundPermissionsAsync()
      console.log('Foreground Location Permission:', res);
    }

    if (res.status !== 'granted') {
      setForegroundStatus(false)
      return false
    }else{
      setForegroundStatus(true)
      return true
    }

  }
  const handleLocationPermission = async () => {
    console.log('Handling location permission');
    const foregroundGranted = await handleForegroundLocationPermission();
    if (!foregroundGranted) {
      setBackgroundStatus(false)
      return false
    }

    let backgroundPermission = await Location.getBackgroundPermissionsAsync()
    if (backgroundPermission.status === 'granted'){
      setBackgroundStatus(true)
      console.log("PERMISSIONS GOOD")
      return true
    }
    let res = await Location.requestBackgroundPermissionsAsync()
    
    console.log('Location Permission:', res);

    while (res.status !== 'granted' && res.canAskAgain) {
      await new Promise(resolve => setTimeout(resolve, 100));
      res = await Location.requestBackgroundPermissionsAsync()
      console.log('Location Permission:', res);
    }

    if (res.status !== 'granted') {
      setBackgroundStatus(false)
      return false
    }else{
      setBackgroundStatus(true)
      return true
    }

  };

  const startBackgroundStudyMonitoring = async (studyLocation: LocationType) => {
    await AsyncStorage.setItem(ACTIVE_STUDY_LOCATION_KEY, JSON.stringify(studyLocation));

    const geofenceStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
    if (geofenceStarted) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }

    await Location.startGeofencingAsync(GEOFENCE_TASK, [{
      identifier: `study-location-${studyLocation.id}`,
      latitude: studyLocation.gps_lat,
      longitude: studyLocation.gps_long,
      radius: studyLocation.gps_radius,
      notifyOnEnter: false,
      notifyOnExit: true,
    }]);

    const locationUpdatesStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (locationUpdatesStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000,
      distanceInterval: Math.max(Math.min(studyLocation.gps_radius / 2, 250), 25),
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });

    console.log('Background study monitoring started');
  };

  // Function to set initial map region based on user location
  const getMapDeltaForRadius = (radiusMeters?: number) => {
    if (!radiusMeters) return 0.01;
    return Math.min(Math.max((radiusMeters * 4) / 111000, 0.01), 0.16);
  };

  const updateMapRegion = (latitude: number, longitude: number, radiusMeters?: number) => {
    const delta = getMapDeltaForRadius(radiusMeters);
    setMapRegion({
      latitude,
      longitude,
      latitudeDelta: delta,
      longitudeDelta: delta
    });
  };

  // Function to recenter map to user's current location
  const recenterMap = async () => {
    try {
      if (!backgroundStatus || !foregroundStatus) return;
      
      const location = await Location.getCurrentPositionAsync();
      const radius = currentStudyLocation?.gps_radius || data?.org_locations?.[0]?.gps_radius;
      const delta = getMapDeltaForRadius(radius);
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: delta,
        longitudeDelta: delta
      };
      
      // Animate to the new region
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      console.error('Error getting current location for recenter:', error);
    }
  };

  const getStudyLocationGPS = async () => {
    const studyLocations = dashboardState.data?.org_locations || [];

    if (!requiresLocationVerification) {
      const fallbackLocation = studyLocations[0] || null;
      setCurrentStudyLocation(fallbackLocation);
      setNearestLocation(null);
      return {
        studyLocation: fallbackLocation,
        userCoords: null,
      };
    }

    if (studyLocations.length === 0) {
      setCurrentStudyLocation(null);
      setNearestLocation(null);
      return null;
    }

    const permissionsGranted = await handleLocationPermission();
    if (!permissionsGranted) return null;
    const location = await Location.getCurrentPositionAsync();
    console.log('Current location:', location);
    const userCoords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    
    let nearest: NearestLocationInfo | null = null;

    for (const studyLocation of studyLocations) {
      const distance = haversine(
        { latitude: location.coords.latitude, longitude: location.coords.longitude },
        { latitude: studyLocation['gps_lat'], longitude: studyLocation['gps_long'] }
      )
      console.log('Distance to', studyLocation['name'], ':', distance);
      if (!nearest || distance < nearest.distance) {
        nearest = { location: studyLocation, distance };
      }
      if (distance < studyLocation['gps_radius']) {
        setCurrentStudyLocation(studyLocation);
        setNearestLocation({ location: studyLocation, distance });
        updateMapRegion(location.coords.latitude, location.coords.longitude, studyLocation.gps_radius);
        return { studyLocation, userCoords };
      }
    }
    setCurrentStudyLocation(null);
    setNearestLocation(nearest);
    updateMapRegion(location.coords.latitude, location.coords.longitude, nearest?.location.gps_radius);
    return null;
  }

  // --- Navigation Functions ---
  const navigateToAdmin = () => {
    if (subscriptionGate.shouldGateAdmin) {
      subscriptionGate.openPaywall()
      return
    }
    router.push('/(admin)');
  };

  const navigateToStudyLocations = () => {
    if (subscriptionGate.shouldGateAdmin) {
      subscriptionGate.openPaywall()
      return
    }
    router.push('/(admin)/study-locations');
  };

  const openContactSupport = async () => {
    await Linking.openURL(`${API_URL}contact/?topic=Technical%20support`);
  };

  const profileInitials = () => {
    const first = data?.first_name?.[0] || '';
    const last = data?.last_name?.[0] || '';
    return `${first}${last}`.toUpperCase() || data?.email?.[0]?.toUpperCase() || '?';
  };

  // Function to open study locations list
  const openLocationsList = () => {
    setLocationsListVisible(true);
  };



  // --- Clock Related Functions ---
  const clockIn = async () => {
    try {
      let studyLocationResult = await getStudyLocationGPS();
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');

      if (requiresLocationVerification && !studyLocationResult) {
        Alert.alert('No Study Location Found', 'Please go to a study location to clock in.');
        return;
      }
      const { studyLocation, userCoords } = studyLocationResult || { studyLocation: null, userCoords: null };

      // Start Geofence monitoring
      if (requiresLocationVerification && studyLocation) {
        await startBackgroundStudyMonitoring(studyLocation);
      }


      // Send clock-in request to the server
      const payload = requiresLocationVerification
        ? {
            "location_id": studyLocation?.id,
            "latitude": userCoords?.latitude,
            "longitude": userCoords?.longitude,
          }
        : {
            "location_id": studyLocation?.id,
          };

      const response = await axios.post(API_URL + 'api/clockin/', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Emit event to refresh dashboard after clock in
      eventEmitter.emit(EVENTS.DASHBOARD_REFRESH);
      eventEmitter.emit(EVENTS.CLOCK_IN);

    } catch (error) {
      console.log(error);
      if (error instanceof AxiosError && error.response?.status === 401) {
        await handleUnauthorized();
      } else if (error instanceof AxiosError) {
        Alert.alert('Clock In Failed', error.response?.data?.errors?.[0]?.detail || error.response?.data?.detail || 'Unable to clock in.');
      }
    }
  };

  const retryPendingClockOut = async () => {
    const pending = await AsyncStorage.getItem(PENDING_CLOCK_OUT_KEY);
    if (!pending) return;
    const { timestamp } = JSON.parse(pending);
    console.log('[PendingClockOut] retry: attempting clock-out for pending stored at', timestamp);
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      console.log('[PendingClockOut] retry: no token, skipping');
      return;
    }
    try {
      await axios.post(API_URL + 'api/clockout/', { end_time: timestamp }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[PendingClockOut] retry: success — pending cleared with end_time', timestamp);
      await AsyncStorage.removeItem(PENDING_CLOCK_OUT_KEY);
      setPendingClockOut(false);
      eventEmitter.emit(EVENTS.DASHBOARD_REFRESH);
      eventEmitter.emit(EVENTS.CLOCK_OUT);
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        if (error.response.data?.detail === 'You are not clocked in') {
          console.log('[PendingClockOut] retry: session already closed on server — pending cleared');
          await AsyncStorage.removeItem(PENDING_CLOCK_OUT_KEY);
          setPendingClockOut(false);
          eventEmitter.emit(EVENTS.DASHBOARD_REFRESH);
        } else {
          console.log('[PendingClockOut] retry: server error, leaving pending:', error.response.status, error.response.data?.detail);
        }
      } else {
        console.log('[PendingClockOut] retry: still offline — pending remains');
      }
    }
  };

  const clockOut = async () => {
    if (pendingClockOut) return;
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');
      await axios.post(API_URL + 'api/clockout/', {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      eventEmitter.emit(EVENTS.DASHBOARD_REFRESH);
      eventEmitter.emit(EVENTS.CLOCK_OUT);
      await stopBackgroundStudyMonitoring();
    } catch (error) {
      if (error instanceof AxiosError && !error.response) {
        const ts = new Date().toISOString();
        console.log('[PendingClockOut] manual clockOut: network error — storing pending at', ts);
        await AsyncStorage.setItem(PENDING_CLOCK_OUT_KEY, JSON.stringify({ timestamp: ts }));
        setPendingClockOut(true);
        await stopBackgroundStudyMonitoring();
      } else if (error instanceof AxiosError && error.response?.status === 401) {
        await handleUnauthorized();
      } else if (error instanceof AxiosError) {
        Alert.alert('Clock Out Failed', error.response?.data?.errors?.[0]?.detail || error.response?.data?.detail || 'Unable to clock out.');
      }
    }
  }

  const clockOutIfOutsideActiveStudyLocation = async () => {
    try {
      if (!requiresLocationVerification || !checkIsStudying()) return;

      const existingPending = await AsyncStorage.getItem(PENDING_CLOCK_OUT_KEY);
      if (existingPending) {
        console.log('[PendingClockOut] clockOutIfOutside: skipping — pending clock-out already stored');
        setPendingClockOut(true);
        return;
      }

      const activeLocationData = await AsyncStorage.getItem(ACTIVE_STUDY_LOCATION_KEY);
      const openSessions = data?.user_sessions?.filter((session: any) => session.hours === null) || [];
      const latestOpenSession = openSessions[openSessions.length - 1];
      const sessionLocationId = typeof latestOpenSession?.location === 'number'
        ? latestOpenSession.location
        : latestOpenSession?.location?.id;
      const fallbackLocation = data?.org_locations?.find((location: LocationType) => location.id === sessionLocationId);
      const activeLocation = activeLocationData
        ? JSON.parse(activeLocationData) as LocationType
        : fallbackLocation;

      if (!activeLocation) return;

      const location = await Location.getCurrentPositionAsync();
      const distance = haversine(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        {
          latitude: activeLocation.gps_lat,
          longitude: activeLocation.gps_long,
        }
      );

      console.log('Foreground active session distance:', distance);

      if (distance > activeLocation.gps_radius) {
        await clockOut();
      }
    } catch (error) {
      console.log(error);
      if (error instanceof AxiosError && error.response?.status === 401) {
        await handleUnauthorized();
      }
    }
  };

  const submitManualEntry = async () => {
    if (subscriptionGate.shouldGateAdmin) {
      subscriptionGate.openPaywall()
      return
    }

    try {
      const hours = Number(manualHours);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
        Alert.alert('Invalid Hours', 'Enter a number greater than 0 and no more than 24.');
        return;
      }

      const token = await AsyncStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');

      await axios.post(API_URL + 'api/manual-session/', {
        hours,
        start_time: manualStartTime.toISOString(),
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setManualHours('');
      setManualStartTime(new Date());
      setManualEntryVisible(false);
      eventEmitter.emit(EVENTS.DASHBOARD_REFRESH);
      Alert.alert('Study Time Added', 'Your manual study time has been saved.');
    } catch (error) {
      console.log(error);
      if (error instanceof AxiosError && error.response?.status === 401) {
        await handleUnauthorized();
      } else if (error instanceof AxiosError) {
        Alert.alert('Manual Entry Failed', error.response?.data?.errors?.[0]?.detail || error.response?.data?.detail || 'Unable to save manual study time.');
      }
    }
  }

  const clockOutAndRefresh = () => {
    clockOut()
      .then(() => { })
      // No need to call refreshDashboard here as the event will handle it
      .finally(() => refreshClock())
  }

  const handleClock = () => {
    console.log("handleClock")
    if (subscriptionGate.shouldGateAdmin && !checkIsStudying()) {
      subscriptionGate.openPaywall()
      return
    }

    if (!checkIsStudying()) {
      clockIn()
        .then(() => { })
        .finally(() => {
          // No need to call refreshDashboard here as the event will handle it
          refreshClock()
        })
    } else {
      clockOutAndRefresh()
    }
  }

  const getClockTime = () => {
    if (!checkIsStudying()) return 0

    const openSessions = data.user_sessions.filter((session: any) => session.hours === null);
    const latestOpenSession = openSessions[openSessions.length - 1];
    return latestOpenSession ? new Date(latestOpenSession.start_time).getTime() : 0
  }

  const refreshClock = async () => {
    // Wait for dashboard data to be fully loaded
    if (isLoading || !data) return;
    
    try {
      const isCurrentlyStudying = checkIsStudying();
      setIsStudying(isCurrentlyStudying);
      
      // If we're studying, start the stopwatch fresh
      if (isCurrentlyStudying && !isRunning) {
        const startTime = getClockTime();
        start(startTime);
      } else if (!isCurrentlyStudying && isRunning) {
        stop();
        reset();
      }
    } catch (error) {
      console.error("Error refreshing clock:", error);
      setIsStudying(false);
      if (isRunning) {
        stop();
        reset();
      }
    }
  };

  // --- Study Hours Calculation Functions ---
  const requiredHours = () => {
    if (!data?.active_period_setting) return 0;
    return Math.round(data.active_period_setting.required_hours);
  }

  const getActivePeriodInstance = () => {
    if (!data?.org_period_instances) return null;
    return data.org_period_instances.find(
      (instance: any) => instance.is_active
    );
  }

  const hoursStudied = () => {
    if (!data?.user_sessions) return 0;

    const activePeriodInstance = getActivePeriodInstance();

    // If no active period, sum all sessions
    if (!activePeriodInstance) {
      return data.user_sessions.reduce(
        (acc: number, session: any) => acc + (session.hours || 0),
        0
      );
    }

    // Filter and sum sessions for active period
    const periodSessions = data.user_sessions.filter(
      (session: any) =>
        session.period_instance?.id === activePeriodInstance.id
    );

    return periodSessions.reduce(
      (acc: number, session: any) => acc + (session.hours || 0),
      0
    );
  }

  const studyHoursLeft = () => {
    const required = requiredHours();
    const studied = hoursStudied();
    return Math.max(0, required - studied);
  }

  const calculatePercentComplete = () => {
    const required = requiredHours();
    if (required === 0) return 0;

    const studied = hoursStudied();
    return Math.min(Math.round((studied / required) * 100), 100);
  }

  const getActivePeriodInfo = () => {
    if (!data?.active_period_setting || !data?.org_period_instances) return null;

    const activePeriodInstance = data.org_period_instances.find(
      (instance: any) => instance.is_active
    );

    if (!activePeriodInstance) return null;

    // Handle potential timezone issues by ensuring consistent date parsing
    const endDate = new Date(activePeriodInstance.end_date);
    const now = new Date();
    
    // Calculate the difference in milliseconds
    const timeDifference = endDate.getTime() - now.getTime();
    const hoursRemaining = Math.max(0, timeDifference / (1000 * 60 * 60));
    
    // For days calculation, we want to know how many calendar days are left
    // Use UTC calendar dates so the day count is timezone-independent
    const endUTC = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
    const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const daysDifference = (endUTC - nowUTC) / (1000 * 60 * 60 * 24);
    const daysRemaining = Math.max(0, Math.ceil(daysDifference));

    // Show days only if we have more than 24 hours remaining OR if it's due today/tomorrow
    const shouldShowDays = hoursRemaining >= 24 || daysRemaining >= 1;

    const periodSetting = data.active_period_setting;
    let periodDescription = '';

    switch (periodSetting.period_type) {
      case 'weekly':
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        periodDescription = `Weekly period (Due ${days[periodSetting.due_day_of_week]})`;
        break;
      case 'monthly':
        periodDescription = 'Monthly period';
        break;
      case 'custom':
        periodDescription = `${periodSetting.custom_days}-day period`;
        break;
    }

    return {
      description: periodDescription,
      shouldShowDays,
      daysRemaining,
      hoursRemaining: Math.round(hoursRemaining),
      endDate
    };
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1609.34) return `${(meters / 1609.34).toFixed(1)} mi`;
    return `${Math.round(meters)} m`;
  };

  const getLocationStatus = () => {
    const locationCount = data?.org_locations?.length || 0;

    if (maintenanceMode) {
      return {
        tone: 'bg-[#ffdad6] border-[#ffb4ab]',
        icon: 'construct' as const,
        iconColor: '#ba1a1a',
        title: 'Maintenance mode',
        detail: 'Study sessions are temporarily paused by your organization.',
      };
    }

    if (!requiresLocationVerification) {
      return {
        tone: 'bg-gg-bg border-gg-outlineVariant',
        icon: 'shield-checkmark' as const,
        iconColor: '#171d16',
        title: 'Location verification off',
        detail: currentStudyLocation
          ? `Sessions can be started without GPS. Default area: ${currentStudyLocation.name}.`
          : 'Sessions can be started without GPS.',
      };
    }

    if (locationCount === 0) {
      return {
        tone: 'bg-amber-50 border-amber-200',
        icon: 'alert-circle' as const,
        iconColor: '#D97706',
        title: 'No approved study areas yet',
        detail: data?.is_staff
          ? 'Add a study location from Admin before members clock in.'
          : 'Ask an admin to add approved study areas for your organization.',
      };
    }

    if (!foregroundStatus || !backgroundStatus) {
      return {
        tone: 'bg-[#ffdad6] border-[#ffb4ab]',
        icon: 'location' as const,
        iconColor: '#ba1a1a',
        title: 'Location access needed',
        detail: !foregroundStatus
          ? 'Enable location access to verify study sessions.'
          : 'Enable background location so sessions can end when you leave.',
      };
    }

    if (currentStudyLocation) {
      return {
        tone: 'bg-gg-surfaceLow border-gg-outlineVariant',
        icon: 'checkmark-circle' as const,
        iconColor: '#006b2c',
        title: `In ${currentStudyLocation.name}`,
        detail: 'You are inside an approved study area.',
      };
    }

    if (nearestLocation) {
      return {
        tone: 'bg-amber-50 border-amber-200',
        icon: 'navigate-circle' as const,
        iconColor: '#D97706',
        title: 'Outside approved study areas',
        detail: `${nearestLocation.location.name} is ${formatDistance(nearestLocation.distance)} away.`,
      };
    }

    return {
      tone: 'bg-gg-bg border-gg-outlineVariant',
      icon: 'locate' as const,
      iconColor: '#3e4a3d',
      title: 'Checking location',
      detail: 'We are finding the nearest approved study area.',
    };
  };

  const periodInfo = getActivePeriodInfo();
  const locationStatus = getLocationStatus();
  const studiedHours = hoursStudied();
  const required = requiredHours();
  const percentComplete = calculatePercentComplete();
  const hoursLeft = studyHoursLeft();
  const locationPermissionMissing = requiresLocationVerification && (!backgroundStatus || !foregroundStatus);

  // --- Storage Utilities ---
  const getAllAsyncStorageData = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);

      return items;

    } catch (error) {
      console.error('Error getting AsyncStorage data:', error);
      return [];
    }
  };

  const clearAsyncStorage = async () => {
    try {
      await AsyncStorage.clear();
      console.log('AsyncStorage has been cleared!');
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
    }
  };

  // --- Effects ---
  useFocusEffect(
    useCallback(() => {
      console.log('Study screen came into focus - refreshing dashboard');
      refreshDashboard();
      AsyncStorage.getItem(PENDING_CLOCK_OUT_KEY).then(pending => {
        if (pending) {
          console.log('[PendingClockOut] focus: found pending clock-out, retrying');
          setPendingClockOut(true);
          retryPendingClockOut();
        }
      });
      return () => {
        // Cleanup if needed when screen loses focus
      };
    }, [])
  );
  
  useEffect(() => {
    getAllAsyncStorageData();
    
    // Uncomment the next line when you want to clear storage
    //clearAsyncStorage();

    refreshClock();
    //console.log("Dashboard Data:", JSON.stringify(data, null, 2));
  }, [isLoading, data]);

  useEffect(() => {
    const exitHandler = () => {
      clockOutAndRefresh();
    };

    if (!requiresLocationVerification) {
      setBackgroundStatus(true);
      setForegroundStatus(true);
      return;
    }

    // Initial permission check
    handleLocationPermission();
    
    // Initialize map with user location when permissions are available
    if (backgroundStatus && foregroundStatus) {
      Location.getCurrentPositionAsync()
        .then(location => {
          updateMapRegion(location.coords.latitude, location.coords.longitude, data?.org_locations?.[0]?.gps_radius);
        })
        .catch(err => console.error('Error getting current position:', err));
    }
    
    // Set up an interval to check for background permissions until granted
    let permissionCheckInterval: any;
    if (!backgroundStatus || !foregroundStatus) {
      permissionCheckInterval = setInterval(async () => {
        console.log('Checking permission status...');
        const foreground = await Location.getForegroundPermissionsAsync();
        const background = await Location.getBackgroundPermissionsAsync();
        
        console.log('Current permissions - Foreground:', foreground.granted, 'Background:', background.granted);
        
        // If both permissions are granted, clear the interval
        if (foreground.granted && background.granted) {
          console.log('Both permissions granted, stopping interval checks');
          setBackgroundStatus(true);
          setForegroundStatus(true);
          clearInterval(permissionCheckInterval);
        }
      }, 1000); // Check every second
    }
    
    return () => {
      if (permissionCheckInterval) {
        clearInterval(permissionCheckInterval);
      }
      //TaskManager.unregisterTaskAsync(GEOFENCE_TASK);
    };
  }, [backgroundStatus, foregroundStatus, requiresLocationVerification]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
        // App reopened - refresh data and clock
        refreshDashboard();
        refreshClock();
        clockOutIfOutsideActiveStudyLocation();
        AsyncStorage.getItem(PENDING_CLOCK_OUT_KEY).then(pending => {
          if (pending) {
            console.log('[PendingClockOut] foreground: found pending clock-out, retrying');
            setPendingClockOut(true);
            retryPendingClockOut();
          }
        });
      } else if (nextAppState.match(/inactive|background/) && appState === 'active') {
        console.log('App going to background');
        // App going to background - stop the stopwatch
        if (isRunning) {
          stop();
        }
      }
      setAppState(nextAppState);
    });

    

    return () => {
      subscription.remove();
    };
  }, [appState, isRunning, data]);

  // Add effect to check location periodically when not studying
  useEffect(() => {
    if (!isStudying && backgroundStatus && foregroundStatus && !isLoading && requiresLocationVerification) {
      // Update location initially
      getStudyLocationGPS();
      
      // Check location every 30 seconds when not studying
      const locationInterval = setInterval(() => {
        getStudyLocationGPS();
      }, 30000);
      
      return () => clearInterval(locationInterval);
    }
  }, [isStudying, backgroundStatus, foregroundStatus, isLoading, requiresLocationVerification]);

  useEffect(() => {
    if (isStudying && !pendingClockOut && backgroundStatus && foregroundStatus && !isLoading && requiresLocationVerification) {
      const activeSessionLocationInterval = setInterval(() => {
        clockOutIfOutsideActiveStudyLocation();
      }, 30000);

      return () => clearInterval(activeSessionLocationInterval);
    }
  }, [isStudying, pendingClockOut, backgroundStatus, foregroundStatus, isLoading, requiresLocationVerification, data]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        console.log('[PendingClockOut] NetInfo: connectivity restored — attempting retry');
        retryPendingClockOut();
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(TUTORIAL_PROMPT_KEY).then(seen => {
      if (!seen) setShowTutorialPrompt(true);
    });
  }, []);

  const dismissTutorialPrompt = async () => {
    setShowTutorialPrompt(false);
    await AsyncStorage.setItem(TUTORIAL_PROMPT_KEY, 'true');
  };

  const effectiveIsStudying = isStudying && !pendingClockOut;

  if (error && !data) {
    return (
      <ScrollView className="flex-1 p-4">
        <Text className="text-gg-error text-lg font-bold">Error:</Text>
        <Text className="text-gg-error">{JSON.stringify(error, null, 2)}</Text>
      </ScrollView>
    )
  }

  return (
    <SafeAreaView className="bg-gg-surface h-full">
      {maintenanceMode && (
        <View className="bg-red-600 px-4 py-3">
          <Text className="text-white font-psemibold text-center">
            Your organization is temporarily in maintenance mode.
          </Text>
        </View>
      )}
      <View className="flex-row justify-between items-center px-4 py-2 border-b border-gg-outlineVariant bg-gg-surface">
        <View className="flex-1 pr-3">
          <Text className="font-pmedium text-gg-muted text-xs uppercase tracking-wider">
            Study
          </Text>
          <Text className="font-psemibold text-gg-text text-[17px] leading-6" numberOfLines={1}>
            {data?.org?.name || 'Organization'}
          </Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={openContactSupport}
            className="h-9 w-9 rounded-full bg-gg-surfaceLow border border-gg-outlineVariant items-center justify-center mr-2"
            accessibilityLabel="Contact support"
          >
            <Ionicons name="help-circle-outline" size={20} color="#3e4a3d" />
          </TouchableOpacity>
          <View className="h-9 w-9 rounded-full bg-gg-surfaceLow border border-gg-outlineVariant items-center justify-center overflow-hidden">
            {data?.profile_picture_url ? (
              <Image source={{ uri: data.profile_picture_url }} className="h-9 w-9 rounded-full" />
            ) : (
              <Text className="font-pbold text-gg-primary text-sm">
                {profileInitials()}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Main content */}
      <View className="flex-1 flex-col justify-between">
        <ScrollView className="bg-gg-bg" contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="px-4 pt-4">
            {subscriptionGate.shouldGateAdmin && (
              <View className="mb-4">
                <AdminSubscriptionCTA
                  gate={subscriptionGate}
                  message="Start the free trial to add study hours, configure areas, and unlock admin tools."
                />
              </View>
            )}
            <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl overflow-hidden flex-row">
              <View className="w-1 bg-gg-primary" />
              <View className="p-3 flex-1">
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1 pr-3">
                    <Text className="font-pregular text-gg-muted text-xs uppercase tracking-wider mb-1">
                      {effectiveIsStudying ? 'Current session' : 'Study status'}
                    </Text>
                    <Text className="font-psemibold text-gg-primary text-[17px] leading-6">
                      {maintenanceMode ? 'Paused' : pendingClockOut ? 'Syncing...' : effectiveIsStudying ? 'Studying' : 'Ready to study'}
                    </Text>
                    <Text className="font-pregular text-gg-muted text-sm mt-1">
                      {effectiveIsStudying ? currentStudyLocation?.name || 'Session in progress' : locationStatus.title}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-psemibold text-gg-text text-[22px] leading-7">
                      {effectiveIsStudying ? time : `${studiedHours.toFixed(1)}h`}
                    </Text>
                    <Text className="font-pregular text-gg-muted text-xs">
                      {effectiveIsStudying ? 'elapsed' : `${percentComplete}% complete`}
                    </Text>
                  </View>
                </View>

                <View className="mb-3">
                  <View className="bg-gg-surfaceHighest rounded-full h-1 overflow-hidden">
                    <View
                      className="bg-gg-primary h-1 rounded-full"
                      style={{ width: `${Math.min(percentComplete, 100)}%` }}
                    />
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text className="font-pregular text-gg-muted text-xs">
                      {required > 0 ? `${required}h required` : 'No requirement'}
                    </Text>
                    <Text className="font-pregular text-gg-muted text-xs">
                      {periodInfo
                        ? periodInfo.shouldShowDays
                          ? `${periodInfo.daysRemaining}d remaining`
                          : periodInfo.hoursRemaining > 0
                          ? `${periodInfo.hoursRemaining}h remaining`
                          : 'Due now'
                        : 'All study time'}
                    </Text>
                  </View>
                </View>

              {subscriptionGate.shouldGateAdmin && !isStudying ? (
                <TouchableOpacity
                  onPress={subscriptionGate.openPaywall}
                  disabled={subscriptionGate.subscriptionAction === 'paywall'}
                  className={`rounded-lg py-4 items-center bg-gg-primary ${subscriptionGate.subscriptionAction === 'paywall' ? 'opacity-60' : ''}`}
                >
                  <Text className="font-psemibold text-white text-base">
                    Start Free Trial
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={
                    maintenanceMode
                      ? () => Alert.alert('Maintenance Mode', 'Your organization is temporarily in maintenance mode.')
                      : locationPermissionMissing && !isStudying
                      ? showSettingsAlert
                      : handleClock
                  }
                  disabled={(isLoading && !data) || pendingClockOut}
                  className={`rounded-lg py-4 items-center ${effectiveIsStudying ? 'bg-red-600' : 'bg-gg-primary'} ${maintenanceMode || pendingClockOut ? 'opacity-70' : ''}`}
                >
                  <Text className="font-psemibold text-white text-base">
                    {maintenanceMode ? 'Maintenance mode' : pendingClockOut ? 'Syncing...' : effectiveIsStudying ? 'Clock out' : 'Clock in'}
                  </Text>
                </TouchableOpacity>
              )}

              {showTutorialPrompt && (
                <View className="flex-row items-center self-start bg-gg-surfaceLow border border-gg-outlineVariant rounded-full px-3 py-1.5 mb-3">
                  <Ionicons name="help-circle-outline" size={14} color="#6e7b6c" />
                  <TouchableOpacity onPress={() => { setTutorialVisible(true); dismissTutorialPrompt(); }}>
                    <Text className="text-gg-muted text-xs font-pregular mx-2">New here? Quick tour</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={dismissTutorialPrompt} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={13} color="#6e7b6c" />
                  </TouchableOpacity>
                </View>
              )}

              <View className={`mt-3 border rounded-lg p-3 ${locationStatus.tone}`}>
                <View className="flex-row items-start">
                  <Ionicons name={locationStatus.icon} size={20} color={locationStatus.iconColor} />
                  <View className="ml-3 flex-1">
                    <Text className="font-psemibold text-gg-text">
                      {locationStatus.title}
                    </Text>
                    <Text className="font-pregular text-gg-muted text-sm mt-1">
                      {locationStatus.detail}
                    </Text>
                  </View>
                </View>
              </View>
              </View>
            </View>
          </View>

          {locationPermissionMissing && (
            <View className="mx-4 mt-4 p-4 bg-[#ffdad6] rounded-lg border border-[#ffb4ab]">
              <Text className="font-psemibold text-center text-gg-error mb-2">
                Location Permission Required
              </Text>
              <Text
                className="font-pregular text-center text-gg-error text-sm leading-5 mb-3"
                style={{ alignSelf: 'stretch', flexShrink: 1 }}
              >
                {!foregroundStatus
                  ? "Enable location access to verify study sessions."
                  : "Enable background location so sessions end when you leave study areas."}
              </Text>
              <View className="flex items-center">
                <TouchableOpacity
                  onPress={() => { openAppSettings(); }}
                  className="bg-red-600 py-2 px-4 rounded-md"
                >
                  <Text className="font-psemibold text-white text-center">
                    Open Settings
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View className="mt-4 mx-4 rounded-xl overflow-hidden border border-gg-outlineVariant bg-gg-surface shadow-sm">
            <View className="px-4 py-3 border-b border-gg-outlineVariant">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-psemibold text-gg-text text-lg">
                    Approved study areas
                  </Text>
                  <Text className="font-pregular text-gg-muted text-sm">
                    {data?.org_locations?.length || 0} configured
                  </Text>
                </View>
                <View className="flex-row">
                  {data?.is_staff && (
                    <TouchableOpacity
                      onPress={navigateToStudyLocations}
                      className="h-10 w-10 rounded-full bg-gg-primary items-center justify-center mr-2"
                      accessibilityLabel="Manage study locations"
                    >
                      <Ionicons name="add" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={openLocationsList}
                    className="h-10 w-10 rounded-full bg-gg-surfaceContainer items-center justify-center"
                    disabled={!data?.org_locations?.length}
                    accessibilityLabel="View study locations"
                  >
                    <Ionicons name="list" size={20} color="#171d16" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {data?.org_locations?.length === 0 ? (
              <View className="p-5 items-center">
                <View className="h-12 w-12 rounded-full bg-amber-50 items-center justify-center mb-3">
                  <Ionicons name="location-outline" size={24} color="#D97706" />
                </View>
                <Text className="font-psemibold text-gg-text text-center">
                  No approved study areas yet
                </Text>
                <Text className="font-pregular text-gg-muted text-center mt-1">
                  {data?.is_staff
                    ? 'Create one from Admin so members can verify study sessions.'
                    : 'An admin needs to add a study area before clock-in verification can work.'}
                </Text>
                {data?.is_staff && (
                  <TouchableOpacity
                    onPress={navigateToStudyLocations}
                    className="bg-gg-primary rounded-lg px-4 py-3 mt-4"
                  >
                    <Text className="font-psemibold text-white">Create Study Area</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                <View style={{ aspectRatio: 16 / 10, position: 'relative' }}>
                  {mapRegion && (
                    <MapView
                      ref={mapRef}
                      style={{ width: '100%', height: '100%' }}
                      initialRegion={mapRegion}
                      region={mapRegion}
                      showsUserLocation={true}
                      followsUserLocation={false}
                      mapType="standard"
                      zoomEnabled={true}
                      scrollEnabled={true}
                      pitchEnabled={true}
                      rotateEnabled={true}
                    >
                      {data?.org_locations && data.org_locations.map((location: LocationType) => (
                        <Circle
                          key={location.id}
                          center={{
                            latitude: location.gps_lat,
                            longitude: location.gps_long,
                          }}
                          radius={location.gps_radius}
                          strokeColor={
                            currentStudyLocation?.id === location.id
                              ? "rgba(22, 163, 74, 0.9)"
                              : "rgba(17, 24, 39, 0.35)"
                          }
                          strokeWidth={2}
                          fillColor={
                            currentStudyLocation?.id === location.id
                              ? "rgba(22, 163, 74, 0.08)"
                              : "rgba(17, 24, 39, 0.035)"
                          }
                        />
                      ))}
                      {data?.org_locations && data.org_locations.map((location: LocationType) => (
                        <Marker
                          key={`marker-${location.id}`}
                          coordinate={{
                            latitude: location.gps_lat,
                            longitude: location.gps_long,
                          }}
                          title={location.name}
                          description={`${location.gps_radius}m radius`}
                          pinColor={currentStudyLocation?.id === location.id ? '#006b2c' : '#171d16'}
                        />
                      ))}
                    </MapView>
                  )}

                  {mapRegion && backgroundStatus && foregroundStatus && (
                    <TouchableOpacity
                      onPress={recenterMap}
                      className="absolute bottom-3 right-3 bg-gg-surface rounded-full h-10 w-10 items-center justify-center shadow-sm border border-gg-outlineVariant"
                    >
                      <Ionicons name="locate" size={20} color="#006b2c" />
                    </TouchableOpacity>
                  )}

                  {(!mapRegion || !backgroundStatus || !foregroundStatus || !requiresLocationVerification) && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#eef1ed', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
                      <Ionicons
                        name={!requiresLocationVerification ? 'shield-checkmark-outline' : 'map-outline'}
                        size={26}
                        color="#3e4a3d"
                      />
                      <Text className="text-gg-muted font-psemibold text-center mt-2">
                        {!requiresLocationVerification
                          ? "Location verification is disabled"
                          : !backgroundStatus || !foregroundStatus
                          ? "Location permissions required"
                          : "Loading map..."}
                      </Text>
                    </View>
                  )}
                </View>

                <View className="p-3 bg-gg-surface border-t border-gg-outlineVariant">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {data?.org_locations?.map((location: LocationType) => (
                      <TouchableOpacity
                        key={location.id}
                        onPress={openLocationsList}
                        className={`mr-2 px-3 py-2 rounded-full border ${currentStudyLocation?.id === location.id ? 'bg-gg-surfaceLow border-gg-outlineVariant' : 'bg-gg-bg border-gg-outlineVariant'}`}
                      >
                        <Text className={`font-pmedium text-sm ${currentStudyLocation?.id === location.id ? 'text-gg-primary' : 'text-gg-muted'}`}>
                          {location.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </>
            )}
          </View>

          <View className="mx-4 mt-4 flex-row">
            {allowManualEntry && (
              <TouchableOpacity
                onPress={() => subscriptionGate.shouldGateAdmin ? subscriptionGate.openPaywall() : setManualEntryVisible(true)}
                className="flex-1 bg-gg-surface border border-gg-outlineVariant rounded-lg p-3 mr-2 flex-row items-center"
              >
                <Ionicons name="create-outline" size={19} color="#171d16" />
                <Text className="font-psemibold text-gg-text ml-2">Add time</Text>
              </TouchableOpacity>
            )}
            {data?.is_staff && (
              <TouchableOpacity
                onPress={navigateToStudyLocations}
                className="flex-1 bg-gg-surface border border-gg-outlineVariant rounded-lg p-3 flex-row items-center"
              >
                <Ionicons name="settings-outline" size={19} color="#171d16" />
                <Text className="font-psemibold text-gg-text ml-2">Study Areas</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Study Locations List Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={locationsListVisible}
        onRequestClose={() => setLocationsListVisible(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'transparent' }}>
          <View className="bg-gg-surface rounded-t-3xl max-h-3/4">
            <View className="p-4 border-b border-gg-outlineVariant">
              <View className="flex-row justify-between items-center">
                <Text className="text-xl font-psemibold">Study Locations</Text>
                <TouchableOpacity
                  onPress={() => setLocationsListVisible(false)}
                  className="p-2"
                >
                  <Ionicons name="close" size={24} color="#3e4a3d" />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView className="px-4 py-2">
              {data?.org_locations && data.org_locations.map((location: LocationType) => (
                <View
                  key={location.id}
                  className="bg-gg-bg border border-gg-outlineVariant p-4 rounded-lg mb-3"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-psemibold text-lg">{location.name}</Text>
                      {location.gps_address && (
                        <Text className="text-gg-muted text-sm mt-1">
                          {location.gps_address.split(',')[0].trim()}
                        </Text>
                      )}
                      <Text className="text-gg-muted text-xs mt-1">
                        Radius: {location.gps_radius}m
                      </Text>
                      {currentStudyLocation?.id === location.id && (
                        <Text className="text-gg-primary font-psemibold text-xs mt-1">
                          Currently in this area
                        </Text>
                      )}
                    </View>
                    <View className="ml-3">
                      <Ionicons name="location" size={24} color="#3e4a3d" />
                    </View>
                  </View>
                </View>
              ))}
              
              {/* Add some bottom padding for the last item */}
              <View className="h-4" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={manualEntryVisible}
        onRequestClose={() => setManualEntryVisible(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
          <View className="bg-gg-surface rounded-t-3xl p-5">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-psemibold">Add Study Time</Text>
              <TouchableOpacity onPress={() => setManualEntryVisible(false)} className="p-2">
                <Ionicons name="close" size={24} color="#3e4a3d" />
              </TouchableOpacity>
            </View>

            <Text className="text-gg-muted text-xs font-psemibold uppercase tracking-wider mb-2">Date</Text>
            <TouchableOpacity
              onPress={() => { setShowTimePicker(false); setShowDatePicker(true); }}
              className="border border-gg-outline rounded-lg p-3 mb-4 flex-row items-center justify-between"
            >
              <Text className="text-gg-text">
                {manualStartTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
              <Ionicons name="calendar-outline" size={18} color="#3e4a3d" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={manualStartTime}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    const updated = new Date(manualStartTime);
                    updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                    setManualStartTime(updated);
                  }
                }}
              />
            )}

            <Text className="text-gg-muted text-xs font-psemibold uppercase tracking-wider mb-2">Start time</Text>
            <TouchableOpacity
              onPress={() => { setShowDatePicker(false); setShowTimePicker(true); }}
              className="border border-gg-outline rounded-lg p-3 mb-4 flex-row items-center justify-between"
            >
              <Text className="text-gg-text">
                {manualStartTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </Text>
              <Ionicons name="time-outline" size={18} color="#3e4a3d" />
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={manualStartTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  setShowTimePicker(false);
                  if (date) {
                    const updated = new Date(manualStartTime);
                    updated.setHours(date.getHours(), date.getMinutes(), 0, 0);
                    setManualStartTime(updated);
                  }
                }}
              />
            )}

            <Text className="text-gg-muted text-xs font-psemibold uppercase tracking-wider mb-2">Hours studied</Text>
            <TextInput
              value={manualHours}
              onChangeText={setManualHours}
              keyboardType="decimal-pad"
              placeholder="1.5"
              className="border border-gg-outline rounded-lg p-3 text-lg mb-5"
            />
            <TouchableOpacity
              onPress={submitManualEntry}
              className="bg-gg-primary p-4 rounded-lg items-center"
            >
              <Text className="text-white font-psemibold">Save Study Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <OrgPaywallModal gate={subscriptionGate} />
      <TutorialModal
        visible={tutorialVisible}
        onClose={() => { setTutorialVisible(false); dismissTutorialPrompt(); }}
      />
    </SafeAreaView>
  )
}

export default Study
