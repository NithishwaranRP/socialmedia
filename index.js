// /**
//  * @format
//  */
// import { decode } from 'base-64';
// global.atob = decode;

// import {AppRegistry,Text, TextInput} from 'react-native';
// import App from './App';
// import {name as appName} from './app.json';
// // Override Text scaling
// if (Text.defaultProps) {
//     Text.defaultProps.allowFontScaling = false;
//   } else {
//     Text.defaultProps = {};
//     Text.defaultProps.allowFontScaling = false;
//   }
  
//   // Override Text scaling in input fields
//   if (TextInput.defaultProps) {
//     TextInput.defaultProps.allowFontScaling = false;
//   } else {
//     TextInput.defaultProps = {};
//     TextInput.defaultProps.allowFontScaling = false;
//   }
// AppRegistry.registerComponent(appName, () => App);

import { decode } from 'base-64';
global.atob = decode;

import 'react-native-gesture-handler'; // Ensure it's at the top for navigation
import { enableScreens } from 'react-native-screens';
import 'react-native-reanimated'; // Required for Reanimated worklets
enableScreens();

import { AppRegistry, Text, TextInput } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Override Text scaling
if (Text.defaultProps == null) {
  Text.defaultProps = {};
}
Text.defaultProps.allowFontScaling = false;

// Override Text scaling in input fields
if (TextInput.defaultProps == null) {
  TextInput.defaultProps = {};
}
TextInput.defaultProps.allowFontScaling = false;

AppRegistry.registerComponent(appName, () => App);