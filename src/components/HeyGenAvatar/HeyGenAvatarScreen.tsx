import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  PermissionsAndroid,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { registerGlobals } from '@livekit/react-native';
import {
  LiveKitRoom,
  AudioSession,
  VideoTrack,
  useTracks,
  isTrackReference,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { FONTS } from '../../constants/Fonts';
import { Colors, useThemeColors } from '../../constants/Colors';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice from '@react-native-voice/voice';
import LinearGradient from 'react-native-linear-gradient';
import { useAvatarPopup } from '../../context/AvatarPopupContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Register LiveKit globals
registerGlobals();

// HeyGen API configuration
const API_CONFIG = {
  apiKey: 'NzViZDY4YjU2MjVkNDMzNGE0NDIzY2U5NDQ0ZGIyMWQtMTczODgyNTI2NA==', // Replace with your actual API key
  serverUrl: 'https://api.heygen.com',
};

// Storage key for saving position
const POSITION_STORAGE_KEY = 'heygen_avatar_position';

// Custom ChromaKey Video Track component
interface ChromaKeyVideoProps {
  trackRef: any;
}

const ChromaKeyVideoTrack: React.FC<ChromaKeyVideoProps> = ({ trackRef }) => {
  return (
    <View style={styles.chromaKeyWrapper}>
      {/* Dark vignette overlay to help blend the avatar */}
      <View style={styles.vignette} />
      
      {/* Custom styled video track for chroma key effect */}
      <VideoTrack
        style={styles.chromaKeyVideo}
        trackRef={trackRef}
        objectFit="cover"
      />
    </View>
  );
};

interface HeyGenAvatarScreenProps {
  onDismiss?: () => void;
}

const HeyGenAvatarScreen: React.FC<HeyGenAvatarScreenProps> = ({ onDismiss }) => {
  const colors = useThemeColors();
  const { isLoading: globalLoading, setIsLoading: setGlobalLoading, directInitSession, setDirectInitSession } = useAvatarPopup();
  const [wsUrl, setWsUrl] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const [text, setText] = useState('');
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [minimized, setMinimized] = useState(false);
  
  // For draggable functionality
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);
  
  // Get screen dimensions and handle changes
  const [dimensions, setDimensions] = useState({
    windowWidth: Dimensions.get('window').width,
    windowHeight: Dimensions.get('window').height,
  });
  
  // Calculate limits to keep popup on screen
  const popupWidth = 300; // width from styles
  const popupHeight = 400; // height from styles
  
  // Load saved position on initial render
  useEffect(() => {
    const loadSavedPosition = async () => {
      try {
        const savedPosition = await AsyncStorage.getItem(POSITION_STORAGE_KEY);
        if (savedPosition) {
          const { x, y } = JSON.parse(savedPosition);
          pan.setValue({ x, y });
        }
      } catch (error) {
        console.error('Error loading saved position:', error);
      }
    };
    
    loadSavedPosition();
  }, []);
  
  // Get screen dimensions and handle changes
  useEffect(() => {
    // Handler for dimension changes
    const onChange = ({ window }: { window: { width: number; height: number } }) => {
      const { width, height } = window;
      setDimensions({ windowWidth: width, windowHeight: height });
      
      // Adjust position if out of bounds after dimension change
      const currentX = (pan.x as any)._value;
      const currentY = (pan.y as any)._value;
      const newX = Math.max(-(width - popupWidth), Math.min(0, currentX));
      const newY = Math.max(0, Math.min(height - popupHeight, currentY));
      
      if (currentX !== newX || currentY !== newY) {
        Animated.spring(pan, {
          toValue: { x: newX, y: newY },
          useNativeDriver: false,
          friction: 5
        }).start();
        
        // Save adjusted position
        try {
          AsyncStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({ x: newX, y: newY }));
        } catch (error) {
          console.error('Error saving position:', error);
        }
      }
    };
    
    // Subscribe to dimension changes
    const subscription = Dimensions.addEventListener('change', onChange);
    
    // Clean up subscription
    return () => subscription.remove();
  }, []);
  
  // PanResponder for handling drag gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
        // Save the current position as offset
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value
        });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        setIsDragging(false);
        // Keep popup within screen bounds
        const newX = Math.max(-(dimensions.windowWidth - popupWidth), Math.min(0, (pan.x as any)._value));
        const newY = Math.max(0, Math.min(dimensions.windowHeight - popupHeight, (pan.y as any)._value));
        
        // Animate to adjusted position if needed
        Animated.spring(pan, {
          toValue: { x: newX, y: newY },
          useNativeDriver: false,
          friction: 5
        }).start();
        
        pan.flattenOffset();
        
        // Save position for future sessions
        try {
          AsyncStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({ x: newX, y: newY }));
        } catch (error) {
          console.error('Error saving position:', error);
        }
      }
    })
  ).current;

  // Start audio session on component mount
  useEffect(() => {
    const setupAudio = async () => {
      await AudioSession.startAudioSession();
    };

    setupAudio();
    return () => {
      AudioSession.stopAudioSession();
      // Close session when component unmounts
      if (connected) {
        closeSession();
      }
    };
  }, []);

  // Effect to handle direct session initialization
  useEffect(() => {
    if (directInitSession && !connected && !loading) {
      // Auto-start session
      createSession();
      // Reset the flag after initiating
      setDirectInitSession(false);
    }
  }, [directInitSession]);

  // Voice recognition setup
  useEffect(() => {
    // Initialize voice recognition
    Voice.onSpeechStart = () => {
      console.log('Speech started');
    };
    
    Voice.onSpeechRecognized = () => {
      console.log('Speech recognized');
    };
    
    Voice.onSpeechEnd = () => {
      console.log('Speech ended');
      setIsListening(false);
    };
    
    Voice.onSpeechError = (error) => {
      console.error('Speech error:', error);
      setIsListening(false);
      if (error.error?.message) {
        setError(`Microphone error: ${error.error.message}`);
      }
    };
    
    Voice.onSpeechResults = (result) => {
      if (result.value && result.value.length > 0) {
        const recognizedText = result.value[0];
        console.log('Speech result:', recognizedText);
        
        // Don't auto-send if session is not valid
        if (!sessionId || !sessionToken || !connected) {
          console.log('Cannot process voice input - no active session');
          setText(recognizedText); // Just update text input with recognized text
          setError('Session not active. Please restart and try again.');
          return;
        }
        
        // Set the text in the input field
        setText(recognizedText);
        
        // Automatically send text if we get a valid result
        if (recognizedText.trim().length > 0) {
          // Auto-send immediately when we get a result
          console.log('Auto-sending recognized text');
          // Double-check session validity right before sending
          if (sessionId && sessionToken && connected) {
            sendRecognizedText(recognizedText);
          } else {
            console.log('Session became invalid before sending');
            setError('Session became inactive. Please restart and try again.');
          }
        }
      }
    };
    
    // Request microphone permission on Android
    const requestMicrophonePermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'Recaps needs access to your microphone to enable voice chat.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Microphone permission granted');
            setMicPermissionGranted(true);
          } else {
            console.log('Microphone permission denied');
            setMicPermissionGranted(false);
            setError('Microphone permission denied. Voice input unavailable.');
          }
        } catch (err) {
          console.error('Error requesting microphone permission:', err);
          setError('Error requesting microphone permission');
        }
      } else {
        // iOS handles permissions differently
        setMicPermissionGranted(true);
      }
    };
    
    requestMicrophonePermission();
    
    // Cleanup function
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [sessionId, sessionToken, connected]);

  // Get session token from HeyGen API
  const getSessionToken = async () => {
    try {
      const response = await fetch(
        `${API_CONFIG.serverUrl}/v1/streaming.create_token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': API_CONFIG.apiKey,
          },
        }
      );

      const data = await response.json();
      console.log('Session token obtained', data.data.token);
      return data.data.token;
    } catch (error) {
      console.error('Error getting session token:', error);
      setError('Failed to get session token. Please try again.');
      throw error;
    }
  };

  // Start the streaming session
  const startStreamingSession = async (
    sessionId: string,
    sessionToken: string
  ) => {
    try {
      console.log('Starting streaming session with:', {
        sessionId,
        sessionToken,
      });
      const startResponse = await fetch(
        `${API_CONFIG.serverUrl}/v1/streaming.start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
          }),
        }
      );

      const startData = await startResponse.json();
      console.log('Streaming start response:', startData);

      if (startData) {
        setConnected(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error starting streaming session:', error);
      setError('Failed to start streaming session. Please try again.');
      return false;
    }
  };

  // Send recognized text to avatar
  const sendRecognizedText = async (recognizedText: string) => {
    if (!recognizedText.trim()) return;
    
    try {
      // Capture current session state at the beginning of the function
      const currentSessionId = sessionId;
      const currentSessionToken = sessionToken;
      const isConnected = connected;
      
      // Check if session is still valid
      if (!currentSessionId || !currentSessionToken || !isConnected) {
        console.log('Session is not valid, cannot send text');
        setError('Session has expired. Please restart the conversation.');
        return false;
      }
      
      setSpeaking(true);
      setError(null);

      console.log('Sending recognized text to API:', {
        sessionId: currentSessionId,
        text: recognizedText
      });
      
      // Send task request
      const response = await fetch(
        `${API_CONFIG.serverUrl}/v1/streaming.task`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSessionToken}`,
          },
          body: JSON.stringify({
            session_id: currentSessionId,
            text: recognizedText,
            task_type: 'talk',
          }),
        }
      );

      const data = await response.json();
      console.log('Task response:', data);
      
      // Check for unauthorized errors
      if (data.code === 400112 || data.code === 10005) {
        console.log('Session error detected:', data.message);
        setError(`Session error: ${data.message}. Please restart the conversation.`);
        // Mark session as disconnected to prevent further attempts
        setConnected(false);
        return false;
      }
      
      setText(''); // Clear input after sending
      return true;
    } catch (error) {
      console.error('Error sending text:', error);
      setError('Failed to send text to avatar. Please try again.');
      return false;
    } finally {
      setSpeaking(false);
    }
  };

  // Send text to the avatar
  const sendText = async () => {
    if (!text.trim()) return;
    
    try {
      // Capture current session state at the beginning of the function
      const currentSessionId = sessionId;
      const currentSessionToken = sessionToken;
      const isConnected = connected;
      const textToSend = text; // Capture current text to prevent race conditions
      
      // Check if session is still valid
      if (!currentSessionId || !currentSessionToken || !isConnected) {
        console.log('Session is not valid, cannot send text');
        setError('Session has expired. Please restart the conversation.');
        return false;
      }
      
      setSpeaking(true);
      setError(null);

      console.log('Sending text to API:', {
        sessionId: currentSessionId,
        text: textToSend
      });
      
      // Send task request
      const response = await fetch(
        `${API_CONFIG.serverUrl}/v1/streaming.task`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSessionToken}`,
          },
          body: JSON.stringify({
            session_id: currentSessionId,
            text: textToSend,
            task_type: 'talk',
          }),
        }
      );

      const data = await response.json();
      console.log('Task response:', data);
      
      // Check for unauthorized errors
      if (data.code === 400112 || data.code === 10005) {
        console.log('Session error detected:', data.message);
        setError(`Session error: ${data.message}. Please restart the conversation.`);
        // Mark session as disconnected to prevent further attempts
        setConnected(false);
        return false;
      }
      
      setText(''); // Clear input after sending
      return true;
    } catch (error) {
      console.error('Error sending text:', error);
      setError('Failed to send text to avatar. Please try again.');
      return false;
    } finally {
      setSpeaking(false);
    }
  };

  // Create a new session with additional capabilities
  const createSession = async () => {
    try {
      setLoading(true);
      setGlobalLoading(true);
      setError(null);
      
      // Reset any existing session
      if (connected) {
        await closeSession();
      }
      
      console.log('Creating new HeyGen session with voice capabilities...');
      
      // Get new session token
      const newSessionToken = await getSessionToken();
      console.log('Got session token:', newSessionToken ? 'success' : 'failed');
      setSessionToken(newSessionToken);

      const response = await fetch(`${API_CONFIG.serverUrl}/v1/streaming.new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newSessionToken}`,
        },
        body: JSON.stringify({
          quality: 'high',
          avatar_name: 'Katya_Black_Suit_public',
          voice: {
            voice_id: '',
          },
          version: 'v2',
          video_encoding: 'H264',
        }),
      });

      const data = await response.json();
      console.log('Streaming new response:', data);

      if (data.data) {
        const newSessionId = data.data.session_id;
        console.log('New session created with ID:', newSessionId);
        
        // Set all session data
        setSessionId(newSessionId);
        setWsUrl(data.data.url);
        setToken(data.data.access_token);

        // Connect WebSocket
        const params = new URLSearchParams({
          session_id: newSessionId,
          session_token: newSessionToken,
          silence_response: 'false',
          stt_language: 'en',
        });

        const wsUrl = `wss://${
          new URL(API_CONFIG.serverUrl).hostname
        }/v1/ws/streaming.chat?${params}`;

        console.log('Connecting to WebSocket...');
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('WebSocket connection established');
        };
        
        ws.onclose = () => {
          console.log('WebSocket connection closed');
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
        
        setWebSocket(ws);

        // Start streaming session with the new IDs
        console.log('Starting streaming session...');
        const success = await startStreamingSession(newSessionId, newSessionToken);
        
        if (!success) {
          console.error('Failed to start streaming session');
          setError('Failed to start streaming session. Please try again.');
          return;
        }
        
        console.log('Session created and started successfully');
      } else {
        console.error('Failed to create session:', data.message || 'Unknown error');
        setError(`Failed to create session: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create session. Please try again.');
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  // Start voice recognition
  const startListening = async () => {
    setError(null);
    
    // Check if session is active before starting voice recognition
    if (!connected || !sessionId || !sessionToken) {
      console.log('No active session for voice recognition');
      setError('No active session. Please restart the conversation.');
      return;
    }
    
    if (!micPermissionGranted) {
      setError('Microphone permission not granted. Cannot use voice input.');
      return;
    }
    
    try {
      console.log('Starting voice recognition...');
      await Voice.start('en-US');
      setIsListening(true);
    } catch (e) {
      console.error('Error starting voice recognition:', e);
      setError('Failed to start voice recognition. Please try again.');
    }
  };

  // Stop voice recognition
  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (e) {
      console.error('Error stopping voice recognition:', e);
    }
  };

  // Close the session
  const closeSession = async () => {
    try {
      setLoading(true);
      setGlobalLoading(true);
      setError(null);
      
      if (!sessionId || !sessionToken) {
        console.log('No active session');
        return;
      }

      const response = await fetch(
        `${API_CONFIG.serverUrl}/v1/streaming.stop`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
          }),
        }
      );

      // Close WebSocket
      if (webSocket) {
        webSocket.close();
        setWebSocket(null);
      }

      // Reset all states
      setConnected(false);
      setSessionId('');
      setSessionToken('');
      setWsUrl('');
      setToken('');
      setText('');
      setSpeaking(false);
      if (onDismiss) onDismiss();
      console.log('Session closed successfully');
    } catch (error) {
      console.error('Error closing session:', error);
      setError('Failed to close session properly.');
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  const handleDismiss = () => {
    // Make sure we reset the global loading state when dismissing
    setGlobalLoading(false);
    if (onDismiss) onDismiss();
  };

  // If not connected, show the start session screen
  if (!connected) {
    return (
      <Animated.View 
        style={[
          styles.popupContainer, 
          { backgroundColor: colors.background },
          { transform: pan.getTranslateTransform() }
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.dragHandle}>
          <View style={styles.dragIndicator} />
        </View>
        
        <View style={styles.heroContainer}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>AI Avatar Chat</Text>
          <Text style={[styles.heroSubtitle, { color: colors.text }]}>
            Interact with a virtual AI assistant
          </Text>
          
          {error && (
            <View style={styles.errorContainer}>
              <Icon name="error-outline" size={24} color="#FF5252" />
              <Text style={[styles.errorText, { color: "#FF5252" }]}>{error}</Text>
            </View>
          )}

          {(loading || globalLoading) && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.theme} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                Initializing AI Avatar...
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={styles.closePopupButton}
          onPress={handleDismiss}
        >
          <Icon name="close" size={24} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // If minimized, show only a small floating button
  if (minimized) {
    return (
      <Animated.View
        style={[
          styles.minimizedButton,
          { transform: pan.getTranslateTransform() }
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={styles.minimizedButtonContent}
          onPress={() => setMinimized(false)}
          onLongPress={handleDismiss}
        >
          <Icon name="face" size={28} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // If connected, show the LiveKitRoom with video
  return (
    <Animated.View 
      style={[
        styles.popupContainer,
        { transform: pan.getTranslateTransform() }
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.dragHandle}>
        <View style={styles.dragIndicator} />
      </View>
      
      <LiveKitRoom
        serverUrl={wsUrl}
        token={token}
        connect={true}
        options={{
          adaptiveStream: { pixelDensity: 'screen' },
        }}
        audio={false}
        video={false}
      >
        <RoomView
          onSendText={sendText}
          text={text}
          onTextChange={setText}
          speaking={speaking}
          onClose={closeSession}
          loading={loading || globalLoading}
          error={error}
          colors={colors}
          isListening={isListening}
          onStartListening={startListening}
          onStopListening={stopListening}
          onMinimize={() => setMinimized(true)}
          onDismiss={handleDismiss}
          isDragging={isDragging}
        />
      </LiveKitRoom>
    </Animated.View>
  );
};

// Room view component to display the video stream
interface RoomViewProps {
  onSendText: () => void;
  text: string;
  onTextChange: (text: string) => void;
  speaking: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  colors: any;
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onMinimize: () => void;
  onDismiss?: () => void;
  isDragging: boolean;
}

const RoomView = ({
  onSendText,
  text,
  onTextChange,
  speaking,
  onClose,
  loading,
  error,
  colors,
  isListening,
  onStartListening,
  onStopListening,
  onMinimize,
  onDismiss,
  isDragging,
}: RoomViewProps) => {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.videoContainer}>
          {/* Background gradient that will show behind the avatar */}
          <LinearGradient
            colors={['#121212', '#232323', '#121212']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.avatarBackground}
          />
          
          {tracks.map((track, idx) =>
            isTrackReference(track) ? (
              <View key={idx} style={styles.videoWrapper}>
                <ChromaKeyVideoTrack trackRef={track} />
              </View>
            ) : null
          )}
          
          {tracks.length === 0 && (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.theme} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                Loading avatar...
              </Text>
            </View>
          )}
        </View>

        {!isDragging && (
          <View style={styles.headerButtons}>
            {/* <TouchableOpacity
              style={styles.minimizeButton}
              onPress={onMinimize}
              disabled={isDragging}
            >
              <Icon name="minimize" size={20} color="#FFF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.minimizeButton}
              onPress={onDismiss}
              disabled={isDragging}
            >
              <Icon name="close" size={20} color="#FFF" />
            </TouchableOpacity> */}
            
            <TouchableOpacity
              style={[
                styles.closeButton, 
                (loading || isDragging) && styles.disabledButton
              ]}
              onPress={onClose}
              disabled={loading || isDragging}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.closeButtonText}>End</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        
        {error && !isDragging && (
          <View style={styles.floatingError}>
            <Icon name="error-outline" size={16} color="#FF5252" />
            <Text style={[styles.floatingErrorText, { color: "#FF5252" }]}>{error}</Text>
          </View>
        )}
        
        {speaking && !isDragging && (
          <View style={styles.speakingIndicator}>
            <ActivityIndicator color={colors.theme} size="small" />
            <Text style={[styles.speakingText, { color: colors.text }]}>
              AI is speaking...
            </Text>
          </View>
        )}
        
        {!isDragging && (
          <View style={styles.micButtonContainer}>
            <TouchableOpacity
              style={[
                styles.centeredMicButton,
                { backgroundColor: isListening ? "#FF4081" : colors.theme },
                (speaking || loading || isDragging) && styles.disabledButton,
              ]}
              onPress={isListening ? onStopListening : onStartListening}
              disabled={speaking || loading || isDragging}
            >
              <Icon name={isListening ? "mic" : "mic-none"} size={24} color="#FFF" />
            </TouchableOpacity>
            
            {isListening && (
              <Text style={[styles.recordingText, { color: colors.text }]}>
                Listening...
              </Text>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  popupContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 200,
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },
  minimizedButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 60,
    height: 60,
    zIndex: 1000,
  },
  minimizedButtonContent: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4a4a4a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  dragHandle: {
    width: '100%',
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  headerButtons: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    zIndex: 10,
  },
  minimizeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  closePopupButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: 20,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: FONTS.Bold,
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.Regular,
    textAlign: 'center',
    marginBottom: 20,
  },
  startButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 20,
    marginHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: FONTS.Medium,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  avatarBackground: {
    position: 'absolute',
        backgroundColor: 'transparent',

    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  videoWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',

  },
  chromaKeyWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  chromaKeyVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    // Remove the green background by making it transparent
    opacity: 0.95,
  },
  // vignette: {
  //   position: 'absolute',
  //   top: 0,
  //   left: 0,
  //   right: 0,
  //   bottom: 0,
  //   backgroundColor: 'rgba(0,0,0,0.5)',
  //   borderRadius: 1000,
  //   transform: [{ scaleX: 2 }],
  //   opacity: 0.3,
  //   zIndex: 5,
  // },
  videoView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  closeButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#FF5252",
    minWidth: 50,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontFamily: FONTS.Medium,
    fontSize: 14,
  },
  micButtonContainer: {
    width: '100%',
    paddingBottom: 15,
    paddingTop: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredMicButton: {
    height: 50,
    width: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    marginBottom: 5,
  },
  recordingText: {
    fontFamily: FONTS.Medium,
    fontSize: 12,
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: FONTS.Medium,
  },
  speakingIndicator: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  speakingText: {
    marginLeft: 6,
    fontFamily: FONTS.Medium,
    fontSize: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  errorText: {
    marginLeft: 6,
    fontFamily: FONTS.Regular,
    fontSize: 12,
  },
  floatingError: {
    position: 'absolute',
    bottom: 100,
    left: 15,
    right: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  floatingErrorText: {
    marginLeft: 6,
    fontFamily: FONTS.Regular,
    fontSize: 12,
    flex: 1,
  },
  videoTrack: {
    height: 400,
    width: 400,
    opacity: 1.0,
  },
});

export default HeyGenAvatarScreen; 