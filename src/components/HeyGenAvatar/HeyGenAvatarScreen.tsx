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
import { StreamingAvatar } from '@heygen/streaming-avatar';

// Safely register LiveKit globals with error handling
const safeRegisterGlobals = () => {
  try {
    if (__DEV__) {
      // In development mode, initialize normally
      console.log('Initializing LiveKit in DEV mode');
      registerGlobals();
    } else {
      // In production mode, try to initialize but catch errors
      console.log('Initializing LiveKit in PRODUCTION mode');
      registerGlobals();
    }
  } catch (error) {
    console.error('Failed to register LiveKit globals:', error);
    // We'll continue even if this fails, and handle WebRTC availability elsewhere
  }
};

// Call the safe initialization
safeRegisterGlobals();

// HeyGen API configuration
const API_CONFIG = {
  apiKey: 'NzViZDY4YjU2MjVkNDMzNGE0NDIzY2U5NDQ0ZGIyMWQtMTczODgyNTI2NA==', // Replace with your actual API key
  serverUrl: 'https://api.heygen.com',
};

// Storage key for saving position
const POSITION_STORAGE_KEY = 'heygen_avatar_position';
// Storage keys for session persistence
const SESSION_STORAGE_PREFIX = 'heygen_session_';
const SESSION_ID_KEY = `${SESSION_STORAGE_PREFIX}id`;
const SESSION_TOKEN_KEY = `${SESSION_STORAGE_PREFIX}token`;
const WS_URL_KEY = `${SESSION_STORAGE_PREFIX}ws_url`;
const TOKEN_KEY = `${SESSION_STORAGE_PREFIX}access_token`;
const SESSION_TIMESTAMP_KEY = `${SESSION_STORAGE_PREFIX}timestamp`;
// Session validity in milliseconds (30 minutes)
const SESSION_VALIDITY_DURATION = 30 * 60 * 1000;

// Custom StreamingAvatar Video Track component
interface StreamingAvatarProps {
  trackRef: any;
  onVideoEnd?: () => void;
}

