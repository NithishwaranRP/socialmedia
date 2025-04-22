# Interactive Avatar Implementation

This directory contains components for implementing HeyGen's Interactive Avatar Realtime API in the Recaps app.

## Components

### InteractiveAvatarScreen

The main component that implements the Interactive Avatar Realtime API. This component:

- Establishes WebSocket connection to HeyGen's Interactive Avatar API
- Handles voice recognition and converts it to audio for the avatar
- Processes WebSocket events for avatar state management
- Provides a draggable, minimizable UI for the avatar

## API Implementation Details

The Interactive Avatar API is implemented following HeyGen's documentation:

### WebSocket Connection

The component establishes a WebSocket connection to:
```
wss://webrtc-signaling.heygen.io/v2-alpha/interactive-avatar/session/<session_id>
```

### Event-Based Communication

All communication with the avatar happens through event-based messages:

```javascript
{
  "type": "<event_type>",
  "event_id": "<event_id>"
}
```

### Supported Events

The component implements the following API events:

#### Sending to the Avatar:

- **agent.audio_buffer_append**: Append audio data to the avatar's buffer
- **agent.audio_buffer_commit**: Commit audio for processing
- **agent.audio_buffer_clear**: Clear buffered audio
- **agent.interrupt**: Stop current task and reset to idle
- **agent.start_listening**: Trigger listening animation
- **agent.stop_listening**: Stop listening animation

#### Receiving from the Avatar:

- **agent.ready**: Avatar is ready for interaction
- **agent.speaking**: Avatar is speaking
- **agent.idle**: Avatar is idle

## Audio Processing

The implementation converts speech recognition results to audio data suitable for the avatar:

1. Text from speech recognition is processed using the `speechRecognitionToAudio` utility
2. The resulting audio (PCM 16-bit, 24kHz) is encoded as base64
3. Audio is sent to the avatar using the appropriate WebSocket events

## Usage in App

The InteractiveAvatar can be launched via a floating button in the app. The avatar appears in a draggable window that can be:

- Minimized to a small icon
- Dragged to any position on screen
- Closed completely

## Integration with Pipecat

For full speech-to-speech capabilities, this implementation can be extended to integrate with Pipecat:

1. Set up a Pipecat server following HeyGen's demo: https://github.com/HeyGen-Official/pipecat-realtime-demo
2. Connect the frontend to the Pipecat server for audio processing
3. Route the processed audio to the Interactive Avatar API

## References

- [HeyGen Interactive Avatar API Documentation](https://docs.heygen.com/reference/interactive-avatar-realtime-api)
- [NextJS Demo](https://github.com/HeyGen-Official/InteractiveAvatarNextJSDemo/tree/realtime-alpha-demo)
- [Pipecat Demo](https://github.com/HeyGen-Official/pipecat-realtime-demo) 