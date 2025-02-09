import { EventEmitter } from 'events';

const eventBus = new EventEmitter();

export const GEOFENCE_EXIT = 'GEOFENCE_EXIT';

export default eventBus;