// import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
// import {FC} from 'react';
// import HomeScreen from '../screens/dashboard/HomeScreen';
// import ProfileScreen from '../screens/dashboard/ProfileScreen';
// import {Image, Platform, TouchableOpacity} from 'react-native';
// import {RFValue} from 'react-native-responsive-fontsize';
// import {Colors} from '../constants/Colors';
// import {HomeTabIcon, ProfileTabIcon} from './TabIcon';
// import {bottomBarStyles} from '../styles/NavigationBarStyles';
// import {navigate} from '../utils/NavigationUtil';
// const Tab = createBottomTabNavigator();

// const BottomTab: FC = () => {
//   return (
//     <Tab.Navigator
//       screenOptions={({route}) => ({
//         headerShown: false,
//         tabBarHideOnKeyboard: true,
//         tabBarStyle: {
//           paddingTop: Platform.OS === 'ios' ? RFValue(5) : 0,
//           paddingBottom: Platform.OS === 'ios' ? 20 : 10,
//           backgroundColor: 'transparent',
//           height: Platform.OS === 'android' ? 70 : 80,
//           borderTopWidth: 0,
//           position: 'absolute',
//         },
//         tabBarActiveTintColor: Colors.theme,
//         tabBarInactiveTintColor: '#447777',
//         headerShadowVisible: false,
//         tabBarShowLabel: false,
//         tabBarIcon: ({focused}) => {
//           if (route.name === 'Home') {
//             return <HomeTabIcon focused={focused} />;
//           }
//           if (route.name === 'Profile') {
//             return <ProfileTabIcon focused={focused} />;
//           }
//         },
//       })}>
//       <Tab.Screen name="Home" component={HomeScreen} />
//       <Tab.Screen
//         name="Post"
//         component={HomeScreen}
//         options={{
//           tabBarIcon: () => {
//             return (
//               <TouchableOpacity
//                 onPress={() => navigate('PickReelScreen')}
//                 activeOpacity={0.5}
//                 style={bottomBarStyles.customMiddleButton}>
//                 <Image
//                   style={bottomBarStyles.tabIcon}
//                   source={require('../assets/icons/add.png')}
//                 />
//               </TouchableOpacity>
//             );
//           },
//           headerShown: false,
//         }}
//         listeners={{
//           tabPress: e => {
//             e.preventDefault();
//           },
//         }}
//       />
//       <Tab.Screen name="Profile" component={ProfileScreen} />
//     </Tab.Navigator>
//   );
// };
// export default BottomTab;

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform, Image, TouchableOpacity, View, StyleSheet } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import HomeScreen from "../screens/dashboard/HomeScreen";
import ProfileScreen from "../screens/dashboard/ProfileScreen";
import { Colors, useThemeColors } from "../constants/Colors";
import { navigate } from "../utils/NavigationUtil";
import { useAppSelector } from "../redux/reduxHook";
import { RootState } from "../redux/store";

const Tab = createBottomTabNavigator();

const BottomTab = () => {
  const isDarkMode = useAppSelector((state: RootState) => state.theme.isDarkMode);
  const colors = useThemeColors();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: "absolute",
          bottom: RFValue(20),
          height: RFValue(60),
          backgroundColor: "transparent",
          borderRadius: RFValue(30),
          paddingHorizontal: RFValue(15),
          borderTopWidth: 0,
          borderTopColor: "transparent",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
          elevation: 5,
        },
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => {
          let iconSource;
          if (route.name === "Home") {
            iconSource = require("../assets/icons/home.png");
          } else if (route.name === "Profile") {
            iconSource = require("../assets/icons/profile.png");
          }

          return (
            <View style={[
              styles.iconContainer, 
              focused ? 
                isDarkMode ? styles.activeTabDark : styles.activeTabLight 
                : 
                isDarkMode ? styles.inactiveTabDark : styles.inactiveTabLight
            ]}>
              <Image 
                source={iconSource} 
                style={[
                  styles.tabIcon, 
                  focused ? 
                    isDarkMode ? styles.activeIconDark : styles.activeIconLight 
                    : 
                    isDarkMode ? styles.inactiveIconDark : styles.inactiveIconLight
                ]} 
                resizeMode="contain" 
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Post"
        component={HomeScreen}
        options={{
          tabBarIcon: () => (
            <TouchableOpacity onPress={() => navigate("PickReelScreen")} activeOpacity={0.8}>
              <View style={isDarkMode ? styles.postButtonContainerDark : styles.postButtonContainerLight}>
                <Image 
                  style={isDarkMode ? styles.postButtonDark : styles.postButtonLight} 
                  source={require("../assets/icons/nav.png")} 
                />
              </View>
            </TouchableOpacity>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIcon: {
    width: RFValue(24),
    height: RFValue(24),
  },
  iconContainer: {
    borderRadius: 30,
    padding: RFValue(10),
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: RFValue(5),
  },
  // Dark mode styles
  activeTabDark: {
    backgroundColor: "#FFFFFF",
  },
  inactiveTabDark: {
    backgroundColor: "#282A2D",
  },
  activeIconDark: {
    tintColor: "#282A2D",
    opacity: 1,
  },
  inactiveIconDark: {
    tintColor: "#FFFFFF",
    opacity: 0.8,
  },
  postButtonContainerDark: {
    backgroundColor: "#282A2D",
    borderRadius: 30,
    padding: RFValue(10),
    justifyContent: "center",
    alignItems: "center",
  },
  postButtonDark: {
    width: RFValue(30),
    height: RFValue(30),
    tintColor: "#FFFFFF",
  },
  
  // Light mode styles
  activeTabLight: {
    backgroundColor: "#282A2D",
  },
  inactiveTabLight: {
    backgroundColor: "#FFFFFF",
  },
  activeIconLight: {
    tintColor: "#FFFFFF",
    opacity: 1,
  },
  inactiveIconLight: {
    tintColor: "#282A2D",
    opacity: 0.8,
  },
  postButtonContainerLight: {
    backgroundColor: "#ffffff",
    borderRadius: 30,
    padding: RFValue(10),
    justifyContent: "center",
    alignItems: "center",
  },
  postButtonLight: {
    width: RFValue(30),
    height: RFValue(30),
    tintColor: "#282A2D",
  },
});

export default BottomTab;
