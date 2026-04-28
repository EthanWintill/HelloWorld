import { useState, useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/constants";

export interface PushNotificationState {
  expoPushToken?: Notifications.ExpoPushToken;
  notification?: Notifications.Notification;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldShowAlert: true,
    shouldSetBadge: false,
  }),
});

async function getPushTokenAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return undefined;
  }

  return Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas.projectId,
  });
}

export async function registerPushTokenWithBackend() {
  const token = await AsyncStorage.getItem('accessToken');
  if (!token) {
    return undefined;
  }

  const pushToken = await getPushTokenAsync();
  if (!pushToken?.data) {
    return undefined;
  }

  try {
    await axios.post(
      `${API_URL}api/notifications/token/`,
      {
        device_id: Device.deviceName || Device.modelName || "unknown-device",
        token: pushToken.data,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'dashboardData']);
      return undefined;
    }
    throw error;
  }

  return pushToken;
}

export const usePushNotifications = (): PushNotificationState => {
  const [expoPushToken, setExpoPushToken] = useState<
    Notifications.ExpoPushToken | undefined
  >();

  const [notification, setNotification] = useState<
    Notifications.Notification | undefined
  >();

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerPushTokenWithBackend()
      .then(setExpoPushToken)
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          console.warn("Push notification registration failed:", error.response?.status, error.response?.data);
        } else {
          console.warn("Push notification registration failed:", error);
        }
      });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(response);
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }

      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
  };
};
