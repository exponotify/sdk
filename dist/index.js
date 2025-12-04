"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Exponotify = exports.Push = void 0;
exports.initExponotify = initExponotify;
exports.getExponotify = getExponotify;
exports.useExponotify = useExponotify;
exports.useNotificationOpened = useNotificationOpened;
exports.useNotificationReceived = useNotificationReceived;
const Notifications = __importStar(require("expo-notifications"));
const Device = __importStar(require("expo-device"));
const react_native_1 = require("react-native");
const react_1 = require("react");
// ============================================================================
// Main SDK Class
// ============================================================================
class Exponotify {
    constructor(config) {
        this.token = null;
        this.deviceId = null;
        this.userId = null;
        this.notificationListener = null;
        this.responseListener = null;
        this.isInitialized = false;
        // --------------------------------------------------------------------------
        // Session Tracking
        // --------------------------------------------------------------------------
        this.sessionStartTime = null;
        this.sessionId = null;
        this.apiKey = config.apiKey;
        this.projectId = config.projectId;
        this.baseUrl = config.baseUrl || 'https://exponotify.com/api/v1';
        this.autoTrackOpens = config.autoTrackOpens !== false;
        this.autoTrackDelivered = config.autoTrackDelivered !== false;
        // Configure notification handler
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });
        // Set up notification received listener (for delivered tracking)
        this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
            // Track delivered event
            if (this.autoTrackDelivered) {
                this.trackEvent('notification_delivered', notification.request.content.data);
            }
            // Call user callback
            config.onNotificationReceived?.(notification);
        });
        // Set up notification response listener (for open tracking)
        this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
            // Track click/open event
            if (this.autoTrackOpens) {
                this.trackEvent('notification_clicked', response.notification.request.content.data);
            }
            // Call user callback
            config.onNotificationResponse?.(response);
        });
    }
    // --------------------------------------------------------------------------
    // Device Registration
    // --------------------------------------------------------------------------
    /**
     * Register device for push notifications
     * @param userId - Optional user ID to associate with the device
     * @param attributes - Optional user/device attributes
     */
    async register(userId, attributes) {
        try {
            console.log('[Exponotify] Starting registration...');
            // Check if physical device
            if (!Device.isDevice) {
                console.warn('[Exponotify] Push notifications only work on physical devices');
                return null;
            }
            console.log('[Exponotify] Physical device check passed');
            // Request permissions
            console.log('[Exponotify] Requesting permissions...');
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            console.log('[Exponotify] Existing permission status:', existingStatus);
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
                console.log('[Exponotify] Requested permission status:', status);
            }
            if (finalStatus !== 'granted') {
                console.warn('[Exponotify] Push notification permissions not granted');
                return null;
            }
            // Get Expo push token
            console.log('[Exponotify] Getting push token...');
            const tokenOptions = {};
            if (this.projectId) {
                tokenOptions.projectId = this.projectId;
            }
            const tokenData = await Notifications.getExpoPushTokenAsync(tokenOptions);
            console.log('[Exponotify] Got push token:', tokenData.data?.substring(0, 20) + '...');
            this.token = tokenData.data;
            // Only update userId if a new one is provided (preserve existing from identify())
            if (userId) {
                this.userId = userId;
            }
            // Get device info
            const deviceInfo = {
                token: this.token,
                userId: this.userId, // Use stored userId (from identify() or passed in)
                platform: react_native_1.Platform.OS,
                appVersion: Device.osVersion,
                deviceModel: Device.modelName,
                deviceName: Device.deviceName || Device.modelName,
                osVersion: Device.osVersion,
                sdkVersion: '1.0.0',
                locale: undefined,
                timezone: undefined,
                languageCode: undefined,
                countryCode: undefined,
                isRooted: false,
                carrier: undefined,
                metadata: {},
                userAttributes: attributes || {},
            };
            // Try to get locale and timezone
            try {
                const { getLocales, getCalendars } = await Promise.resolve().then(() => __importStar(require('expo-localization')));
                const locales = getLocales();
                const calendars = getCalendars();
                deviceInfo.locale = locales[0]?.languageTag;
                deviceInfo.timezone = calendars[0]?.timeZone || undefined;
                deviceInfo.languageCode = locales[0]?.languageCode;
                deviceInfo.countryCode = locales[0]?.regionCode;
            }
            catch {
                // expo-localization not available
            }
            // Register with API
            console.log('[Exponotify] Registering with API:', this.baseUrl);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            try {
                const response = await fetch(`${this.baseUrl}/devices/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': this.apiKey,
                    },
                    body: JSON.stringify(deviceInfo),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    let errorMessage = `HTTP ${response.status}`;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    }
                    catch {
                        // Could not parse error JSON
                    }
                    if (response.status === 401) {
                        console.error('[Exponotify] ❌ Authentication failed (401 Unauthorized)\n' +
                            '   Your API key is invalid or not found.\n' +
                            '   Please check:\n' +
                            `   - API Key starts with: ${this.apiKey.substring(0, 12)}...\n` +
                            '   - The key exists in your Exponotify dashboard\n' +
                            '   - The key is active (not revoked)\n' +
                            '   - You\'re using the correct environment (live vs test)');
                    }
                    else if (response.status === 403) {
                        console.error('[Exponotify] ❌ Permission denied (403 Forbidden)\n' +
                            '   Your API key doesn\'t have permission to register devices.\n' +
                            '   Make sure your key has "devices:write" permission.');
                    }
                    else {
                        console.error(`[Exponotify] Registration failed: ${errorMessage}`);
                    }
                    return null;
                }
                const result = await response.json();
                this.deviceId = result.deviceId;
                this.isInitialized = true;
                console.log('[Exponotify] ✅ Device registered successfully:', this.deviceId);
                return this.token;
            }
            catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    console.error('[Exponotify] ❌ Request timed out after 10s\n' +
                        '   Could not reach the Exponotify API.\n' +
                        '   Please check your internet connection.');
                }
                else {
                    console.error('[Exponotify] ❌ Network error\n' +
                        `   ${fetchError.message}\n` +
                        '   Make sure you have internet access.');
                }
                return null;
            }
        }
        catch (error) {
            console.error('[Exponotify] Registration error:', error);
            return null;
        }
    }
    // --------------------------------------------------------------------------
    // User Identification
    // --------------------------------------------------------------------------
    /**
     * Identify a user (call after login, works before push registration)
     * This creates a device record immediately so the user appears in the system.
     * Call register() later to enable push notifications.
     */
    async identify(userId, attributes) {
        this.userId = userId;
        try {
            // Get device info (without push token)
            const deviceInfo = {
                userId: this.userId,
                platform: react_native_1.Platform.OS,
                appVersion: Device.osVersion,
                deviceModel: Device.modelName,
                deviceName: Device.deviceName || Device.modelName,
                osVersion: Device.osVersion,
                sdkVersion: '1.0.0',
                userAttributes: attributes || {},
            };
            // Try to get locale and timezone
            try {
                const { getLocales, getCalendars } = await Promise.resolve().then(() => __importStar(require('expo-localization')));
                const locales = getLocales();
                const calendars = getCalendars();
                deviceInfo.locale = locales[0]?.languageTag;
                deviceInfo.timezone = calendars[0]?.timeZone || undefined;
                deviceInfo.languageCode = locales[0]?.languageCode;
                deviceInfo.countryCode = locales[0]?.regionCode;
            }
            catch {
                // expo-localization not available
            }
            // If we already have a token, include it to update the existing device
            if (this.token) {
                deviceInfo.token = this.token;
            }
            // Register device with API (token is optional - will create tokenless device if not provided)
            const response = await fetch(`${this.baseUrl}/devices/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey,
                },
                body: JSON.stringify(deviceInfo),
            });
            if (!response.ok) {
                console.error('[Exponotify] Failed to identify user:', await response.text());
                return false;
            }
            const result = await response.json();
            this.deviceId = result.deviceId;
            console.log('[Exponotify] ✅ User identified:', userId);
            if (!this.token) {
                console.log('[Exponotify] Call register() when ready to enable push notifications.');
            }
            return true;
        }
        catch (error) {
            console.error('[Exponotify] Error identifying user:', error);
            return false;
        }
    }
    /**
     * Clear user identity (call on logout)
     */
    async logout() {
        this.userId = null;
        // Optionally update device to remove user association
        if (this.token) {
            try {
                await fetch(`${this.baseUrl}/devices/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': this.apiKey,
                    },
                    body: JSON.stringify({
                        token: this.token,
                        userId: null,
                    }),
                });
            }
            catch (error) {
                console.error('[Exponotify] Logout error:', error);
            }
        }
    }
    // --------------------------------------------------------------------------
    // User Attributes
    // --------------------------------------------------------------------------
    /**
     * Update user attributes
     * Works with or without push registration - just needs identify() to be called first
     */
    async setUserAttributes(attributes) {
        // If we have a token, use the device endpoint (links attributes to device)
        if (this.token) {
            try {
                const response = await fetch(`${this.baseUrl}/devices/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': this.apiKey,
                    },
                    body: JSON.stringify({
                        token: this.token,
                        userId: this.userId,
                        userAttributes: attributes,
                    }),
                });
                return response.ok;
            }
            catch (error) {
                console.error('[Exponotify] Error updating attributes:', error);
                return false;
            }
        }
        // No token, but we have a userId - use the users endpoint
        if (this.userId) {
            try {
                const response = await fetch(`${this.baseUrl}/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': this.apiKey,
                    },
                    body: JSON.stringify({
                        userId: this.userId,
                        attributes,
                    }),
                });
                return response.ok;
            }
            catch (error) {
                console.error('[Exponotify] Error updating user attributes:', error);
                return false;
            }
        }
        // Neither token nor userId - can't save attributes
        console.warn('[Exponotify] Cannot set attributes. Call identify() or register() first.');
        return false;
    }
    /**
     * Set user email address
     * Works with or without push registration
     */
    async setEmail(email) {
        return this.setUserAttributes({ email });
    }
    /**
     * Set user phone number (E.164 format preferred)
     * Works with or without push registration
     */
    async setPhoneNumber(phoneNumber) {
        return this.setUserAttributes({ phoneNumber });
    }
    /**
     * Set user location (lat/lng)
     * Works with or without push registration
     */
    async setLocation(latitude, longitude) {
        return this.setUserAttributes({ locationLat: latitude, locationLng: longitude });
    }
    /**
     * Set external user ID (your own user ID system)
     * Works with or without push registration
     */
    async setExternalUserId(externalUserId) {
        return this.setUserAttributes({ externalUserId });
    }
    /**
     * Start tracking a session (call when app becomes active)
     */
    startSession() {
        this.sessionStartTime = Date.now();
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Send session start to server
        if (this.token) {
            this.sendSessionEvent('session_start');
        }
    }
    /**
     * End the current session (call when app goes to background)
     */
    endSession() {
        if (!this.sessionStartTime)
            return;
        const durationSeconds = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        // Send session end to server
        if (this.token && durationSeconds > 0) {
            this.sendSessionEvent('session_end', durationSeconds);
        }
        this.sessionStartTime = null;
        this.sessionId = null;
    }
    async sendSessionEvent(eventType, durationSeconds) {
        try {
            await fetch(`${this.baseUrl}/devices/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey,
                },
                body: JSON.stringify({
                    token: this.token,
                    eventType,
                    sessionId: this.sessionId,
                    durationSeconds,
                    timestamp: new Date().toISOString(),
                }),
            });
        }
        catch (error) {
            console.error('[Exponotify] Error sending session event:', error);
        }
    }
    /**
     * Set a single user attribute
     */
    async setUserAttribute(key, value) {
        return this.setUserAttributes({ [key]: value });
    }
    /**
     * Add tags to the user
     */
    async addTags(tags) {
        return this.setUserAttributes({ tags: JSON.stringify(tags) });
    }
    // --------------------------------------------------------------------------
    // Event Tracking
    // --------------------------------------------------------------------------
    /**
     * Track a notification event
     */
    async trackEvent(eventType, data) {
        try {
            const response = await fetch(`${this.baseUrl.replace('/v1', '')}/events/notification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey,
                },
                body: JSON.stringify({
                    eventType,
                    campaignId: data?.campaignId,
                    queueId: data?.queueId,
                    userId: this.userId,
                    deviceId: this.token, // API will resolve to actual deviceId
                    metadata: data,
                }),
            });
            if (!response.ok) {
                console.warn('[Exponotify] Failed to track event:', eventType);
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('[Exponotify] Error tracking event:', error);
            return false;
        }
    }
    /**
     * Manually track notification open (if autoTrackOpens is disabled)
     */
    async trackOpen(data) {
        return this.trackEvent('notification_clicked', data);
    }
    /**
     * Manually track notification delivered
     */
    async trackDelivered(data) {
        return this.trackEvent('notification_delivered', data);
    }
    // --------------------------------------------------------------------------
    // Unsubscribe
    // --------------------------------------------------------------------------
    /**
     * Unregister device from push notifications
     */
    async unregister() {
        if (!this.token) {
            console.warn('[Exponotify] No token to unregister');
            return false;
        }
        try {
            // Track unsubscribe event
            await this.trackEvent('unsubscribed');
            const response = await fetch(`${this.baseUrl}/devices/unregister`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey,
                },
                body: JSON.stringify({
                    token: this.token,
                }),
            });
            if (response.ok) {
                this.token = null;
                this.deviceId = null;
                this.userId = null;
                console.log('[Exponotify] Device unregistered');
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('[Exponotify] Unregister error:', error);
            return false;
        }
    }
    // --------------------------------------------------------------------------
    // Getters
    // --------------------------------------------------------------------------
    getToken() {
        return this.token;
    }
    getDeviceId() {
        return this.deviceId;
    }
    getUserId() {
        return this.userId;
    }
    isReady() {
        return this.isInitialized && !!this.token;
    }
    // --------------------------------------------------------------------------
    // Cleanup
    // --------------------------------------------------------------------------
    destroy() {
        if (this.notificationListener) {
            this.notificationListener.remove();
        }
        if (this.responseListener) {
            this.responseListener.remove();
        }
    }
}
exports.Exponotify = Exponotify;
// ============================================================================
// React Hooks
// ============================================================================
let sharedInstance = null;
let initPromise = null;
// ============================================================================
// Simple Static API - Dead Simple Usage
// ============================================================================
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
exports.Push = {
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
    init(apiKey) {
        if (sharedInstance) {
            console.log('[Exponotify] Already initialized');
            return;
        }
        sharedInstance = new Exponotify({ apiKey });
        console.log('[Exponotify] Initialized. Call register() to enable push notifications.');
    },
    /**
     * Register for push notifications (requests permission)
     * Call this when the user is ready to enable push notifications
     * @param userId - Optional user ID to associate with the device
     */
    async register(userId) {
        if (!sharedInstance) {
            console.warn('[Exponotify] Not initialized. Call Push.init() first.');
            return null;
        }
        if (sharedInstance.isReady()) {
            console.log('[Exponotify] Already registered');
            return sharedInstance.getToken();
        }
        if (initPromise) {
            return initPromise;
        }
        initPromise = sharedInstance.register(userId);
        const token = await initPromise;
        initPromise = null;
        return token;
    },
    /**
     * Set user attributes
     * @example Push.setUser({ name: 'John', email: 'john@example.com', plan: 'premium' })
     */
    async setUser(attributes) {
        if (!sharedInstance) {
            console.warn('[Exponotify] Not initialized. Call Push.init() first.');
            return false;
        }
        return sharedInstance.setUserAttributes(attributes);
    },
    /**
     * Identify user (call after login)
     * @example Push.identify('user-123', { name: 'John' })
     */
    async identify(userId, attributes) {
        if (!sharedInstance) {
            console.warn('[Exponotify] Not initialized. Call Push.init() first.');
            return false;
        }
        return sharedInstance.identify(userId, attributes);
    },
    /**
     * Add tags to the user
     * @example Push.tag('vip', 'beta-user', 'premium')
     */
    async tag(...tags) {
        if (!sharedInstance) {
            console.warn('[Exponotify] Not initialized. Call Push.init() first.');
            return false;
        }
        return sharedInstance.addTags(tags);
    },
    /**
     * Set a single attribute
     * @example Push.set('country', 'US')
     */
    async set(key, value) {
        if (!sharedInstance) {
            console.warn('[Exponotify] Not initialized. Call Push.init() first.');
            return false;
        }
        return sharedInstance.setUserAttribute(key, value);
    },
    /**
     * Logout current user (keeps device registered)
     */
    async logout() {
        if (sharedInstance) {
            await sharedInstance.logout();
        }
    },
    /**
     * Unsubscribe from push notifications
     */
    async unsubscribe() {
        if (!sharedInstance)
            return false;
        return sharedInstance.unregister();
    },
    /**
     * Get the push token
     */
    getToken() {
        return sharedInstance?.getToken() ?? null;
    },
    /**
     * Check if initialized and registered
     */
    isReady() {
        return sharedInstance?.isReady() ?? false;
    },
};
// ============================================================================
// Original API (for advanced usage)
// ============================================================================
/**
 * Initialize the SDK (call once at app startup)
 */
function initExponotify(config) {
    if (sharedInstance) {
        sharedInstance.destroy();
    }
    sharedInstance = new Exponotify(config);
    initPromise = null;
    return sharedInstance;
}
/**
 * Get the shared SDK instance
 */
function getExponotify() {
    return sharedInstance;
}
/**
 * React hook for push notifications
 */
function useExponotify() {
    const [token, setToken] = (0, react_1.useState)(null);
    const [isRegistered, setIsRegistered] = (0, react_1.useState)(false);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const register = (0, react_1.useCallback)(async (userId, attributes) => {
        if (!sharedInstance) {
            setError(new Error('SDK not initialized. Call initExponotify() first.'));
            return null;
        }
        setIsLoading(true);
        setError(null);
        try {
            const pushToken = await sharedInstance.register(userId, attributes);
            setToken(pushToken);
            setIsRegistered(!!pushToken);
            return pushToken;
        }
        catch (err) {
            setError(err);
            return null;
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    const identify = (0, react_1.useCallback)(async (userId, attributes) => {
        if (!sharedInstance) {
            setError(new Error('SDK not initialized'));
            return false;
        }
        return sharedInstance.identify(userId, attributes);
    }, []);
    const setUserAttribute = (0, react_1.useCallback)(async (key, value) => {
        if (!sharedInstance)
            return false;
        return sharedInstance.setUserAttribute(key, value);
    }, []);
    const unregister = (0, react_1.useCallback)(async () => {
        if (!sharedInstance)
            return false;
        const result = await sharedInstance.unregister();
        if (result) {
            setToken(null);
            setIsRegistered(false);
        }
        return result;
    }, []);
    return {
        token,
        isRegistered,
        isLoading,
        error,
        register,
        identify,
        setUserAttribute,
        unregister,
        instance: sharedInstance,
    };
}
/**
 * Hook to listen for notification opens
 */
function useNotificationOpened(callback) {
    const savedCallback = (0, react_1.useRef)(callback);
    (0, react_1.useEffect)(() => {
        savedCallback.current = callback;
    }, [callback]);
    (0, react_1.useEffect)(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data;
            savedCallback.current(data);
        });
        // Check if app was opened from notification
        Notifications.getLastNotificationResponseAsync().then((response) => {
            if (response) {
                const data = response.notification.request.content.data;
                savedCallback.current(data);
            }
        });
        return () => subscription.remove();
    }, []);
}
/**
 * Hook to listen for notification received (foreground)
 */
function useNotificationReceived(callback) {
    const savedCallback = (0, react_1.useRef)(callback);
    (0, react_1.useEffect)(() => {
        savedCallback.current = callback;
    }, [callback]);
    (0, react_1.useEffect)(() => {
        const subscription = Notifications.addNotificationReceivedListener((notification) => {
            savedCallback.current(notification);
        });
        return () => subscription.remove();
    }, []);
}
// ============================================================================
// Exports
// ============================================================================
exports.default = exports.Push;
//# sourceMappingURL=index.js.map