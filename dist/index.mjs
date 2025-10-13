import { useState, useCallback, useEffect } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurazione handler notifiche - spostato fuori dal componente per evitare reinizializzazioni
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});
const useExpoNotifications = ({ updateToken, setNotification, }) => {
    const [expoPushToken, setExpoPushToken] = useState("");
    const [permissionStatus, setPermissionStatus] = useState(null);
    // Memoizzazione della funzione di registrazione
    const registerForPushNotificationsAsync = useCallback(async () => {
        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync("default", {
                name: "default",
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: "#FF231F7C",
            });
        }
        if (!Device.isDevice) {
            return undefined;
        }
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        const finalStatus = existingStatus !== "granted"
            ? (await Notifications.requestPermissionsAsync()).status
            : existingStatus;
        setPermissionStatus(finalStatus);
        if (finalStatus !== "granted") {
            return undefined;
        }
        const { data: token } = await Notifications.getExpoPushTokenAsync({
            projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
        });
        return token;
    }, []);
    // Memoizzazione della funzione di salvataggio token
    const saveTokenToFirestore = useCallback(async (token) => {
        try {
            await updateToken(token);
        }
        catch (error) {
            throw new Error("Failed to save token to Firestore " + error);
        }
    }, [updateToken]);
    // Memoizzazione della funzione di inizializzazione
    const initializeNotifications = useCallback(async (id) => {
        if (Platform.OS === "web")
            return;
        try {
            //  if (getAuth()?.currentuser?.Id) return;
            const token = await registerForPushNotificationsAsync();
            if (token) {
                setExpoPushToken(token);
                await saveTokenToFirestore(token);
            }
        }
        catch (error) {
            throw new Error("Failed to initialize notifications: " + error);
        }
    }, [registerForPushNotificationsAsync, saveTokenToFirestore]);
    // Memoizzazione della funzione di invio notifica locale
    const sendLocalNotification = useCallback(async (title, body, data = {}) => {
        try {
            await Notifications.scheduleNotificationAsync({
                content: { title, body, data },
                trigger: null,
            });
        }
        catch (error) {
            throw new Error("Error sending local notification: " + error);
        }
    }, []);
    useEffect(() => {
        const notificationListener = Notifications.addNotificationReceivedListener(setNotification);
        const responseListener = Notifications.addNotificationResponseReceivedListener((_) => {
            //
        });
        // Cleanup function
        return () => {
            Notifications.removeNotificationSubscription(notificationListener);
            Notifications.removeNotificationSubscription(responseListener);
        };
    }, [setNotification]);
    return {
        expoPushToken,
        permissionStatus,
        initializeNotifications,
        sendLocalNotification,
    };
};

export { useExpoNotifications };
//# sourceMappingURL=index.mjs.map
