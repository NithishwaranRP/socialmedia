import 'react-native-gesture-handler';
import './src/sheets/sheet';
import React, {useEffect} from 'react';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import Navigation from './src/navigation/Navigation';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Platform, StatusBar} from 'react-native';
import {Provider} from 'react-redux';
import {persistor, store} from './src/redux/store';
import {PersistGate} from 'redux-persist/integration/react';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage

GoogleSignin.configure({
  webClientId:
    // '517832991609-n58najmkg1oub2477ep4n8emuigtulrn.apps.googleusercontent.com',
    '555301270349-0n83fvkce0hjp6clrln5obth6lsepm1d.apps.googleusercontent.com',
  forceCodeForRefreshToken: true,
  offlineAccess: false,
  //   'YOUR_GOOGLE_IOS_CLIENT_ID',
});

const App = () => {
  useEffect(() => {
    // IMPORTANT: Selectively clear AsyncStorage to preserve navigation state
    const clearSelectiveStorage = async () => {
      try {
        // Define keys to preserve (navigation state keys)
        const keysToPreserve = ['lastActiveCategoryIndex'];
        
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
