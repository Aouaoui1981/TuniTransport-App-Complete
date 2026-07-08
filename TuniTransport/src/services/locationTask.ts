import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from './api';
import { IS_LIVE } from './supabase';

export const LOCATION_TRACKING_TASK = 'LOCATION_TRACKING';
export const STORAGE_KEY_TRACKING_INFO = '@TuniTransport:tracking_info';

export interface TrackingInfo {
  shipmentId: string;
  transporterId: string;
}

TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }) => {
  if (error) {
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      const location = locations[locations.length - 1]; // Use the most recent point

      if (!IS_LIVE) return;

      try {
        const infoJson = await AsyncStorage.getItem(STORAGE_KEY_TRACKING_INFO);
        if (!infoJson) return;

        const info: TrackingInfo = JSON.parse(infoJson);

        await api.publishShipmentLocation({
          shipmentId: info.shipmentId,
          transporterId: info.transporterId,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          heading:
            location.coords.heading != null && location.coords.heading >= 0
              ? location.coords.heading
              : undefined,
          speed:
            location.coords.speed != null && location.coords.speed >= 0
              ? location.coords.speed
              : undefined,
          accuracy: location.coords.accuracy ?? undefined,
        });
      } catch (err) {
        // Silently fail in background
      }
    }
  }
});
