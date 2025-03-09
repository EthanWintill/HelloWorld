// DashboardService.ts
// Utility functions for dashboard operations

import eventEmitter, { EVENTS } from './EventEmitter';

/**
 * Trigger a dashboard refresh from anywhere in the app
 */
export const refreshDashboard = () => {
  console.log('Triggering dashboard refresh via event emitter');
  eventEmitter.emit(EVENTS.DASHBOARD_REFRESH);
};

/**
 * Notify the app that a clock in has occurred
 */
export const notifyClockIn = () => {
  eventEmitter.emit(EVENTS.CLOCK_IN);
};

/**
 * Notify the app that a clock out has occurred
 */
export const notifyClockOut = () => {
  eventEmitter.emit(EVENTS.CLOCK_OUT);
};

/**
 * Subscribe to clock in events
 * @param callback Function to call when a clock in event occurs
 * @returns Unsubscribe function
 */
export const onClockIn = (callback: () => void) => {
  return eventEmitter.subscribe(EVENTS.CLOCK_IN, callback);
};

/**
 * Subscribe to clock out events
 * @param callback Function to call when a clock out event occurs
 * @returns Unsubscribe function
 */
export const onClockOut = (callback: () => void) => {
  return eventEmitter.subscribe(EVENTS.CLOCK_OUT, callback);
};

export default {
  refreshDashboard,
  notifyClockIn,
  notifyClockOut,
  onClockIn,
  onClockOut
}; 