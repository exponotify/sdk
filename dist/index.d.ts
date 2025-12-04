import * as Notifications from 'expo-notifications';
export interface ExponotifyConfig {
    apiKey: string;
    /** Expo project ID - optional if configured in app.json */
    projectId?: string;
    baseUrl?: string;
    autoTrackOpens?: boolean;
    autoTrackDelivered?: boolean;
    onNotificationReceived?: (notification: Notifications.Notification) => void;
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void;
}
export interface UserAttributes {
    [key: string]: string | number | boolean | null;
}
export interface NotificationData {
    campaignId?: string;
    queueId?: string;
    deepLink?: string;
    [key: string]: unknown;
}
export type NotificationEventType = 'notification_sent' | 'notification_delivered' | 'notification_clicked' | 'unsubscribed';
declare class Exponotify {
    private apiKey;
    private projectId;
    private baseUrl;
    private token;
    private deviceId;
    private userId;
    private notificationListener;
    private responseListener;
    private autoTrackOpens;
    private autoTrackDelivered;
    private isInitialized;
    constructor(config: ExponotifyConfig);
    /**
     * Register device for push notifications
     * @param userId - Optional user ID to associate with the device
     * @param attributes - Optional user/device attributes
     */
    register(userId?: string, attributes?: UserAttributes): Promise<string | null>;
    /**
     * Identify a user (call after login, works before push registration)
     * This creates a device record immediately so the user appears in the system.
     * Call register() later to enable push notifications.
     */
    identify(userId: string, attributes?: UserAttributes): Promise<boolean>;
    /**
     * Clear user identity (call on logout)
     */
    logout(): Promise<void>;
    /**
     * Update user attributes
     * Works with or without push registration - just needs identify() to be called first
     */
    setUserAttributes(attributes: UserAttributes): Promise<boolean>;
    /**
     * Set user email address
     * Works with or without push registration
     */
    setEmail(email: string): Promise<boolean>;
    /**
     * Set user phone number (E.164 format preferred)
     * Works with or without push registration
     */
    setPhoneNumber(phoneNumber: string): Promise<boolean>;
    /**
     * Set user location (lat/lng)
     * Works with or without push registration
     */
    setLocation(latitude: number, longitude: number): Promise<boolean>;
    /**
     * Set external user ID (your own user ID system)
     * Works with or without push registration
     */
    setExternalUserId(externalUserId: string): Promise<boolean>;
    private sessionStartTime;
    private sessionId;
    /**
     * Start tracking a session (call when app becomes active)
     */
    startSession(): void;
    /**
     * End the current session (call when app goes to background)
     */
    endSession(): void;
    private sendSessionEvent;
    /**
     * Set a single user attribute
     */
    setUserAttribute(key: string, value: string | number | boolean | null): Promise<boolean>;
    /**
     * Add tags to the user
     */
    addTags(tags: string[]): Promise<boolean>;
    /**
     * Track a notification event
     */
    trackEvent(eventType: NotificationEventType, data?: NotificationData): Promise<boolean>;
    /**
     * Manually track notification open (if autoTrackOpens is disabled)
     */
    trackOpen(data: NotificationData): Promise<boolean>;
    /**
     * Manually track notification delivered
     */
    trackDelivered(data: NotificationData): Promise<boolean>;
    /**
     * Unregister device from push notifications
     */
    unregister(): Promise<boolean>;
    getToken(): string | null;
    getDeviceId(): string | null;
    getUserId(): string | null;
    isReady(): boolean;
    destroy(): void;
}
/**
 * Simple static API for Exponotify
 *
 * @example
 * // 1. Initialize (no push permission yet)
 * Push.init('pk_live_xxx');
 *
 * // 2. Identify user and set attributes (works before push!)
 * await Push.identify('user-123', { name: 'John' });
 * await Push.tag('premium', 'fitness-lover');
 * await Push.set('onboardingComplete', true);
 *
 * // 3. Request push permission when ready
 * const token = await Push.register();
 */
export declare const Push: {
    /**
     * Initialize the SDK (does NOT request push permissions)
     * Call this first, then use identify/tag/set, then call register() when ready
     * @param apiKey - Your Exponotify API key
     * @example
     * Push.init('pk_live_xxx');
     * Push.identify('user-123', { name: 'John' });
     * Push.tag('premium');
     * // Later, when ready for push:
     * await Push.register();
     */
    init(apiKey: string): void;
    /**
     * Register for push notifications (requests permission)
     * Call this when the user is ready to enable push notifications
     * @param userId - Optional user ID to associate with the device
     */
    register(userId?: string): Promise<string | null>;
    /**
     * Set user attributes
     * @example Push.setUser({ name: 'John', email: 'john@example.com', plan: 'premium' })
     */
    setUser(attributes: UserAttributes): Promise<boolean>;
    /**
     * Identify user (call after login)
     * @example Push.identify('user-123', { name: 'John' })
     */
    identify(userId: string, attributes?: UserAttributes): Promise<boolean>;
    /**
     * Add tags to the user
     * @example Push.tag('vip', 'beta-user', 'premium')
     */
    tag(...tags: string[]): Promise<boolean>;
    /**
     * Set a single attribute
     * @example Push.set('country', 'US')
     */
    set(key: string, value: string | number | boolean | null): Promise<boolean>;
    /**
     * Logout current user (keeps device registered)
     */
    logout(): Promise<void>;
    /**
     * Unsubscribe from push notifications
     */
    unsubscribe(): Promise<boolean>;
    /**
     * Get the push token
     */
    getToken(): string | null;
    /**
     * Check if initialized and registered
     */
    isReady(): boolean;
};
/**
 * Initialize the SDK (call once at app startup)
 */
export declare function initExponotify(config: ExponotifyConfig): Exponotify;
/**
 * Get the shared SDK instance
 */
export declare function getExponotify(): Exponotify | null;
/**
 * React hook for push notifications
 */
export declare function useExponotify(): {
    token: string | null;
    isRegistered: boolean;
    isLoading: boolean;
    error: Error | null;
    register: (userId?: string, attributes?: UserAttributes) => Promise<string | null>;
    identify: (userId: string, attributes?: UserAttributes) => Promise<boolean>;
    setUserAttribute: (key: string, value: string | number | boolean | null) => Promise<boolean>;
    unregister: () => Promise<boolean>;
    instance: Exponotify | null;
};
/**
 * Hook to listen for notification opens
 */
export declare function useNotificationOpened(callback: (data: NotificationData) => void): void;
/**
 * Hook to listen for notification received (foreground)
 */
export declare function useNotificationReceived(callback: (notification: Notifications.Notification) => void): void;
export default Push;
export { Exponotify };
//# sourceMappingURL=index.d.ts.map