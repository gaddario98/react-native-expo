import { useState, useEffect, useCallback } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

type NotificationPermissionStatus = "granted" | "denied" | "undetermined";

export interface UseNotificationsReturn {
  expoPushToken: string;
  permissionStatus: NotificationPermissionStatus | null;
  initializeNotifications: (id: string) => Promise<void>;
  sendLocalNotification: (
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) => Promise<void>;
}

// Configurazione handler notifiche - spostato fuori dal componente per evitare reinizializzazioni
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface Props {
  updateToken: (token: string) => Promise<void>;
  setNotification: (notification: Notifications.Notification) => void;
}

export const useExpoNotifications = ({
  updateToken,
  setNotification,
}: Props): UseNotificationsReturn => {
  const [expoPushToken, setExpoPushToken] = useState<string>("");
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus | null>(null);

  // Memoizzazione della funzione di registrazione
  const resolvePermissionStatus = useCallback(
    (
      permissions: Notifications.NotificationPermissionsStatus
    ): NotificationPermissionStatus => {
      const { granted, canAskAgain } = permissions as unknown as {
        granted: boolean;
        canAskAgain: boolean;
      };

      if (granted) {
        return "granted";
      }

      return canAskAgain ? "undetermined" : "denied";
    },
    []
  );

  const registerForPushNotificationsAsync = useCallback(async (): Promise<
    string | undefined
  > => {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    if (!Device.isDevice) {
      setPermissionStatus("undetermined");
      return undefined;
    }

    const existingPermissions = await Notifications.getPermissionsAsync();
    const existingStatus = resolvePermissionStatus(existingPermissions);
    const permissions =
      existingStatus === "granted"
        ? existingPermissions
        : await Notifications.requestPermissionsAsync();

    const normalizedStatus = resolvePermissionStatus(permissions);
    setPermissionStatus(normalizedStatus);

    if (normalizedStatus !== "granted") {
      return undefined;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    });

    return token;
  }, [resolvePermissionStatus]);

  // Memoizzazione della funzione di salvataggio token
  const saveTokenToFirestore = useCallback(
    async (token: string): Promise<void> => {
      try {
        await updateToken(token);
      } catch (error) {
        throw new Error("Failed to save token to Firestore " + error);
      }
    },
    [updateToken]
  );

  // Memoizzazione della funzione di inizializzazione
  const initializeNotifications = useCallback(
    async (id: string): Promise<void> => {
      if (Platform.OS === "web") return;
      try {
        //  if (getAuth()?.currentuser?.Id) return;
        const token = await registerForPushNotificationsAsync();
        if (token) {
          setExpoPushToken(token);
          await saveTokenToFirestore(token);
        }
      } catch (error) {
        throw new Error("Failed to initialize notifications: " + error);
      }
    },
    [registerForPushNotificationsAsync, saveTokenToFirestore]
  );

  // Memoizzazione della funzione di invio notifica locale
  const sendLocalNotification = useCallback(
    async (
      title: string,
      body: string,
      data: Record<string, unknown> = {}
    ): Promise<void> => {
      try {
        await Notifications.scheduleNotificationAsync({
          content: { title, body, data },
          trigger: null,
        });
      } catch (error) {
        throw new Error("Error sending local notification: " + error);
      }
    },
    []
  );

  useEffect(() => {
    const notificationListener =
      Notifications.addNotificationReceivedListener(setNotification);

    const responseListener =
      Notifications.addNotificationResponseReceivedListener(
        (_: Notifications.NotificationResponse) => {
          //
        }
      );

    // Cleanup function
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [setNotification]);

  return {
    expoPushToken,
    permissionStatus,
    initializeNotifications,
    sendLocalNotification,
  };
};
