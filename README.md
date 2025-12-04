# Exponotify SDK

Push notifications for Expo apps. Dead simple.

## Installation

```bash
npm install @exponotify/sdk
```

```bash
npx expo install expo-notifications expo-device
```

## Quick Start (3 lines)

```tsx
import Push from '@exponotify/sdk';

// Initialize (call once on app start)
await Push.init('pk_live_your_api_key');

// That's it! 🎉
```

## With User ID

```tsx
// After user logs in
await Push.init('pk_live_xxx', 'user-123');

// Or identify later
await Push.identify('user-123');
```

## User Attributes

```tsx
// Set multiple attributes
await Push.setUser({
  name: 'John Doe',
  email: 'john@example.com',
  plan: 'premium',
});

// Set single attribute
await Push.set('country', 'US');
```

## Tags

```tsx
// Add tags (great for segmentation)
await Push.tag('vip', 'beta-tester', 'premium');
```

## Full Example

```tsx
// App.tsx
import { useEffect } from 'react';
import Push from '@exponotify/sdk';

export default function App() {
  useEffect(() => {
    // Initialize on app start
    Push.init('pk_live_xxx');
  }, []);

  return <YourApp />;
}

// After login
async function onLogin(user) {
  await Push.identify(user.id, {
    name: user.name,
    email: user.email,
  });
}

// Track user actions
async function onPurchase(plan) {
  await Push.set('plan', plan);
  await Push.tag('paying-customer');
}

// On logout
async function onLogout() {
  await Push.logout();
}
```

## API Reference

| Method | Description |
|--------|-------------|
| `Push.init(apiKey, userId?)` | Initialize and register for push |
| `Push.identify(userId, attrs?)` | Identify user after login |
| `Push.setUser(attributes)` | Set multiple user attributes |
| `Push.set(key, value)` | Set single attribute |
| `Push.tag(...tags)` | Add tags to user |
| `Push.logout()` | Clear user identity |
| `Push.unsubscribe()` | Unregister from push |
| `Push.getToken()` | Get the push token |
| `Push.isReady()` | Check if registered |

## Advanced Usage

For more control, use the class-based API:

```tsx
import { Exponotify, initExponotify, useExponotify } from '@exponotify/sdk';

// Class instance
const client = new Exponotify({ apiKey: 'pk_live_xxx' });
await client.register('user-123');

// React hook
const { register, isRegistered, token } = useExponotify();
```

## Listen for Notification Opens

```tsx
import { useNotificationOpened } from '@exponotify/sdk';

function App() {
  useNotificationOpened((data) => {
    console.log('User opened notification:', data);
    // Handle deep linking
    if (data.deepLink) {
      navigation.navigate(data.deepLink);
    }
  });

  return <YourApp />;
}
```

## License

MIT
