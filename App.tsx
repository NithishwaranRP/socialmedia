import 'react-native-gesture-handler';
import './src/sheets/sheet';
import React, {useEffect, ErrorInfo} from 'react';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import Navigation from './src/navigation/Navigation';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Platform, StatusBar, PermissionsAndroid, Text, View, StyleSheet, Alert, TouchableOpacity} from 'react-native';
import {Provider} from 'react-redux';
import {persistor, store} from './src/redux/store';
import {PersistGate} from 'redux-persist/integration/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebaseService from './src/services/FirebaseService';
import { getApps } from '@react-native-firebase/app';
import { AudioSession } from '@livekit/react-native';
import { setupGlobalErrorHandler, logStartupEvent, logErrorToStorage, retrieveErrorLogs, clearLogs, safeExecute } from './src/utils/ReleaseErrorLogger';

// Initialize error handler
setupGlobalErrorHandler();

// Error Boundary to catch WebRTC initialization failures
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null, errorInfo: ErrorInfo | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console and our storage
    console.error('App Error Boundary caught an error:', error, errorInfo);
    logErrorToStorage('ERROR_BOUNDARY', `${error.message}\n${error.stack || 'No stack'}`);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI when an error occurs
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{this.state.error?.message}</Text>
          <Text style={styles.errorDetail}>Please restart the app</Text>
          
          {/* Add button to view error logs */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.logButton}
              onPress={async () => {
                try {
                  const logs = await retrieveErrorLogs();
                  Alert.alert(
                    'Error Logs',
                    `Last errors:\n${logs.errors.slice(-3).join('\n\n')}`,
                    [{ text: 'OK' }]
                  );
                } catch (err) {
                  Alert.alert('Failed to retrieve logs');
                }
              }}
            >
              <Text style={styles.buttonText}>View Logs</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.logButton, {backgroundColor: '#ff5252'}]}
              onPress={async () => {
                try {
                  await clearLogs();
                  Alert.alert('Logs cleared');
                } catch (err) {
                  Alert.alert('Failed to clear logs');
                }
              }}
            >
              <Text style={styles.buttonText}>Clear Logs</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Update the Firebase initialization check function to use modern API
const isFirebaseInitialized = () => {
  try {
    // Use the modern API
    return getApps().length > 0;
  } catch (error) {
    console.error('Error checking Firebase initialization:', error);
    logErrorToStorage('FIREBASE_CHECK', `Error: ${error.message}`);
    return false;
  }
};

// Log the initialization state of Firebase
try {
  console.log('Firebase initialization status:', isFirebaseInitialized() ? 'Initialized' : 'Not initialized');
  logStartupEvent('App', `Firebase status: ${isFirebaseInitialized() ? 'Initialized' : 'Not initialized'}`);
} catch (error) {
  console.log('Could not check Firebase initialization status');
  logErrorToStorage('FIREBASE_STATUS', `Error: ${error.message}`);
}

GoogleSignin.configure({
  webClientId:
    '315162978760-jd7ekipqmn009igv83ch12nifda51aai.apps.googleusercontent.com',
    // '555301270349-0n83fvkce0hjp6clrln5obth6lsepm1d.apps.googleusercontent.com',
  // For Android, the webClientId is used as the default client ID
  // Make sure to add the SHA-1 fingerprint to your Google Cloud Console project
  // SHA-1: AD:82:43:8D:80:99:BB:43:FD:CE:AB:FF:04:68:9F:D5:91:D5:19:11
  forceCodeForRefreshToken: true,
  offlineAccess: false,
  //   'YOUR_GOOGLE_IOS_CLIENT_ID',
});

// Initialize LiveKit audio in a safe way
const initLiveKitAudio = async () => {
  try {
    logStartupEvent('App', 'Starting LiveKit audio initialization');
    if (Platform.OS === 'android') {
      // Try to initialize LiveKit audio but handle potential failures
      try {
        await AudioSession.startAudioSession();
        logStartupEvent('App', 'LiveKit AudioSession initialized successfully');
        console.log('LiveKit AudioSession initialized successfully');
      } catch (error) {
        logErrorToStorage('LIVEKIT_AUDIO', `Error: ${error.message}`);
        console.error('Failed to initialize LiveKit AudioSession:', error);
        // Continue anyway - this is not critical for app startup
      }
    }
  } catch (error) {
    logErrorToStorage('AUDIO_INIT', `Error: ${error.message}`);
    console.error('Error in audio initialization:', error);
  }
};

