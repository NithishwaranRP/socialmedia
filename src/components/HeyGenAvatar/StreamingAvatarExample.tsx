import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { StreamingAvatar } from '@heygen/streaming-avatar';

// Example config (replace with your real API key)
const API_CONFIG = {
  apiKey: 'YOUR_API_KEY',
  serverUrl: 'https://api.heygen.com',
};

const StreamingAvatarExample: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<any>(null);

  const createAvatarSession = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize the SDK
      const streamingAvatarSdk = new StreamingAvatar({
        apiKey: API_CONFIG.apiKey,
        baseUrl: API_CONFIG.serverUrl
      });

      // Create a session
      const avatarSession = await streamingAvatarSdk.createSession({
        avatarName: 'Thaddeus_Black_Suit_public', // Use one of the available avatars
        quality: 'high',
        videoEncoding: 'H264',
        version: 'v2'
      });

      if (avatarSession) {
        // Save session info
        setSessionId(avatarSession.sessionId);
        setAvatar(streamingAvatarSdk);

        // Start the session
        await streamingAvatarSdk.startSession(
          avatarSession.sessionId,
          avatarSession.sessionToken
        );

        // Now you can send messages to the avatar
        console.log('Session created successfully', avatarSession.sessionId);
      }
    } catch (error) {
      console.error('Error creating avatar session:', error);
      setError('Failed to create avatar session');
    } finally {
      setLoading(false);
    }
  };

  const sendMessageToAvatar = async () => {
    if (!avatar || !sessionId) {
      setError('No active avatar session');
      return;
    }

    try {
      setLoading(true);
      
      // Send a message to the avatar
      await avatar.talk(sessionId, "Hello! I'm your AI assistant. How can I help you today?");
      
      console.log('Message sent to avatar');
    } catch (error) {
      console.error('Error sending message to avatar:', error);
      setError('Failed to send message to avatar');
    } finally {
      setLoading(false);
    }
  };

  const closeAvatarSession = async () => {
    if (!avatar || !sessionId) {
      return;
    }

    try {
      await avatar.stopSession(sessionId);
      setSessionId(null);
      setAvatar(null);
      console.log('Session closed');
    } catch (error) {
      console.error('Error closing session:', error);
    }
  };

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (sessionId && avatar) {
        closeAvatarSession();
      }
    };
  }, [sessionId, avatar]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Streaming Avatar Example</Text>
      
      {loading && (
        <ActivityIndicator size="large" color="#0000ff" />
      )}
      
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}
      
      {!sessionId ? (
        <Button 
          title="Create Avatar Session" 
          onPress={createAvatarSession}
          disabled={loading}
        />
      ) : (
        <View>
          <Text style={styles.sessionText}>
            Session ID: {sessionId}
          </Text>
          
          <View style={styles.buttonContainer}>
            <Button 
              title="Send Test Message" 
              onPress={sendMessageToAvatar}
              disabled={loading}
            />
            
            <Button 
              title="Close Session" 
              onPress={closeAvatarSession}
              disabled={loading}
              color="#ff0000"
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  error: {
    color: 'red',
    marginVertical: 10,
  },
  sessionText: {
    marginVertical: 10,
  },
  buttonContainer: {
    marginTop: 20,
    width: '100%',
  },
});

export default StreamingAvatarExample; 