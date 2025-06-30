// EventEmitter.ts
// A simple event emitter for cross-component communication

type EventCallback = (...args: any[]) => void;

class EventEmitter {
  private events: Record<string, EventCallback[]> = {};

  /**
   * Subscribe to an event
   * @param event The event name to subscribe to
   * @param callback The callback function to execute when the event is emitted
   * @returns A function to unsubscribe from the event
   */
  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    
    this.events[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
      if (this.events[event].length === 0) {
        delete this.events[event];
      }
    };
  }

  /**
   * Emit an event with optional arguments
   * @param event The event name to emit
   * @param args Optional arguments to pass to the callback functions
   */
  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) {
      return;
    }
    
    this.events[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event callback for ${event}:`, error);
      }
    });
  }

  /**
   * Remove all subscriptions for an event
   * @param event The event name to clear
   */
  clear(event: string): void {
    delete this.events[event];
  }

  /**
   * Remove all event subscriptions
   */
  clearAll(): void {
    this.events = {};
  }
}

// Create a singleton instance
const eventEmitter = new EventEmitter();

// Define common event names as constants
export const EVENTS = {
  DASHBOARD_REFRESH: 'dashboard_refresh',
  CLOCK_IN: 'clock_in',
  CLOCK_OUT: 'clock_out',
};

export default eventEmitter; 