import React, { useState, useEffect } from 'react';
import { View, Button, StyleSheet, Text, Alert, TouchableOpacity, Clipboard } from 'react-native';
import firebaseService from '../services/FirebaseService';
import firebase from '@react-native-firebase/app';

// Compatibility helper function to check if Firebase is initialized
const isFirebaseInitialized = () => {
  try {
    // Try the newer API first
    if (typeof firebase.getApps === 'function') {
      return firebase.getApps().length > 0;
    }
    // Fall back to the older API
    if (firebase.apps && Array.isArray(firebase.apps)) {
      return firebase.apps.length > 0;
    }
    // If neither is available, assume it's not initialized
    return false;
  } catch (error) {
    console.error('Error checking Firebase initialization:', error);
    return false;
  }
};

const NotificationTest = () => {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  // Check Firebase initialization status and get FCM token
  useEffect(() => {
    const checkFirebase = async () => {
      const appsInitialized = isFirebaseInitialized();
      setIsFirebaseReady(appsInitialized);
      
      if (appsInitialized) {
        try {
          const token = await firebaseService.getFCMToken();
          setFcmToken(token);
          console.log('FCM Token:', token);
        } catch (error) {
          console.error('Error getting FCM token:', error);
        }
      }
    };
    
    checkFirebase();
    
    // Check again after a delay to allow Firebase to initialize
    const timer = setTimeout(checkFirebase, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  const checkFirebaseReady = () => {
    const ready = isFirebaseInitialized();
    setIsFirebaseReady(ready);
    
    if (!ready) {
      Alert.alert(
        "Firebase Not Initialized",
        "Firebase has not been initialized yet. Please wait a moment and try again.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  const copyTokenToClipboard = () => {
    if (fcmToken) {
      Clipboard.setString(fcmToken);
      Alert.alert('Success', 'FCM token copied to clipboard');
    }
  };
  
  const sendTestNotification = () => {
    if (!checkFirebaseReady()) return;
    
    try {
      firebaseService.showLocalNotification(
        'Test Notification',
        'This is a test notification from the app!',
        { type: 'test' }
      );
    } catch (error) {
      console.error('Failed to send notification:', error);
      Alert.alert('Error', 'Failed to send notification. Check console for details.');
    }
  };

  const sendScheduledNotification = () => {
    if (!checkFirebaseReady()) return;
    
    try {
      // Schedule notification for 5 seconds from now
      const fiveSecondsFromNow = new Date(Date.now() + 5 * 1000);
      
      firebaseService.scheduleLocalNotification(
        'Scheduled Notification',
        'This notification was scheduled to appear 5 seconds after the button was pressed.',
        fiveSecondsFromNow,
        { type: 'scheduled', channelId: 'reminder-channel' }
      );
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      Alert.alert('Error', 'Failed to schedule notification. Check console for details.');
    }
  };

  const initializeFirebaseManually = async () => {
    try {
      await firebaseService.initializeFirebase();
      setIsFirebaseReady(isFirebaseInitialized());
      Alert.alert('Success', 'Firebase initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      Alert.alert('Error', 'Failed to initialize Firebase. Check console for details.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Tests</Text>
      
      <Text style={[styles.status, isFirebaseReady ? styles.statusReady : styles.statusNotReady]}>
        Firebase Status: {isFirebaseReady ? 'Ready' : 'Not Initialized'}
      </Text>

      {fcmToken ? (
        <TouchableOpacity onPress={copyTokenToClipboard} style={styles.tokenContainer}>
          <Text style={styles.tokenLabel}>FCM Token (tap to copy):</Text>
          <Text style={styles.tokenText} numberOfLines={1} ellipsizeMode="middle">
            {fcmToken}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.tokenLabel}>FCM Token: Loading...</Text>
      )}
      
      <View style={styles.spacer} />

      <Button 
        title="Send Test Notification" 
        onPress={sendTestNotification}
        color="#007BFF" 
      />
      
      <View style={styles.spacer} />
      
      <Button 
        title="Schedule Notification (5s)" 
        onPress={sendScheduledNotification}
        color="#28a745" 
      />

      {!isFirebaseReady && (
        <>
          <View style={styles.spacer} />
          <Button 
            title="Initialize Firebase" 
            onPress={initializeFirebaseManually}
            color="#dc3545" 
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#343a40',
    textAlign: 'center',
  },
  status: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusReady: {
    color: '#28a745',
  },
  statusNotReady: {
    color: '#dc3545',
  },
  tokenContainer: {
    backgroundColor: '#e9ecef',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  tokenLabel: {
    fontSize: 12,
    color: '#495057',
    marginBottom: 4,
  },
  tokenText: {
    fontSize: 10,
    color: '#212529',
    fontFamily: 'monospace',
  },
  spacer: {
    height: 16,
  },
});

export default NotificationTest; 