const CustomStreamingAvatar: React.FC<StreamingAvatarProps> = ({ trackRef, onVideoEnd }) => {
  // Use an effect to detect when video track changes or ends
  useEffect(() => {
    if (trackRef && onVideoEnd) {
      // Check if track has an onEnded event we can listen to
      const track = trackRef.track;
      if (track) {
        // Some track implementations might have this event
        if (typeof track.addEventListener === 'function') {
          track.addEventListener('ended', onVideoEnd);
          return () => {
            track.removeEventListener('ended', onVideoEnd);
          };
        }
      }
      
      // As a fallback, periodically check if the video is playing
      let lastPlayingState = true;
      const checkInterval = setInterval(() => {
        // If track exists and has a state property we can check
        if (track && track.state) {
          const isPlaying = track.state === 'live';
          // If it was playing and now it's not, call onVideoEnd
          if (lastPlayingState && !isPlaying) {
            onVideoEnd();
          }
          lastPlayingState = isPlaying;
        }
      }, 1000);
      
      return () => clearInterval(checkInterval);
    }
  }, [trackRef, onVideoEnd]);
  
  return (
    <View style={styles.avatarWrapper}>
      {/* Using VideoTrack for backward compatibility */}
      <VideoTrack
        style={styles.streamingAvatar}
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
  const [continuousMode, setContinuousMode] = useState(false);
  const [lastSpeechTimestamp, setLastSpeechTimestamp] = useState(0);
  const [partialResults, setPartialResults] = useState<string>('');
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [conversationActive, setConversationActive] = useState(false);
  const [waitingForAIResponse, setWaitingForAIResponse] = useState(false);
  const [recognitionErrorCount, setRecognitionErrorCount] = useState(0);
  const maxErrorRetries = 3; // Maximum number of consecutive errors before resetting
  
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
  
  // Function declarations
  const restartVoiceRecognition = async () => {
    try {
      // Make sure we're in a valid state to restart
      if (!continuousMode || !connected || !sessionId || !sessionToken) {
        console.log('Not restarting voice recognition - continuousMode or session invalid');
        setIsListening(false);
        return;
      }
      
      // First ensure voice recognition is fully stopped
      try {
        console.log('Stopping current voice recognition before restart');
        await Voice.destroy(); // More thorough cleanup than just stop()
        setIsListening(false); // Make sure UI reflects stopped state
      } catch (stopError) {
        console.log('Error stopping voice before restart (non-critical):', stopError);
      }
      
      // Wait a longer moment before restarting to ensure clean state
      setTimeout(async () => {
        try {
          // Reset error count on restart
          setRecognitionErrorCount(0);
          
          console.log('Restarting voice recognition with fresh instance...');
          // Reinitialize Voice with listeners
          await Voice.removeAllListeners();
          await Voice.destroy();
          
          // Re-setup the instance with enhanced settings
          Voice.onSpeechStart = () => {
            console.log('Speech started (restarted instance)');
            setLastSpeechTimestamp(Date.now());
          };
          
          Voice.onSpeechEnd = () => {
            console.log('Speech ended (restarted instance)');
          };
          
          Voice.onSpeechResults = (result) => {
            if (result.value && result.value.length > 0) {
              console.log('Speech result (restarted instance):', result.value[0]);
              // Let the main listener handle the results
            }
          };
          
          // Enhanced options for better speech recognition
          const options = {
            locale: 'en_US',
            continuous: true,
            partialResults: true,
            onDevice: true,
            // Additional options to improve recognition performance
            showPopup: false,
            showPartial: true,
            maxResults: 5,
            // Lower recognition threshold to capture more speech
            extra: {
              "android.speech.extra.SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS": "1000",
              "android.speech.extra.SPEECH_INPUT_MINIMUM_LENGTH_MILLIS": "500",
              "android.speech.extra.DICTATION_MODE": true
            }
          };
          
          await Voice.start('en-US', options);
          setIsListening(true);
          console.log('Voice recognition successfully restarted with enhanced settings');
        } catch (startError) {
          console.error('Error in restart voice recognition:', startError);
          // Try to restart with simplified settings if the enhanced settings failed
          try {
            console.log('Trying simpler configuration after restart failure');
            await Voice.start('en-US', { continuous: true });
            setIsListening(true);
          } catch (simpleError) {
            console.error('Even simple restart failed:', simpleError);
            // If we can't restart after multiple attempts, turn off continuous mode
            setError('Voice recognition failed to restart. Turning off continuous mode.');
            setContinuousMode(false);
            setIsListening(false);
          }
        }
      }, 1500); // Increased delay for more reliable restart
    } catch (e) {
      console.error('Error in restartVoiceRecognition flow:', e);
      setIsListening(false);
    }
  };
  
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
    
    // Try to load a saved session if not already connected
    if (!connected && !loading) {
      loadSavedSession();
    }

    // Set up a detection mechanism for when conversation is active
    // Check every second if we need to restart voice recognition
    const continuousConversationInterval = setInterval(() => {
      // If we're in continuous mode, conversation is active, but not listening or speaking
      if (continuousMode && conversationActive && !isListening && !speaking && !waitingForAIResponse) {
        console.log('Auto-detecting conversation continuation needed - restarting voice recognition');
        startListening();
      }
    }, 1000);

    return () => {
      clearInterval(continuousConversationInterval);
    };
  }, [continuousMode, conversationActive, isListening, speaking, waitingForAIResponse]);
  
  // Save current session to AsyncStorage
  const saveSession = async () => {
    try {
      if (!sessionId || !sessionToken || !wsUrl || !token) {
        console.log('No valid session to save');
        return;
      }
      
      const sessionData = {
        sessionId,
        sessionToken,
        wsUrl,
        token,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(SESSION_ID_KEY, sessionId);
      await AsyncStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
      await AsyncStorage.setItem(WS_URL_KEY, wsUrl);
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
      
      console.log('Session saved successfully:', sessionId);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };
  
  // Load saved session from AsyncStorage
  const loadSavedSession = async () => {
    try {
      // Check if we have all required session data
      const savedSessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
      const savedSessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
      const savedWsUrl = await AsyncStorage.getItem(WS_URL_KEY);
      const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const savedTimestamp = await AsyncStorage.getItem(SESSION_TIMESTAMP_KEY);
      
      if (!savedSessionId || !savedSessionToken || !savedWsUrl || !savedToken || !savedTimestamp) {
        console.log('No complete saved session found');
        return false;
      }
      
      // Check if session is still valid (not expired)
      const timestamp = parseInt(savedTimestamp, 10);
      const now = Date.now();
      if (now - timestamp > SESSION_VALIDITY_DURATION) {
        console.log('Saved session has expired');
        clearSavedSession();
        return false;
      }
      
      console.log('Found valid saved session, attempting to resume:', savedSessionId);
      
      // Set session data
      setSessionId(savedSessionId);
      setSessionToken(savedSessionToken);
      setWsUrl(savedWsUrl);
      setToken(savedToken);
      
      // Attempt to reconnect to the session
      return resumeSession(savedSessionId, savedSessionToken);
    } catch (error) {
      console.error('Error loading saved session:', error);
      return false;
    }
  };
  
  // Clear saved session data
  const clearSavedSession = async () => {
    try {
      await AsyncStorage.removeItem(SESSION_ID_KEY);
      await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
      await AsyncStorage.removeItem(WS_URL_KEY);
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(SESSION_TIMESTAMP_KEY);
      console.log('Saved session cleared');
    } catch (error) {
      console.error('Error clearing saved session:', error);
    }
  };
  
  // Resume an existing session
  const resumeSession = async (sessionIdToResume: string, sessionTokenToResume: string) => {
    try {
      setLoading(true);
      setGlobalLoading(true);
      setError(null);
      
      console.log('Attempting to resume session:', sessionIdToResume);
      
      // Check session status first
      const checkResponse = await fetch(
        `${API_CONFIG.serverUrl}/v1/streaming.check`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionTokenToResume}`,
          },
          body: JSON.stringify({
            session_id: sessionIdToResume,
          }),
        }
      );
      
      const checkData = await checkResponse.json();
      console.log('Session check response:', checkData);
      
      if (checkData.code !== 100 || checkData.data?.status !== 'active') {
        console.log('Session is not active, creating new session instead');
        clearSavedSession();
        return false;
      }
      
      // Connect WebSocket for reconnected session
      const params = new URLSearchParams({
        session_id: sessionIdToResume,
        session_token: sessionTokenToResume,
        silence_response: 'false',
        stt_language: 'en',
      });

      const wsReconnectUrl = `wss://${
        new URL(API_CONFIG.serverUrl).hostname
      }/v1/ws/streaming.chat?${params}`;

      console.log('Reconnecting to WebSocket...');
      const ws = new WebSocket(wsReconnectUrl);
      
      ws.onopen = () => {
        console.log('WebSocket reconnection established');
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      setWebSocket(ws);
      setConnected(true);
      
      // Save the session again to update the timestamp
      saveSession();
      
      console.log('Session resumed successfully');
      return true;
    } catch (error) {
      console.error('Error resuming session:', error);
      setError('Failed to resume session. Creating a new one...');
      clearSavedSession();
      return false;
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };
  
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
  
  // Add a handleVideoEnd function to ensure voice recognition stays active
  const handleVideoEnd = () => {
    console.log('Video playback ended');
    
    // No need to restart the microphone as it should be continuously active
    // Just log that avatar finished speaking
    console.log('Avatar finished speaking - microphone remains active');
  };

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
      createSession().then(() => {
        // After session is created, automatically enable continuous mode and start listening
        setContinuousMode(true);
        setConversationActive(true);
        
        console.log('Session created, will attempt to send greeting shortly');
        // Don't do anything else here - we'll handle greeting in a separate effect
      });
      
      // Reset the flag after initiating
      setDirectInitSession(false);
    }
  }, [directInitSession, connected, loading]);

  // Add a separate effect to monitor when connection is established
  useEffect(() => {
    // This will trigger when connected changes from false to true
    if (connected && sessionId && sessionToken) {
      console.log('Connection established, sending greeting...');
      
      // Give the session a moment to fully initialize
      setTimeout(() => {
        sendGreeting();
      }, 2000);
    }
  }, [connected, sessionId, sessionToken]);

  // Start voice recognition - should only be called once at session start
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
    
    // Check if already listening - don't restart
    if (isListening) {
      console.log('Already listening, no need to start again');
      return;
    }
    
    try {
      console.log('Starting continuous voice recognition that will remain active for the entire session...');
      
      // First ensure clean state
      await Voice.destroy();
      
      // Enhanced Voice configuration for continuous listening
      const optimizedOptions = {
        locale: 'en_US',
        continuous: true,
        partialResults: true,
        // Enhanced parameters to improve speech recognition quality
        onDevice: true, 
        showPopup: false,
        showPartial: true,
        maxResults: 10,
        // Comprehensive Android speech recognition parameters
        extra: {
          "android.speech.extra.SPEECH_INPUT_MINIMUM_LENGTH_MILLIS": "300",
          "android.speech.extra.SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS": "2000",
          "android.speech.extra.DICTATION_MODE": true,
          "android.speech.extra.PARTIAL_RESULTS": true,
          "android.speech.extra.CONFIDENCE_LEVEL": "0.5",
          "android.speech.extra.NO_MATCH_THRESHOLD": "0.4",
          "android.speech.extra.NO_MATCH_RETRY_COUNT": "3"
        }
      };
      
      await Voice.start('en-US', optimizedOptions);
      setIsListening(true);
      setContinuousMode(true);
      
      // Reset error counter when starting fresh
      setRecognitionErrorCount(0);
      
      console.log('Voice recognition started and will remain active for the entire session');
    } catch (e) {
      console.error('Error starting voice recognition with optimized settings:', e);
      
      // Try with simpler settings if optimized settings failed
      try {
        console.log('Trying simpler configuration after initial failure');
        await Voice.start('en-US', { 
          continuous: true,
          partialResults: true
        });
        setIsListening(true);
        setContinuousMode(true);
      } catch (simpleError) {
        console.error('Even simple configuration failed:', simpleError);
        setError('Failed to start voice recognition. Please try again.');
      }
    }
  };

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
      if (setError) setError('Failed to get session token. Please try again.');
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
        if (typeof setConnected === 'function') {
          setConnected(true);
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error starting streaming session:', error);
      if (setError) setError('Failed to start streaming session. Please try again.');
      return false;
    }
  };

  // Voice recognition setup
  useEffect(() => {
    // Initialize voice recognition
    Voice.onSpeechStart = () => {
      console.log('Speech started');
      setLastSpeechTimestamp(Date.now());
      
      // Clear any existing timeout
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }

      // If avatar is currently speaking, interrupt it
      if (speaking) {
        console.log('User started speaking while avatar was speaking - interrupting avatar');
        // Interrupt avatar speech
        if (webSocket) {
          try {
            // Send interrupt signal or close and reopen connection
            const interruptMessage = JSON.stringify({ type: 'interrupt' });
            webSocket.send(interruptMessage);
          } catch (error) {
            console.error('Error interrupting avatar speech:', error);
          }
        }
        setSpeaking(false);
        setWaitingForAIResponse(false);
      }
    };
    
    Voice.onSpeechRecognized = () => {
      console.log('Speech recognized');
      setLastSpeechTimestamp(Date.now());
    };
    
    Voice.onSpeechEnd = () => {
      console.log('Speech ended');
      
      // Set timeout to detect pause in speech - use 2000ms as requested
      speechTimeoutRef.current = setTimeout(() => {
        console.log('Speech pause detected (2000ms), processing...');
        if (partialResults.trim().length > 0) {
          sendRecognizedText(partialResults);
          setPartialResults('');
        } else {
          // No results but speech ended - likely too quiet or not recognized
          // Just restart listening in continuous mode
          console.log('No speech detected, restarting listening...');
          if (continuousMode) restartVoiceRecognition();
        }
      }, 2000); // 2000ms pause threshold as requested
    };
    
    Voice.onSpeechError = (error) => {
      console.log('[ERROR] Speech error:', error);
      
      // Special handling for "No match" errors (code 7)
      if (error.error?.code === '7' || error.error?.message?.includes('No match')) {
        console.log('No speech match detected (Error 7) - implementing recovery strategy');
        
        // Don't show this error to the user
        setError(null);
        
        // Ensure microphone stays active regardless of errors
        ensureMicrophoneActive();
        
        return;
      }
      
      // For any error, ensure the microphone stays active
      ensureMicrophoneActive();
      
      if (error.error?.message && !error.error?.message.includes('No match')) {
        setError(`Microphone error: ${error.error.message}`);
      }
    };
    
    Voice.onSpeechResults = (result) => {
      if (result.value && result.value.length > 0) {
        const recognizedText = result.value[0];
        console.log('Speech result:', recognizedText);
        
        // Reset error counter when we get successful results
        setRecognitionErrorCount(0);
        
        // Don't auto-send if session is not valid
        if (!sessionId || !sessionToken || !connected) {
          console.log('Cannot process voice input - no active session');
          setText(recognizedText); // Just update text input with recognized text
          setError('Session not active. Please restart and try again.');
          return;
        }
        
        // Update last speech timestamp
        setLastSpeechTimestamp(Date.now());
        
        // Store the results but don't immediately send
        setPartialResults(recognizedText);
        
        // Clear any existing timeout and set a new one
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }
        
        // Set timeout to detect pause in speech - always use 2000ms for final results
        speechTimeoutRef.current = setTimeout(() => {
          console.log('Speech pause detected after results (2000ms), processing...');
          if (recognizedText.trim().length > 0) {
            sendRecognizedText(recognizedText);
            setPartialResults('');
          }
          // Ensure microphone stays active
          ensureMicrophoneActive();
        }, 2000); // 2000ms pause threshold as requested
      }
    };
    
    Voice.onSpeechPartialResults = (partialResult) => {
      if (partialResult.value && partialResult.value.length > 0) {
        const text = partialResult.value[0];
        console.log('Partial result:', text);
        
        // Update timestamp to show active speech
        setLastSpeechTimestamp(Date.now());
        
        // Update the partial results
        setPartialResults(text);
      }
    };

    // New function to ensure microphone always stays active
    const ensureMicrophoneActive = async () => {
      try {
        // First check if we're already listening
        if (isListening) {
          console.log('Microphone already active, no need to restart');
          return;
        }

        console.log('Ensuring microphone stays active');
        // Make sure previous instance is fully destroyed
        await Voice.destroy();
        
        // Start with enhanced options for continuous listening
        const options = {
          locale: 'en_US',
          continuous: true,
          partialResults: true,
          onDevice: true,
          showPopup: false,
          showPartial: true,
          maxResults: 10,
          // Enhanced settings for continuous operation
          extra: {
            "android.speech.extra.SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS": "3000",
            "android.speech.extra.SPEECH_INPUT_MINIMUM_LENGTH_MILLIS": "100", 
            "android.speech.extra.SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS": "3000",
            "android.speech.extra.DICTATION_MODE": true,
            "android.speech.extra.PARTIAL_RESULTS": true,
            "android.speech.extra.CONFIDENCE_LEVEL": "0.4",
            "android.speech.extra.MAX_RESULTS": "15",
            "android.speech.extra.NO_MATCH_THRESHOLD": "0.3",
            "android.speech.extra.NO_MATCH_RETRY_COUNT": "5",
            "android.speech.extra.PREFER_OFFLINE": true,
            "android.speech.extra.LANGUAGE_MODEL": "free_form"
          }
        };
        
        await Voice.start('en-US', options);
        setIsListening(true);
        console.log('Microphone reactivated successfully');
      } catch (error) {
        console.error('Error ensuring microphone stays active:', error);
        // Try with simpler settings if the enhanced settings failed
        try {
          await Voice.start('en-US', { continuous: true });
          setIsListening(true);
          console.log('Microphone reactivated with simple settings');
        } catch (simpleError) {
          console.error('Even simple microphone activation failed:', simpleError);
          // Schedule another attempt after a delay
          setTimeout(() => {
            if (connected && sessionId) {
              console.log('Retrying microphone activation after delay...');
              startListening();
            }
          }, 1000);
        }
      }
    };
    
    // Request microphone permission on Android and start continuous listening
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
            // Start continuous listening immediately after permission granted
            if (connected && sessionId) {
              setContinuousMode(true);
              ensureMicrophoneActive();
            }
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
        // Start continuous listening immediately 
        if (connected && sessionId) {
          setContinuousMode(true);
          ensureMicrophoneActive();
        }
      }
    };
    
    requestMicrophonePermission();

    // Add an interval to constantly check if microphone is active
    const microphoneCheckInterval = setInterval(() => {
      if (connected && sessionId && !isListening && !loading) {
        console.log('Detected microphone inactive, reactivating...');
        ensureMicrophoneActive();
      }
    }, 5000); // Check every 5 seconds
    
    // Cleanup function
    return () => {
      clearInterval(microphoneCheckInterval);
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [sessionId, sessionToken, connected, isListening, loading, speaking, webSocket]);

  // Add an effect to auto-enable continuous mode after session starts
  useEffect(() => {
    if (connected && sessionId && !continuousMode) {
      console.log('Session active, enabling continuous mode automatically');
      setContinuousMode(true);
      // Force continuous mode to be always on
      setConversationActive(true);
    }
  }, [connected, sessionId, continuousMode]);

  // Update the sendRecognizedText function for better avatar interruption
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
      
      // We don't need to stop listening anymore - keep mic on continuously
      // Indicate that AI is responding though
      setSpeaking(true);
      setWaitingForAIResponse(true);
      setConversationActive(true);
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
        setConversationActive(false);
        return false;
      }
      
      setText(''); // Clear input after sending
      
      return true;
    } catch (error) {
      console.error('Error sending text:', error);
      setError('Failed to send text to avatar. Please try again.');
      return false;
    } finally {
      // Wait until AI response finishes (with timeout safety)
      const waitTime = Math.min(Math.floor(recognizedText.length / 5) * 1000, 8000);
      console.log(`Setting response wait time: ${waitTime}ms based on message length`);
      
      setTimeout(() => {
        console.log('Response wait time elapsed, finishing speaking state');
        setSpeaking(false);
        setWaitingForAIResponse(false);
        
        // No need to restart the microphone as it's continuously active
      }, waitTime + 500);
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
      
      console.log('Creating new HeyGen session with StreamingAvatar SDK...');
      
      // Get new session token using the SDK
      const streamingAvatarSdk = new StreamingAvatar({
        apiKey: API_CONFIG.apiKey,
        baseUrl: API_CONFIG.serverUrl
      });
      
      // Initialize the StreamingAvatar session
      const avatarSession = await streamingAvatarSdk.createSession({
        avatarName: 'Thaddeus_Black_Suit_public',
        quality: 'high',
        videoEncoding: 'H264',
        version: 'v2'
      });
      
      if (avatarSession) {
        // Extract session data
        const newSessionId = avatarSession.sessionId;
        const newSessionToken = avatarSession.sessionToken;
        const newWsUrl = avatarSession.wsUrl;
        const newAccessToken = avatarSession.accessToken;
        
        console.log('New session created with ID:', newSessionId);
        
        // Set all session data
        setSessionId(newSessionId);
        setSessionToken(newSessionToken);
        setWsUrl(newWsUrl);
        setToken(newAccessToken);

        // Connect WebSocket using the WebSocket URL returned from the SDK
        const params = new URLSearchParams({
          session_id: newSessionId,
          session_token: newSessionToken,
          silence_response: 'false',
          stt_language: 'en',
        });

        const wsUrl = avatarSession.wsUrl || `wss://${
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

        // Start streaming session
        console.log('Starting streaming session...');
        const success = await streamingAvatarSdk.startSession(newSessionId, newSessionToken);
        
        if (!success) {
          console.error('Failed to start streaming session');
          setError('Failed to start streaming session. Please try again.');
          return;
        }
        
        console.log('Session created and started successfully');
        
        // Save session for future use
        await saveSession();
        setConnected(true);
      } else {
        console.error('Failed to create session');
        setError('Failed to create session. Please try again.');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create session. Please try again.');
    } finally {
      setLoading(false);
      setGlobalLoading(false);
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

  // Toggle continuous voice recognition mode
  const toggleContinuousMode = () => {
    const newMode = !continuousMode;
    setContinuousMode(newMode);
    console.log(`Continuous mode ${newMode ? 'enabled' : 'disabled'}`);
    
    if (newMode) {
      // Enable conversation mode
      setConversationActive(true);
      
      // If turning on continuous mode and we're already listening, do nothing
      // If turning on continuous mode and we're not listening, start listening
      if (!isListening && connected) {
        startListening();
      }
    } else {
      // Disable conversation mode if turning off continuous listening
      setConversationActive(false);
      
      // If turning off continuous mode and we're listening, stop listening
      if (isListening) {
        stopListening();
      }
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

      // Clear saved session data
      await clearSavedSession();

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
      
      // Still clear saved session data even if there was an error
      await clearSavedSession();
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

  // Send automated greeting when session starts
  const sendGreeting = async () => {
    try {
      // Double-check that session is still valid
      if (!sessionId || !sessionToken || !connected) {
        console.log('Cannot send greeting - no active session');
        return;
      }
      
      console.log('Preparing to send greeting message');
      setSpeaking(true);
      setWaitingForAIResponse(true);
      
      const greetingMessage = "Hello! I'm your AI news assistant. Which news topic would you like me to tell you about today?";
      
      console.log('Sending automated greeting:', greetingMessage);
      
      // Send greeting message task
      const response = await fetch(
        `${API_CONFIG.serverUrl}/v1/streaming.task`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
            text: greetingMessage,
            task_type: 'talk',
          }),
        }
      );

      const data = await response.json();
      console.log('Greeting response:', data);
      
      // Log if response indicates any issue
      if (data.code !== 100) {
        console.error('Greeting API error:', data);
      }
      
      // After sending greeting, just set states appropriately - don't try to restart voice recognition
      // as it should be continuously active
      setTimeout(() => {
        console.log('Finishing greeting response');
        setSpeaking(false);
        setWaitingForAIResponse(false);
      }, 4000);
      
    } catch (error) {
      console.error('Error sending greeting:', error);
      setSpeaking(false);
      setWaitingForAIResponse(false);
    }
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
          
          {!loading && !globalLoading && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: colors.theme }]}
                onPress={createSession}
                disabled={loading || globalLoading}
              >
                <Text style={styles.startButtonText}>Start New Session</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: colors.card }]}
                onPress={loadSavedSession}
                disabled={loading || globalLoading}
              >
                <Text style={[styles.startButtonText, { color: colors.text }]}>Resume Session</Text>
              </TouchableOpacity>
            </View>
          )}
          
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
          continuousMode={continuousMode}
          toggleContinuousMode={toggleContinuousMode}
          partialResults={partialResults}
          conversationActive={conversationActive}
          waitingForAIResponse={waitingForAIResponse}
          onVideoEnd={handleVideoEnd}
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
  continuousMode: boolean;
  toggleContinuousMode: () => void;
  partialResults: string;
  conversationActive: boolean;
  waitingForAIResponse: boolean;
  onVideoEnd: () => void;
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
  continuousMode,
  toggleContinuousMode,
  partialResults,
  conversationActive,
  waitingForAIResponse,
  onVideoEnd,
}: RoomViewProps) => {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true });

  // Add a useEffect to ensure microphone stays active during the session
  useEffect(() => {
    // If we have tracks (avatar is visible) but not listening, start listening
    if (tracks.length > 0 && !isListening && !speaking && continuousMode) {
      console.log('Ensuring voice recognition remains active');
      const timer = setTimeout(() => {
        onStartListening();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [tracks.length, isListening, speaking, continuousMode, onStartListening]);

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
                <CustomStreamingAvatar 
                  trackRef={track} 
                  onVideoEnd={onVideoEnd}
                />
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
          
          {/* Only show partial results in a minimal UI */}
          {continuousMode && partialResults.trim().length > 0 && (
            <View style={styles.partialResultsContainer}>
              <Text style={styles.partialResultsText} numberOfLines={2} ellipsizeMode="tail">
                {partialResults}
              </Text>
            </View>
          )}
        </View>

        {/* Only show the X button for closing */}
        {!isDragging && (
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
              <Icon name="close" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        )}
        
        {/* Show error in a minimal way if needed */}
        {error && !isDragging && (
          <View style={styles.floatingError}>
            <Text style={[styles.floatingErrorText, { color: "#FF5252" }]}>{error}</Text>
          </View>
        )}
        
        {/* Hide everything else */}
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
  buttonContainer: {
    width: '100%',
    marginVertical: 10,
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
  avatarWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  streamingAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    opacity: 0.95,
  },
  videoView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
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
  overlayMicButton: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 4.65,
    zIndex: 100,
  },
  listeningIndicator: {
    position: 'absolute',
    top: -24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  listeningIndicatorText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: FONTS.Medium,
  },
  audioControlsOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  continuousModeButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 4.65,
  },
  partialResultsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    maxWidth: '90%',
    alignSelf: 'center',
  },
  partialResultsText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: FONTS.Regular,
  },
  conversationIndicator: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 8,
    zIndex: 1000,
  },
  conversationIndicatorText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: FONTS.Medium,
    textAlign: 'center',
  },
  buttonLabel: {
    position: 'absolute',
    bottom: -24,
    left: -12,
    right: -12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabelText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: FONTS.Medium,
  },
});

export default HeyGenAvatarScreen; 