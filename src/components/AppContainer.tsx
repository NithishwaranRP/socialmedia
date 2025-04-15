import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAvatarPopup } from '../context/AvatarPopupContext';
import HeyGenAvatarScreen from './HeyGenAvatar/HeyGenAvatarScreen';

interface AppContainerProps {
  children: React.ReactNode;
}

const AppContainer: React.FC<AppContainerProps> = ({ children }) => {
  const { showAIAvatar, setShowAIAvatar, isLoading } = useAvatarPopup();

  const handleDismiss = () => {
    // Only hide the avatar but preserve its position
    setShowAIAvatar(false);
  };

  return (
    <View style={styles.container}>
      {children}
      
      {/* Render AI Avatar popup when needed */}
      {showAIAvatar && (
        <HeyGenAvatarScreen onDismiss={handleDismiss} />
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
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
});

export default AppContainer; 