import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

export const useStopWatch = () => {
  // Simple time state in milliseconds
  const [time, setTime] = useState<number>(0);
  // Track if stopwatch is running
  const [isRunning, setIsRunning] = useState<boolean>(false);
  // Track if stopwatch has been started
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  
  // Use refs to track interval and start time
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const elapsedTimeRef = useRef<number>(0);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App is going to background - completely stop the stopwatch
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    });

    // Clean up on unmount
    return () => {
      subscription.remove();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Start the stopwatch
  const start = (startTimestamp?: number) => {
    try {
      // Clear any existing interval to be safe
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Set the start time
      const now = Date.now();
      startTimeRef.current = now;
      
      // If a specific timestamp was provided, calculate initial elapsed time
      if (startTimestamp) {
        const initialTime = now - startTimestamp;
        elapsedTimeRef.current = initialTime;
        setTime(initialTime);
      }
      
      // Start the interval
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const currentTime = Date.now();
          const newTime = currentTime - startTimeRef.current + elapsedTimeRef.current;
          setTime(newTime);
        }
      }, 1000); // Update every second to reduce performance impact
      
      setIsRunning(true);
      setHasStarted(true);
    } catch (error) {
      console.error("Error starting stopwatch:", error);
      // Reset to safe state
      setIsRunning(false);
    }
  };

  // Stop the stopwatch
  const stop = () => {
    try {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      if (startTimeRef.current) {
        elapsedTimeRef.current = time;
        startTimeRef.current = null;
      }
      
      setIsRunning(false);
    } catch (error) {
      console.error("Error stopping stopwatch:", error);
    }
  };

  // Reset the stopwatch
  const reset = () => {
    try {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      startTimeRef.current = null;
      elapsedTimeRef.current = 0;
      setTime(0);
      setIsRunning(false);
      setHasStarted(false);
    } catch (error) {
      console.error("Error resetting stopwatch:", error);
    }
  };

  // Format time for display
  const formatTime = () => {
    const totalSeconds = Math.floor(time / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    time,
    isRunning,
    hasStarted,
    start,
    stop,
    reset,
    formatTime
  };
}; 