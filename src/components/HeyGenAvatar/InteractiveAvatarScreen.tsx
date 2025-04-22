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
import { logErrorToStorage, logStartupEvent, safeExecute } from '../../utils/ReleaseErrorLogger';

// Safely register LiveKit globals with error handling
const safeRegisterGlobals = () => {
  try {
    logStartupEvent('InteractiveAvatarScreen', 'Attempting to register LiveKit globals');
    
    if (__DEV__) {
      // In development mode, initialize normally
      console.log('Initializing LiveKit in DEV mode');
      try {
        registerGlobals();
        logStartupEvent('InteractiveAvatarScreen', 'LiveKit globals registered successfully in DEV mode');
      } catch (error) {
        console.error('Failed to register LiveKit globals in DEV mode:', error);
        logErrorToStorage('LIVEKIT_REGISTER_DEV', `Error: ${error.message}`);
      }
    } else {
      // In production mode, try to initialize but catch errors
      console.log('Initializing LiveKit in PRODUCTION mode');
      try {
        registerGlobals();
        logStartupEvent('InteractiveAvatarScreen', 'LiveKit globals registered successfully in PROD mode');
      } catch (error) {
        console.error('Failed to register LiveKit globals in PROD mode:', error);
        logErrorToStorage('LIVEKIT_REGISTER_PROD', `Error: ${error.message}`);
        // We'll continue even if this fails, and handle WebRTC availability elsewhere
      }
    }
  } catch (error) {
    console.error('Failed to register LiveKit globals:', error);
    logErrorToStorage('LIVEKIT_REGISTER_GLOBAL', `Error: ${error.message}`);
    // We'll continue even if this fails, and handle WebRTC availability elsewhere
  }
};

// Call the safe initialization
safeExecute('safeRegisterGlobals', safeRegisterGlobals);

// HeyGen API configuration
const API_CONFIG = {
  apiKey: 'NzViZDY4YjU2MjVkNDMzNGE0NDIzY2U5NDQ0ZGIyMWQtMTczODgyNTI2NA==', // Replace with your actual API key
  serverUrl: 'https://api.heygen.com',
};

// Available avatar options to try if primary one fails
const AVATAR_OPTIONS = [
  'Thaddeus_Black_Suit_public'
];

// Storage key for saving position
const POSITION_STORAGE_KEY = 'interactive_avatar_position';

