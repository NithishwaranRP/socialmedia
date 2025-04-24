# Recaps Social Media App

This project uses the @heygen/streaming-avatar package to integrate HeyGen AI avatars.

## Installation

To install dependencies:

```bash
npm install
# or
yarn install
```

## HeyGen Streaming Avatar Integration

This project uses the official [@heygen/streaming-avatar](https://www.npmjs.com/package/@heygen/streaming-avatar) package to integrate with HeyGen's AI avatar platform.

### Usage Example

```typescript
import { StreamingAvatar } from '@heygen/streaming-avatar';

// Initialize the SDK
const streamingAvatarSdk = new StreamingAvatar({
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'https://api.heygen.com'
});

// Create a session
const avatarSession = await streamingAvatarSdk.createSession({
  avatarName: 'Thaddeus_Black_Suit_public', // Use one of the available avatars
  quality: 'high',
  videoEncoding: 'H264',
  version: 'v2'
});

// Start the session
await streamingAvatarSdk.startSession(
  avatarSession.sessionId,
  avatarSession.sessionToken
);

// Send a message to the avatar
await streamingAvatarSdk.talk(avatarSession.sessionId, "Hello, I'm an AI avatar!");

// Close the session when done
await streamingAvatarSdk.stopSession(avatarSession.sessionId);
```

### Key Features

- Create sessions with different avatars
- Stream high-quality AI avatars
- Send text messages that the avatar will speak
- WebSocket support for real-time interactions

## Running the App

```bash
# For iOS
npx react-native run-ios

# For Android
npx react-native run-android
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
