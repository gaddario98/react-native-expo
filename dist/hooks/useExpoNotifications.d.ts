import * as Notifications from "expo-notifications";
type NotificationPermissionStatus = "granted" | "denied" | "undetermined";
export interface UseNotificationsReturn {
    expoPushToken: string;
    permissionStatus: NotificationPermissionStatus | null;
    initializeNotifications: (id: string) => Promise<void>;
    sendLocalNotification: (title: string, body: string, data?: Record<string, unknown>) => Promise<void>;
}
interface Props {
    updateToken: (token: string) => Promise<void>;
    setNotification: (notification: Notifications.Notification) => void;
}
export declare const useExpoNotifications: ({ updateToken, setNotification, }: Props) => UseNotificationsReturn;
export {};
