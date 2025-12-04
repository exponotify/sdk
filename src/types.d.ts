// Type declarations for peer dependencies
// These are provided by the host app

declare module 'react-native' {
  export const Platform: {
    OS: 'ios' | 'android' | 'web';
    select: <T>(specifics: { ios?: T; android?: T; default?: T }) => T;
  };
  
  export type AppStateStatus = 'active' | 'background' | 'inactive';
  
  export const AppState: {
    currentState: AppStateStatus;
    addEventListener: (type: string, handler: (state: AppStateStatus) => void) => { remove: () => void };
  };
}

declare module 'expo-notifications' {
  export interface Notification {
    request: {
      content: {
        title: string | null;
        body: string | null;
        data: Record<string, unknown>;
      };
    };
  }

  export interface NotificationResponse {
    notification: Notification;
    actionIdentifier: string;
  }

  export interface Subscription {
    remove: () => void;
  }

  export interface PermissionResponse {
    status: 'granted' | 'denied' | 'undetermined';
  }

  export interface ExpoPushToken {
    data: string;
    type: 'expo';
  }

  export function setNotificationHandler(handler: {
    handleNotification: () => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
    }>;
  }): void;

  export function addNotificationReceivedListener(
    listener: (notification: Notification) => void
  ): Subscription;

  export function addNotificationResponseReceivedListener(
    listener: (response: NotificationResponse) => void
  ): Subscription;

  export function getPermissionsAsync(): Promise<PermissionResponse>;
  
  export function requestPermissionsAsync(): Promise<PermissionResponse>;

  export function getExpoPushTokenAsync(options?: {
    projectId?: string;
  }): Promise<ExpoPushToken>;

  export function getLastNotificationResponseAsync(): Promise<NotificationResponse | null>;
}

declare module 'expo-device' {
  export const isDevice: boolean;
  export const modelName: string | null;
  export const osVersion: string | null;
}

declare module 'expo-localization' {
  export function getLocales(): Array<{ languageTag: string }>;
  export function getCalendars(): Array<{ timeZone: string | null }>;
}

