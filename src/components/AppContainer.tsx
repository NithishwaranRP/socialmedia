import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { useAvatarPopup } from '../context/AvatarPopupContext';
import HeyGenAvatarScreen from './HeyGenAvatar/HeyGenAvatarScreen';
import { InteractiveAvatarScreen } from './HeyGenAvatar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { FONTS } from '../constants/Fonts';

interface AppContainerProps {
  children: React.ReactNode;
}

const AppContainer: React.FC<AppContainerProps> = ({ children }) => {
  const { showAIAvatar, setShowAIAvatar, isLoading } = useAvatarPopup();
  const [showInteractiveAvatar, setShowInteractiveAvatar] = useState(false);

  const handleDismiss = () => {
    // Only hide the avatar but preserve its position
    setShowAIAvatar(false);
  };

  const handleInteractiveDismiss = () => {
    setShowInteractiveAvatar(false);
  };

  return (
    <View style={styles.container}>
      {children}
      {/* Regular AI Avatar popup */}
      {showAIAvatar && (
        <HeyGenAvatarScreen onDismiss={handleDismiss} />
      )}
      
      {/* Interactive Avatar popup */}
      {showInteractiveAvatar && (
        <InteractiveAvatarScreen onDismiss={handleInteractiveDismiss} />
      )}
      
      {/* Global loading indicator */}
      {isLoading && !showAIAvatar && (
        <View style={styles.globalLoadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  globalLoadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  interactiveButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#4285F4',
    borderRadius: 28,
    width: 140,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  buttonText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 14,
    fontFamily: FONTS.Medium,
  },
});

export default AppContainer; 