// Event ID generator for WebSocket communication
const generateEventId = () => {
  return `event_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};

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

// Add AvatarVideo component before the InteractiveAvatarScreen component
const AvatarVideo = () => {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    {
      onlySubscribed: true,
    }
  );

  const videoTrack = tracks.find(track => 
    isTrackReference(track) && track.source === Track.Source.Camera
  );

  return videoTrack ? (
    <ChromaKeyVideoTrack trackRef={videoTrack} />
  ) : null;
};

interface InteractiveAvatarScreenProps {
  onDismiss?: () => void;
}

const InteractiveAvatarScreen: React.FC<InteractiveAvatarScreenProps> = ({ onDismiss }) => {
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
  
  // Setup PanResponder for dragging
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

  // Setup Voice recognition
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
        // Send recognized speech to websocket
        processSpeechToAudio(recognizedText);
      }
    };
    
    // Request microphone permission
    const requestMicrophonePermission = async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'This app needs access to your microphone to enable voice interaction.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          setMicPermissionGranted(granted === PermissionsAndroid.RESULTS.GRANTED);
        } else {
          // iOS handles permissions differently
          setMicPermissionGranted(true);
        }
      } catch (err) {
        console.error('Error requesting microphone permission:', err);
        setMicPermissionGranted(false);
      }
    };
    
    requestMicrophonePermission();
    
    // Clean up voice recognition on unmount
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // Handler for session creation
  const createSession = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try each avatar until one works
      let sessionCreated = false;
      let errorMessage = '';
      
      for (const avatarName of AVATAR_OPTIONS) {
        try {
          console.log(`Trying avatar: ${avatarName}`);
          // 1. Get session token from API
          const tokenResponse = await fetch(
            `${API_CONFIG.serverUrl}/v1/streaming.new`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_CONFIG.apiKey,
              },
              body: JSON.stringify({
                avatar_name: avatarName,
                background_image_or_video: '',
                background_color: '#0b2539',
              }),
            }
          );
          
          const tokenData = await tokenResponse.json();
          console.log('Session token response:', tokenData);
          
          if (tokenData.code === 10013) {
            // Avatar not found, try next one
            errorMessage = `Avatar ${avatarName} not found`;
            continue;
          }
          
          if (!tokenData.data || !tokenData.data.token || !tokenData.data.session_id) {
            errorMessage = 'Failed to obtain session token';
            continue;
          }
          
          const newSessionToken = tokenData.data.token;
          const newSessionId = tokenData.data.session_id;
          
          // Store session details
          setSessionToken(newSessionToken);
          setSessionId(newSessionId);
          
          // Check if realtime_endpoint is available for Interactive Avatar
          if (tokenData.data.realtime_endpoint) {
            // Use the new WebSocket URL format
            const wsEndpoint = tokenData.data.realtime_endpoint;
            console.log('Using WebSocket endpoint:', wsEndpoint);
            
            // Connect to Interactive Avatar WebSocket
            connectWebSocket(wsEndpoint, newSessionToken);
            sessionCreated = true;
            break; // Exit the loop if successful
          } else {
            // Fallback to the LiveKit approach
            // Get LiveKit connection details
            const livekitResponse = await fetch(
              `${API_CONFIG.serverUrl}/v1/streaming.connect`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${newSessionToken}`,
                },
                body: JSON.stringify({
                  session_id: newSessionId,
                }),
              }
            );
            
            const livekitData = await livekitResponse.json();
            console.log('LiveKit response:', livekitData);
            
            if (!livekitData.data || !livekitData.data.ws_url || !livekitData.data.token) {
              errorMessage = 'Failed to connect to streaming service';
              continue;
            }
            
            // Set LiveKit connection details
            setWsUrl(livekitData.data.ws_url);
            setToken(livekitData.data.token);
            
            // Mark as connected
            setConnected(true);
            sessionCreated = true;
            break; // Exit the loop if successful
          }
        } catch (avatarError) {
          console.error(`Error with avatar ${avatarName}:`, avatarError);
          errorMessage = `Error with avatar ${avatarName}: ${avatarError.message}`;
          // Continue to next avatar
        }
      }
      
      if (!sessionCreated) {
        throw new Error(errorMessage || 'Failed to create session with any avatar');
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      setError(`Failed to initialize avatar: ${error.message}`);
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  // Connect to WebSocket for Interactive Avatar
  const connectWebSocket = (wsUrl: string, token: string) => {
    try {
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      
      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);
      
      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        // Fix for WebSocket.OPEN not being defined in release mode
        // WebSocket.OPEN is 1 according to the WebSocket spec
        const WS_OPEN = typeof WebSocket !== 'undefined' && WebSocket.OPEN !== undefined ? WebSocket.OPEN : 1;
        
        if (ws.readyState !== WS_OPEN) {
          console.error('WebSocket connection timeout');
          logErrorToStorage('WS_TIMEOUT', 'WebSocket connection timeout');
          ws.close();
          setError('Connection timeout. Please try again.');
        }
      }, 15000); // 15 seconds timeout
      
      // Clean up WebSocket connection on unmount
      return () => {
        clearTimeout(connectionTimeout);
        ws.close();
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setError('Failed to connect to WebSocket. Please try again.');
    }
  };

  // Process speech to send to avatar
  const processSpeechToAudio = (recognizedText: string) => {
    if (!recognizedText || !webSocket) return;
    
    try {
      // Create event data for WebSocket
      const eventData = {
        event_id: generateEventId(),
        event_name: 'speech_to_audio',
        data: {
          text: recognizedText,
        },
      };
      
      console.log('Sending speech to avatar:', recognizedText);
      
      // Send to WebSocket if it's open
      // WebSocket.OPEN is 1 according to the WebSocket spec
      const WS_OPEN = typeof WebSocket !== 'undefined' && WebSocket.OPEN !== undefined ? WebSocket.OPEN : 1;
      
      if (webSocket.readyState === WS_OPEN) {
        webSocket.send(JSON.stringify(eventData));
        setSpeaking(true);
      } else {
        console.error('WebSocket not open');
        setError('Connection lost. Please restart the session.');
      }
    } catch (error) {
      console.error('Error sending speech to avatar:', error);
      setError('Failed to send message. Please try again.');
    }
  };
  
  // Close the session
  const closeSession = async () => {
    // Close any existing WebSocket
    if (webSocket) {
      webSocket.close();
      setWebSocket(null);
    }
    
    // Reset state
    setConnected(false);
    setSpeaking(false);
    setText('');
  };

  return (
    <View style={styles.container}>
      {/* Avatar popup container */}
      {!minimized ? (
        <Animated.View
          style={[
            styles.popupContainer,
            { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
          ]}
          {...panResponder.panHandlers}
        >
          {/* Drag handle */}
          <View style={styles.dragHandle}>
            <View style={styles.dragIndicator} />
          </View>
          
          {/* Header buttons */}
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.minimizeButton} onPress={() => setMinimized(true)}>
              <Icon name="remove" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.closePopupButton} onPress={onDismiss}>
              <Icon name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          {/* Avatar content */}
          <View style={styles.videoContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4285F4" />
                <Text style={styles.loadingText}>Initializing Avatar...</Text>
              </View>
            ) : connected ? (
              <LiveKitRoom
                url={wsUrl}
                token={token}
                onError={(err) => {
                  console.error('LiveKit error:', err);
                  setError(`Connection error: ${err.message}`);
                }}
                webrtcLogLevel="error"
                audioTrackCaptureDefaults={{
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                }}
              >
                <AvatarVideo />
              </LiveKitRoom>
            ) : (
              <View style={styles.heroContainer}>
                <Text style={styles.heroTitle}>Interactive AI Avatar</Text>
                <Text style={styles.heroSubtitle}>
                  Start a conversation with your AI assistant
                </Text>
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={createSession}
                  disabled={loading}
                >
                  <Text style={styles.startButtonText}>Start Conversation</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>
      ) : (
        <TouchableOpacity
          style={styles.minimizedButton}
          onPress={() => setMinimized(false)}
        >
          <View style={styles.minimizedButtonContent}>
            <Icon name="person" size={24} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      )}
      
      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => setError(null)}>
            <Text style={styles.closeButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Add styles definition at the end of file, before the export
const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  popupContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 300,
    height: 400,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
    backgroundColor: '#121212',
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0b2539',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: 'white',
    fontFamily: FONTS.Medium,
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
    color: 'white',
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.Regular,
    textAlign: 'center',
    marginBottom: 20,
    color: 'white',
  },
  startButton: {
    backgroundColor: '#4285F4',
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
    opacity: 0.95,
  },
  vignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 1000,
    transform: [{ scaleX: 2 }],
    opacity: 0.3,
    zIndex: 5,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 82, 82, 0.9)',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: 'white',
    flex: 1,
    fontFamily: FONTS.Medium,
  },
  closeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  closeButtonText: {
    color: 'white',
    fontFamily: FONTS.Medium,
    fontSize: 12,
  },
});

export default InteractiveAvatarScreen;