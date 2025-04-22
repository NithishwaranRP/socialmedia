import React, { useRef, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView,
  Platform,
  Share
} from 'react-native';
import WebView from 'react-native-webview';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RFValue } from 'react-native-responsive-fontsize';
import { useThemeColors } from '../constants/Colors';
import CustomText from '../components/global/CustomText';
import { FONTS } from '../constants/Fonts';
import { screenHeight, screenWidth } from '../utils/Scaling';

interface WebViewScreenParams {
  url: string;
  title?: string;
}

const WebViewScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  
  const params = route.params as WebViewScreenParams;
  const { url, title = 'Web Content' } = params;
  
  const handleBackPress = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      return;
    }
    navigation.goBack();
  };
  
  const handleShare = async () => {
    try {
      await Share.share({
        message: currentUrl || url,
        url: currentUrl || url,
      });
    } catch (error) {
      console.error('Error sharing URL:', error);
    }
  };
  
  const handleNavigationStateChange = (navState: any) => {
    setCurrentUrl(navState.url);
    setCanGoBack(navState.canGoBack);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Icon name={canGoBack ? "arrow-back" : "close"} size={RFValue(24)} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <CustomText 
            variant="h6" 
            fontFamily={FONTS.Medium} 
            numberOfLines={1}
            style={styles.title}
          >
            {title}
          </CustomText>
        </View>
        
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Icon name="share" size={RFValue(22)} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      {/* WebView */}
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webView}
          startInLoadingState={true}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.theme} />
            </View>
          )}
          onNavigationStateChange={handleNavigationStateChange}
        />
        
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.theme} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: Platform.OS === 'ios' ? 50 : 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 5,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  title: {
    textAlign: 'center',
  },
  shareButton: {
    padding: 5,
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});

export default WebViewScreen; 