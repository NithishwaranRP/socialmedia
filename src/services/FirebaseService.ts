import messaging from '@react-native-firebase/messaging';
import {Platform} from 'react-native';
import PushNotification, {Importance} from 'react-native-push-notification';
import { getApp, getApps, initializeApp } from '@react-native-firebase/app';
import { logErrorToStorage } from '../utils/ReleaseErrorLogger';

// Firebase configuration from google-services.json
const firebaseConfig = {
  apiKey: "AIzaSyA2DOlF0EYxkWjltOM0JBCpzK5-dx6SToM", // This is from your google-services.json
  authDomain: "recaps-9fd10.firebaseapp.com",
  projectId: "recaps-9fd10",
  storageBucket: "recaps-9fd10.firebasestorage.app",
  messagingSenderId: "315162978760",
  appId: "1:315162978760:android:64e04a6dbbdb76304ef8fd",
  databaseURL: "https://recaps-9fd10-default-rtdb.firebaseio.com"
};

// Compatibility helper function to check if Firebase is initialized using modern API
const isFirebaseInitialized = () => {
  try {
    // Use the modern API
    return getApps().length > 0;
  } catch (error) {
    console.error('Error checking Firebase initialization:', error);
    logErrorToStorage('FIREBASE_SERVICE_CHECK', `Error: ${error.message}`);
    return false;
  }
};

class FirebaseService {
  constructor() {
    this.initializePushNotifications();
  }

  /**
   * Initialize Firebase Cloud Messaging
   */
  async initializeFirebase() {
    try {
      // Initialize Firebase if it's not already initialized
      if (!isFirebaseInitialized()) {
        console.log('Firebase not initialized, initializing now with config...');
        // Initialize with explicit config to ensure API key is provided
        try {
          // Make sure we're explicitly passing the config object
          const app = initializeApp(firebaseConfig);
          console.log('Firebase app initialized successfully with config');
          logErrorToStorage('FIREBASE_INIT_SUCCESS', 'Firebase initialized with config');
        } catch (initError) {
          console.error('Error during Firebase initialization:', initError);
          logErrorToStorage('FIREBASE_INIT_ERROR', `Error: ${initError.message}`);
          return false;
        }
      } else {
        console.log('Firebase app already initialized');
        // Get the existing app
        try {
          getApp();
        } catch (getAppError) {
          console.error('Error getting existing Firebase app:', getAppError);
          logErrorToStorage('FIREBASE_GETAPP_ERROR', `Error: ${getAppError.message}`);
          
          // Try to re-initialize if getting the app fails
          try {
            console.log('Attempting to re-initialize Firebase...');
            const app = initializeApp(firebaseConfig);
            console.log('Firebase re-initialized successfully');
          } catch (reinitError) {
            console.error('Error re-initializing Firebase:', reinitError);
            logErrorToStorage('FIREBASE_REINIT_ERROR', `Error: ${reinitError.message}`);
            return false;
          }
        }
      }
      
      // Check authorization status
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('Firebase Messaging authorization status:', authStatus);
          
          // Get FCM token
          await this.getFCMToken();
          
          // Register foreground message handler
          this.registerForegroundMessageHandler();
          
          // Register background message handler
          messaging().setBackgroundMessageHandler(this.onMessageReceived);
          
          return true;
        } else {
          console.log('Firebase Messaging authorization denied');
          return false;
        }
      } catch (messagingError) {
        console.error('Error setting up Firebase messaging:', messagingError);
        logErrorToStorage('FIREBASE_MESSAGING_ERROR', `Error: ${messagingError.message}`);
        // Continue with Firebase initialized even if messaging fails
        return true;
      }
    } catch (error) {
      console.error('Firebase initialization error:', error);
      logErrorToStorage('FIREBASE_SERVICE_INIT', `Error: ${error.message}`);
      return false;
    }
  }

  /**
   * Initialize Push Notifications
   */
  initializePushNotifications() {
    PushNotification.configure({
      // (optional) Called when Token is generated (iOS and Android)
      onRegister: function (token) {
        console.log("TOKEN:", token);
      },

      // (required) Called when a remote is received or opened, or local notification is opened
      onNotification: function (notification) {
        console.log("NOTIFICATION:", notification);
        
        // Process the notification here
        
        // Required on iOS only
        notification.finish();
      },

      // (optional) Called when Registered Action is pressed and invokeApp is false, if true onNotification will be called (Android)
      onAction: function (notification) {
        console.log("ACTION:", notification.action);
        console.log("NOTIFICATION:", notification);

        // Process the action
      },

      // (optional) Called when the user fails to register for remote notifications (iOS)
      onRegistrationError: function(err) {
        console.error("Notification registration error:", err.message, err);
      },

      // IOS ONLY (optional): default: all - Permissions to register.
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      // Should the initial notification be popped automatically
      popInitialNotification: true,

      /**
       * (optional) default: true
       * - Specified if permissions (ios) and token (android and ios) will requested or not,
       * - if not, you must call PushNotificationsHandler.requestPermissions() later
       */
      requestPermissions: Platform.OS === 'ios',
    });

    // Create Android notification channels
    if (Platform.OS === 'android') {
      this.createNotificationChannels();
    }
  }

  /**
   * Create Android notification channels
   */
  createNotificationChannels() {
    PushNotification.createChannel(
      {
        channelId: "default-channel",
        channelName: "Default Channel",
        channelDescription: "Default notifications channel",
        importance: Importance.HIGH,
        vibrate: true,
      },
      (created) => console.log(`Default channel created: ${created}`)
    );
    
    PushNotification.createChannel(
      {
        channelId: "reminder-channel",
        channelName: "Reminders",
        channelDescription: "Reminder notifications",
        importance: Importance.HIGH,
        vibrate: true,
      },
      (created) => console.log(`Reminder channel created: ${created}`)
    );
  }

  /**
   * Get FCM token for this device
   */
  async getFCMToken() {
    try {
      const fcmToken = await messaging().getToken();
      console.log('=============================================');
      console.log('FCM TOKEN FOR PUSH NOTIFICATIONS:');
      console.log(fcmToken);
      console.log('=============================================');
      return fcmToken;
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      return null;
    }
  }

  /**
   * Register foreground message handler
   */
  registerForegroundMessageHandler() {
    return messaging().onMessage(this.onMessageReceived);
  }

  /**
   * Handle received FCM messages
   */
  onMessageReceived = async (message: any) => {
    console.log('FCM Message received:', message);
    
    // Extract notification data
    const notification = message.notification || {};
    const data = message.data || {};
    
    // Show local notification
    this.showLocalNotification(
      notification.title || 'New Message',
      notification.body || 'You have a new message',
      data
    );
  }

  /**
   * Show a local notification
   */
  showLocalNotification(title: string, message: string, data: any = {}) {
    PushNotification.localNotification({
      channelId: data.channelId || 'default-channel',
      title,
      message,
      playSound: true,
      soundName: 'default',
      importance: 'high',
      vibrate: true,
      data: data,
    });
  }

  /**
   * Schedule a local notification
   */
  scheduleLocalNotification(title: string, message: string, date: Date, data: any = {}) {
    PushNotification.localNotificationSchedule({
      channelId: data.channelId || 'default-channel',
      title,
      message,
      date,
      playSound: true,
      soundName: 'default',
      importance: 'high',
      vibrate: true,
      data: data,
    });
  }
}

// Create a singleton instance
const firebaseService = new FirebaseService();
export default firebaseService; 