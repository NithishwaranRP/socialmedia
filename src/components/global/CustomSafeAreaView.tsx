import React, {FC, ReactNode} from 'react';
import {SafeAreaView, StyleSheet, View, ViewStyle} from 'react-native';
import {Colors} from '../../constants/Colors';
import { StatusBar } from 'react-native';
import { Platform } from 'react-native';

interface CustomSafeAreaViewProps {
  children: ReactNode;
  style?: ViewStyle;
}

const CustomSafeAreaView: FC<CustomSafeAreaViewProps> = ({children, style}) => {
  return (
    <SafeAreaView style={[styles.container, style]}>
                  <StatusBar barStyle="light-content" backgroundColor="black" translucent={true} />
      
      <View style={[styles.container, style]}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // padding: 10,
    backgroundColor: Colors.black,
    marginTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },
});

export default CustomSafeAreaView;