const App = () => {
  useEffect(() => {
    // Log app start
    logStartupEvent('App', 'Application launched');
    
    // Initialize Firebase - do this first before anything else
    const setupFirebase = async () => {
      try {
        logStartupEvent('App', 'Starting Firebase initialization');
        console.log('Starting Firebase initialization...');
        
        // Initialize Firebase with a retry mechanism
        let retryCount = 0;
        const maxRetries = 2;
        let isInitialized = false;
        
        while (!isInitialized && retryCount <= maxRetries) {
          try {
            isInitialized = await firebaseService.initializeFirebase();
            if (isInitialized) {
              console.log('Firebase initialized successfully');
              break;
            } else {
              console.log(`Firebase initialization attempt ${retryCount + 1} failed, retrying...`);
              retryCount++;
              
              // Small delay before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (initError: any) {
            console.error(`Firebase initialization attempt ${retryCount + 1} error:`, initError);
            logErrorToStorage('FIREBASE_INIT_RETRY', `Attempt ${retryCount + 1} Error: ${initError.message}`);
            retryCount++;
            
            // Small delay before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        logStartupEvent('App', `Firebase initialization complete: ${isInitialized}`);
        console.log('Firebase initialization complete:', isInitialized);
      } catch (error: any) {
        logErrorToStorage('FIREBASE_INIT', `Error: ${error.message}`);
        console.error('Firebase initialization error in App.tsx:', error);
      }
    };
    
    setupFirebase();
    
    // Initialize LiveKit audio
    initLiveKitAudio();
    
    // Request notification permissions on Android
    const requestNotificationPermission = async () => {
      if (Platform.OS === 'android' && parseInt(Platform.Version.toString(), 10) >= 33) {
        try {
          logStartupEvent('App', 'Requesting notification permission');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            logStartupEvent('App', 'Notification permission granted');
            console.log("Notification permission granted");
          } else {
            logStartupEvent('App', 'Notification permission denied');
            console.log("Notification permission denied");
          }
        } catch (err) {
          logErrorToStorage('NOTIFICATION_PERMISSION', `Error: ${err.message}`);
          console.warn(err);
        }
      }
    };
    
    requestNotificationPermission();

    // IMPORTANT: Selectively clear AsyncStorage to preserve navigation state
    const clearSelectiveStorage = async () => {
      try {
        logStartupEvent('App', 'Starting selective storage clear');
        // Define keys to preserve (navigation state keys)
        const keysToPreserve = ['lastActiveCategoryIndex', 'persist:root', 'DEBUG_ERROR_LOG', 'DEBUG_STARTUP_LOG'];
        
        // Get the values to preserve
        const preservedValues: Record<string, string | null> = {};
        for (const key of keysToPreserve) {
          preservedValues[key] = await AsyncStorage.getItem(key);
          console.log(`Preserving ${key}:`, preservedValues[key]);
        }
        
        // Get all keys from AsyncStorage
        const allKeys = await AsyncStorage.getAllKeys();
        console.log('All AsyncStorage keys:', allKeys);
        
        // Get keys to remove (all except those to preserve)
        const keysToRemove = allKeys.filter(key => !keysToPreserve.includes(key));
        
        if (keysToRemove.length > 0) {
          // Only remove the keys that should not be preserved
          await AsyncStorage.multiRemove(keysToRemove);
          console.log("Selectively cleared AsyncStorage keys:", keysToRemove);
        }
        
        // Restore preserved values
        for (const [key, value] of Object.entries(preservedValues)) {
          if (value !== null) {
            await AsyncStorage.setItem(key, value);
            console.log(`Restored ${key}:`, value);
          }
        }
        
        logStartupEvent('App', 'Completed selective storage clear');
      } catch (e) {
        logErrorToStorage('STORAGE_CLEAR', `Error: ${e.message}`);
        console.error("Failed to manage AsyncStorage:", e);
      }
    };

    clearSelectiveStorage();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{flex: 1}}>
        <StatusBar
          translucent={Platform.OS === 'ios'}
          backgroundColor="transparent"
        />
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <Navigation />
          </PersistGate>
        </Provider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'red',
  },
  errorMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  logButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginHorizontal: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default App;
