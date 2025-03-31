import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import MainNavigator from './MainNavigator';
import {navigationRef} from '../utils/NavigationUtil';

const config = {
  screens: {
    UserProfileScreen: '/user/:username',
    ReelScrollScreen: '/reel/:id',
  },
};

const linking = {
  prefixes: ['reelzzz://', 'https://reelzzz.com', 'https://recaps-backend-277610981315.asia-south1.run.app'],
  // prefixes: ['reelzzz://', 'https://reelzzz.com', 'https://reelzzzserverworking.vercel.app'],
  // prefixes: ['reelzzz://', 'https://reelzzz.com', 'https://192.168.170.133:8080'],
  // prefixes: ['reelzzz://', 'https://reelzzz.com', 'https://192.168.108.133:8080'],
  config,
};

const Navigation: React.FC = () => {
  return (
    <NavigationContainer linking={linking} ref={navigationRef}>
      <MainNavigator />
    </NavigationContainer>
  );
};

export default Navigation;
