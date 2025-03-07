import 'react-native-gesture-handler';
import './src/sheets/sheet';
import React from 'react';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import Navigation from './src/navigation/Navigation';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Platform, StatusBar} from 'react-native';
import {Provider} from 'react-redux';
import {persistor, store} from './src/redux/store';
import {PersistGate} from 'redux-persist/integration/react';

GoogleSignin.configure({
  webClientId:
    // '517832991609-n58najmkg1oub2477ep4n8emuigtulrn.apps.googleusercontent.com',
    '555301270349-0n83fvkce0hjp6clrln5obth6lsepm1d.apps.googleusercontent.com',
  forceCodeForRefreshToken: true,
  offlineAccess: false,
  //   'YOUR_GOOGLE_IOS_CLIENT_ID',
});

const App = () => {
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
