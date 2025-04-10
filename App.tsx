import 'react-native-gesture-handler';
import './src/sheets/sheet';
import React, {useEffect} from 'react';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import Navigation from './src/navigation/Navigation';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Platform, StatusBar, PermissionsAndroid} from 'react-native';
import {Provider} from 'react-redux';
import {persistor, store} from './src/redux/store';
import {PersistGate} from 'redux-persist/integration/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebaseService from './src/services/FirebaseService';
import firebase from '@react-native-firebase/app';

// Compatibility helper function to check if Firebase is initialized
const isFirebaseInitialized = () => {
  try {
    // Try the newer API first
    if (typeof (firebase as any).getApps === 'function') {
      return (firebase as any).getApps().length > 0;
    }
    // Fall back to the older API
    if ((firebase as any).apps && Array.isArray((firebase as any).apps)) {
      return (firebase as any).apps.length > 0;
    }
    // If neither is available, assume it's not initialized
    return false;
  } catch (error) {
    console.error('Error checking Firebase initialization:', error);
    return false;
  }
};

// Log the initialization state of Firebase
try {
  console.log('Firebase initialization status:', isFirebaseInitialized() ? 'Initialized' : 'Not initialized');
} catch (error) {
  console.log('Could not check Firebase initialization status');
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

const App = () => {
  useEffect(() => {
    // Initialize Firebase - do this first before anything else
    const setupFirebase = async () => {
      try {
        console.log('Starting Firebase initialization...');
        const isInitialized = await firebaseService.initializeFirebase();
        console.log('Firebase initialization complete:', isInitialized);
      } catch (error) {
        console.error('Firebase initialization error in App.tsx:', error);
      }
    };
    
    setupFirebase();
    
    // Request notification permissions on Android
    const requestNotificationPermission = async () => {
      if (Platform.OS === 'android' && parseInt(Platform.Version.toString(), 10) >= 33) {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log("Notification permission granted");
          } else {
            console.log("Notification permission denied");
          }
        } catch (err) {
          console.warn(err);
        }
      }
    };
    
    requestNotificationPermission();

    // IMPORTANT: Selectively clear AsyncStorage to preserve navigation state
    const clearSelectiveStorage = async () => {
      try {
        // Define keys to preserve (navigation state keys)
        const keysToPreserve = ['lastActiveCategoryIndex', 'persist:root'];
        
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
      } catch (e) {
        console.error("Failed to manage AsyncStorage:", e);
      }
    };

    clearSelectiveStorage();
  }, []);

  return (
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
  );
};

export default App;
