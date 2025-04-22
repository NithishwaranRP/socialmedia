/**
 * Test utilities for the Interactive Avatar API
 * These functions are useful for debugging and testing the API
 */

// Test WebSocket connection to the Interactive Avatar API
export const testWebSocketConnection = async (
  sessionId: string,
  onMessage: (data: any) => void,
  onOpen?: () => void,
  onError?: (error: any) => void
): Promise<WebSocket> => {
  try {
    const wsUrl = `wss://webrtc-signaling.heygen.io/v2-alpha/interactive-avatar/session/${sessionId}`;
    console.log(`Attempting to connect to WebSocket: ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connection opened');
      if (onOpen) onOpen();
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) onError(error);
    };
    
    ws.onclose = (event) => {
      console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason}`);
    };
    
    return ws;
  } catch (error) {
    console.error('Error creating WebSocket:', error);
    throw error;
  }
};

// Generate a unique event ID
export const generateEventId = (): string => {
  return `event_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};

// Send test audio buffer to the avatar
export const sendTestAudioBuffer = (
  ws: WebSocket,
  audioBase64: string
): void => {
  if (ws.readyState !== WebSocket.OPEN) {
    console.error('WebSocket not open');
    return;
  }
  
  try {
    // Append audio buffer
    ws.send(JSON.stringify({
      type: 'agent.audio_buffer_append',
      event_id: generateEventId(),
      audio: audioBase64
    }));
    
    // Commit the buffer
    ws.send(JSON.stringify({
      type: 'agent.audio_buffer_commit',
      event_id: generateEventId(),
      audio: audioBase64
    }));
    
    console.log('Test audio buffer sent');
  } catch (error) {
    console.error('Error sending test audio buffer:', error);
  }
};

// Send test commands to the avatar
export const sendAvatarCommand = (
  ws: WebSocket,
  commandType: 'start_listening' | 'stop_listening' | 'interrupt' | 'clear_buffer'
): void => {
  if (ws.readyState !== WebSocket.OPEN) {
    console.error('WebSocket not open');
    return;
  }
  
  try {
    ws.send(JSON.stringify({
      type: `agent.${commandType}`,
      event_id: generateEventId()
    }));
    
    console.log(`Command ${commandType} sent to avatar`);
  } catch (error) {
    console.error(`Error sending ${commandType} command:`, error);
  }
};

export default {
  testWebSocketConnection,
  generateEventId,
  sendTestAudioBuffer,
  sendAvatarCommand
}; 