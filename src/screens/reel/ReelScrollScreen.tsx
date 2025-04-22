import React, {FC, useCallback, useMemo, useRef, useState, useEffect} from 'react';
import {
  FlatList,
  Image,
  Platform,
  StyleSheet,
  TouchableOpacity,
  ViewToken,
  View,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Text,
  Animated,
  ToastAndroid,
} from 'react-native';
import VideoItem from '../../components/reel/VideoItem';
import CustomView from '../../components/global/CustomView';
import {goBack} from '../../utils/NavigationUtil';
import {RFValue} from 'react-native-responsive-fontsize';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useRoute, useNavigation} from '@react-navigation/native';
import {screenHeight, screenWidth} from '../../utils/Scaling';
import {debounce} from 'lodash';
import {WebView} from 'react-native-webview';
import CustomText from '../../components/global/CustomText';
import {FONTS} from '../../constants/Fonts';
import {Colors, useThemeColors} from '../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use require instead of import for the loader image
const loaderGif = require('../../assets/images/loader.jpg');

interface RouteProp {
  data: any[];
  index: number;
}

const ReelScrollScreen: FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const routeParams = route?.params as RouteProp;
  const colors = useThemeColors();

  const [currentVisibleIndex, setCurrentVisibleIndex] = useState<number>(
    routeParams.index || 0,
  );
  
  // Ref for horizontal FlatList
  const horizontalFlatListRef = useRef<FlatList>(null);
  const [webViewUrl, setWebViewUrl] = useState<string>('');
  const [webViewLoading, setWebViewLoading] = useState<boolean>(true);
  const [webViewError, setWebViewError] = useState<boolean>(false);
  const [horizontalIndex, setHorizontalIndex] = useState<number>(0);
  const [showHintOverlay, setShowHintOverlay] = useState<boolean>(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const webViewRef = useRef<WebView>(null);
  
  // Get the current reel data
  const currentReel = useMemo(() => {
    return routeParams?.data?.[currentVisibleIndex] || null;
  }, [routeParams?.data, currentVisibleIndex]);
  
  // Check if current reel has URL
  const hasUrl = useMemo(() => {
    return !!currentReel?.url;
  }, [currentReel]);

  // Check if we should show the hint overlay
  useEffect(() => {
    const checkFirstTimeViewer = async () => {
      try {
        const hasSeenHint = await AsyncStorage.getItem('hasSeenReelScrollHint');
        if (!hasSeenHint && hasUrl && horizontalIndex === 0) {
          // Show the hint after a brief delay
          setTimeout(() => {
            setShowHintOverlay(true);
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }).start();

            // Hide the hint after 3 seconds
            setTimeout(() => {
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }).start(() => setShowHintOverlay(false));
              
              // Mark that user has seen the hint
              AsyncStorage.setItem('hasSeenReelScrollHint', 'true');
            }, 3000);
          }, 1000);
        }
      } catch (error) {
        console.error('Error checking first time viewer status:', error);
      }
    };

    checkFirstTimeViewer();
  }, [hasUrl, horizontalIndex, fadeAnim]);

  // Update webview URL when visible reel changes
  useEffect(() => {
    if (currentReel && currentReel.url) {
      setWebViewUrl(currentReel.url);
    }
  }, [currentVisibleIndex, currentReel]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  // Add state to track video initialization
  const [initializedVideos, setInitializedVideos] = useState<Set<string>>(new Set());

  // Track video initialization in a separate effect, not in render function
  useEffect(() => {
    // Only initialize videos when currentVisibleIndex changes
    if (!routeParams?.data || routeParams.data.length === 0) return;
    
    const videoToInitialize: string[] = [];
    
    // Initialize current video
    if (routeParams.data[currentVisibleIndex]?._id) {
      videoToInitialize.push(routeParams.data[currentVisibleIndex]._id);
    }
    
    // Pre-initialize next videos
    const nextIndices = [currentVisibleIndex + 1, currentVisibleIndex + 2];
    nextIndices.forEach(nextIndex => {
      if (nextIndex < routeParams.data.length && routeParams.data[nextIndex]?._id) {
        videoToInitialize.push(routeParams.data[nextIndex]._id);
      }
    });
    
    // Update initialized videos state
    if (videoToInitialize.length > 0) {
      setInitializedVideos(prev => {
        const updated = new Set(prev);
        videoToInitialize.forEach(id => updated.add(id));
        return updated;
      });
    }
  }, [currentVisibleIndex, routeParams?.data]);

  const onViewableItemsChanged = useRef(
    debounce(({viewableItems}: {viewableItems: Array<ViewToken>}) => {
      if (viewableItems.length > 0) {
        const newIndex = viewableItems[0].index || 0;
        // Only update if the index actually changed to avoid unnecessary re-renders
        if (newIndex !== currentVisibleIndex) {
          setCurrentVisibleIndex(newIndex);
        }
      }
    }, 200),
  ).current;

  const renderVideoList = useCallback(
    ({item, index}: {item: any; index: number}) => {
      // Remove state update from here to prevent infinite loop
      return (
        <VideoItem
          item={item}
          isVisible={index === currentVisibleIndex && horizontalIndex === 0}
          preload={Math.abs(currentVisibleIndex - index) <= 2}
        />
      );
    },
    [currentVisibleIndex, horizontalIndex],
  );

  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: screenHeight,
      offset: screenHeight * index,
      index,
    }),
    [],
  );

  const keyExtractor = useCallback((item: any) => item._id.toString(), []);
  
  // Fix memoizedValue dependencies to include renderVideoList
  const memoizedValue = useMemo(
    () => renderVideoList,
    [renderVideoList],
  );

  // JavaScript to inject in WebView to disable audio
  const muteAudioJS = `
    (function() {
      // Function to mute all audio/video elements
      function muteAllMedia() {
        document.querySelectorAll('video, audio').forEach(media => {
          media.muted = true;
        });
      }
      
      // Initial muting
      muteAllMedia();
      
      // Observer to watch for new media elements
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.addedNodes.length) {
            muteAllMedia();
          }
        });
      });
      
      // Start observing
      observer.observe(document.body, { childList: true, subtree: true });
      
      // Also handle after load events
      window.addEventListener('load', muteAllMedia);
      document.addEventListener('DOMContentLoaded', muteAllMedia);
    })();
  `;

  // Handle swipe back detection for WebView
  const handleWebViewNavigationStateChange = (navState: any) => {
    if (webViewRef.current && navState.canGoBack) {
      // Let WebView handle its own back navigation
    } else if (navState.navigationType === 'backforward') {
      // User tried to go back but couldn't - switch to video view
      if (horizontalFlatListRef.current) {
        horizontalFlatListRef.current.scrollToIndex({ index: 0, animated: true });
      }
    }
  };

  // Add state and animation for back button pulse
  const [pulseBackButton, setPulseBackButton] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Create the pulsing animation for the back button
  useEffect(() => {
    if (horizontalIndex === 1) {
      // Set pulse animation to true in WebView mode
      setPulseBackButton(true);
      // Create a pulse animation sequence
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      // Stop pulsing when not in WebView
      setPulseBackButton(false);
    }

    return () => {
      // Reset the animation when the component unmounts
      pulseAnim.setValue(1);
    };
  }, [horizontalIndex, pulseAnim]);

  // Update the renderHorizontalPage callback to include the animation:
  const renderHorizontalPage = useCallback(({item, index}: {item: string; index: number}) => {
    if (index === 0) {
      // First page content - no changes
  return (
        <View style={styles.horizontalPage}>
      <FlatList
        data={routeParams?.data || []}
        renderItem={memoizedValue}
        keyExtractor={keyExtractor}
        pagingEnabled
        windowSize={5}
        disableIntervalMomentum={true}
        initialScrollIndex={routeParams.index}
        showsVerticalScrollIndicator={false}
        initialNumToRender={3}
        scrollEventThrottle={16}
        decelerationRate={'normal'}
        maxToRenderPerBatch={5}
        removeClippedSubviews={false}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10
        }}
      />
        </View>
      );
    } else {
      // Second page is the WebView (if URL exists)
      return (
        <View style={styles.webViewFullContainer}>
          {/* Fixed Header Bar for WebView with proper spacing */}
          <View style={[styles.webViewHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 30 }]}>
            <View style={styles.webViewHeaderContent}>
              <TouchableOpacity 
                style={styles.webViewBackButton}
                onPress={() => {
                  if (horizontalFlatListRef.current) {
                    horizontalFlatListRef.current.scrollToIndex({ index: 0, animated: true });
                  }
                }}
              >
                <Animated.View 
                  style={[
                    styles.webViewBackButtonHighlight,
                    // Apply the pulse animation when in WebView
                    pulseBackButton && { transform: [{ scale: pulseAnim }] }
                  ]}
                >
                  <Icon name="arrow-back" color="#000" size={RFValue(24)} />
                </Animated.View>
                <Text style={styles.backButtonText}>Back to video</Text>
              </TouchableOpacity>
              
              <CustomText 
                fontFamily={FONTS.Bold} 
                variant="h6" 
                style={styles.webViewTitle}
                numberOfLines={1}
              >
                #{currentReel?.hashtags?.[0] || "link"}
              </CustomText>
              
              <TouchableOpacity 
                style={styles.webViewRefreshButton}
                onPress={() => {
                  if (webViewRef.current) {
                    webViewRef.current.reload();
                  }
                }}
              >
                <Icon name="refresh" color="#000" size={RFValue(22)} />
              </TouchableOpacity>
            </View>
          </View>
          
          {hasUrl ? (
            <WebView
              ref={webViewRef}
              source={{uri: webViewUrl}}
              style={styles.webViewFull}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              onLoadStart={() => setWebViewLoading(true)}
              onLoadEnd={() => setWebViewLoading(false)}
              onError={() => {
                setWebViewError(true);
                setWebViewLoading(false);
              }}
              cacheEnabled={true}
              allowsFullscreenVideo={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={true}
              scalesPageToFit={true}
              injectedJavaScript={muteAudioJS}
              onMessage={(event) => {
                console.log('WebView message:', event.nativeEvent.data);
              }}
              onNavigationStateChange={handleWebViewNavigationStateChange}
              renderLoading={() => (
                <View style={styles.webViewLoader}>
                  <ActivityIndicator size="large" color={colors.theme} />
                  <CustomText 
                    fontFamily={FONTS.Medium} 
                    variant="h7" 
                    style={[styles.webViewLoaderText, {color: colors.text}]}
                  >
                    Loading web content...
                  </CustomText>
                </View>
              )}
              renderError={() => (
                <View style={styles.webViewError}>
                  <Icon name="error-outline" size={RFValue(50)} color={colors.text} />
                  <CustomText 
                    fontFamily={FONTS.Medium} 
                    variant="h7" 
                    style={{color: colors.text, marginTop: 10}}
                  >
                    Failed to load content
                  </CustomText>
                </View>
              )}
              incognito={false}
              thirdPartyCookiesEnabled={true}
              userAgent="Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36"
              decelerationRate="normal"
              scrollEnabled={true}
            />
          ) : (
            <View style={styles.noUrlContainer}>
              <Icon name="public-off" size={RFValue(50)} color={colors.text} />
              <CustomText 
                fontFamily={FONTS.Medium} 
                variant="h6" 
                style={{color: colors.text, marginTop: 20, textAlign: 'center'}}
              >
                No website link available for this reel
              </CustomText>
            </View>
          )}
          {webViewLoading && (
            <View style={styles.webViewLoader}>
              <ActivityIndicator size="large" color={colors.theme} />
            </View>
          )}
        </View>
      );
    }
  }, [colors, hasUrl, webViewUrl, webViewLoading, webViewError, memoizedValue, keyExtractor, getItemLayout, onViewableItemsChanged, routeParams, viewabilityConfig, currentReel, muteAudioJS, pulseBackButton, pulseAnim]);

  // Handle changes in the horizontal scroll position
  const onHorizontalViewableItemsChanged = useRef(
    ({viewableItems}: {viewableItems: Array<ViewToken>}) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== undefined) {
        setHorizontalIndex(viewableItems[0].index || 0);
      }
    }
  ).current;

  // Horizontal viewability config
  const horizontalViewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Horizontal pagination indicator dots
  const renderPaginationDots = () => {
    return (
      <View style={styles.paginationContainer}>
        <View 
          style={[
            styles.paginationDot, 
            horizontalIndex === 0 ? styles.paginationDotActive : styles.paginationDotInactive
          ]} 
        />
        <View 
          style={[
            styles.paginationDot, 
            horizontalIndex === 1 ? styles.paginationDotActive : styles.paginationDotInactive
          ]} 
        />
      </View>
    );
  };

  // Swipe indicator component
  const renderSwipeIndicator = () => {
    if (!hasUrl) return null;
    
    return (
      <View style={styles.swipeIndicator}>
        <Icon 
          name={horizontalIndex === 0 ? "swipe-left" : "swipe-right"} 
          size={RFValue(20)} 
          color="white" 
        />
        <CustomText 
          fontFamily={FONTS.Medium} 
          variant="h8" 
          style={styles.swipeText}
        >
          {horizontalIndex === 0 ? "Swipe for website" : "Swipe for video"}
        </CustomText>
      </View>
    );
  };

  // Effect to manage status bar based on horizontal index
  useEffect(() => {
    if (horizontalIndex === 1) {
      // When viewing WebView, hide status bar
      StatusBar.setHidden(true);
      
      // Show a hint about using the back button
      if (Platform.OS === 'android') {
        ToastAndroid.showWithGravityAndOffset(
          'Use back button to return to video',
          ToastAndroid.LONG,
          ToastAndroid.BOTTOM,
          0,
          50
        );
      } else {
        // For iOS, we'll use a temporary animated view
        setShowBackButtonHint(true);
        setTimeout(() => {
          setShowBackButtonHint(false);
        }, 3000);
      }
    } else {
      // When viewing reel, show status bar
      StatusBar.setHidden(false);
    }

    // Cleanup on unmount
    return () => {
      StatusBar.setHidden(false);
    };
  }, [horizontalIndex]);

  // Add a state for the back button hint
  const [showBackButtonHint, setShowBackButtonHint] = useState(false);
  const backButtonHintAnim = useRef(new Animated.Value(0)).current;

  // Animate the hint when it appears
  useEffect(() => {
    if (showBackButtonHint) {
      Animated.sequence([
        Animated.timing(backButtonHintAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2400),
        Animated.timing(backButtonHintAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowBackButtonHint(false);
      });
    }
  }, [showBackButtonHint, backButtonHintAnim]);

  return (
    <CustomView style={styles.container}>
      <View style={styles.backButton}>
        <TouchableOpacity onPress={() => goBack()}>
          <Icon name="arrow-back" color="white" size={RFValue(20)} />
        </TouchableOpacity>
      </View>
      
      {/* Indicator showing position in horizontal scroll */}
      {hasUrl && renderPaginationDots()}
      
      {showBackButtonHint && (
        <Animated.View 
          style={[
            styles.backButtonHint, 
            { opacity: backButtonHintAnim }
          ]}
        >
          <Icon name="arrow-back" size={RFValue(18)} color="white" />
          <Text style={styles.backButtonHintText}>
            Use back button to return to video
          </Text>
        </Animated.View>
      )}
      
      <FlatList
        ref={horizontalFlatListRef}
        data={['videos', 'webview']} // Two pages: videos and webview
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={renderHorizontalPage}
        keyExtractor={(item) => item}
        onViewableItemsChanged={onHorizontalViewableItemsChanged}
        viewabilityConfig={horizontalViewabilityConfig}
        initialNumToRender={2}
        scrollEventThrottle={16}
        decelerationRate="fast"
        style={styles.horizontalList}
        getItemLayout={(_data, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
        scrollEnabled={horizontalIndex === 0} // Disable swiping when in WebView mode
      />
      
      <Image source={loaderGif} style={styles.thumbnail} />
    </CustomView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 10,
    zIndex: 99,
  },
  thumbnail: {
    position: 'absolute',
    zIndex: -2,
    aspectRatio: 9 / 16,
    height: screenHeight,
    width: '100%',
    alignSelf: 'center',
    right: 0,
    left: 0,
    resizeMode: 'stretch',
    top: 0,
    bottom: 0,
  },
  horizontalPage: {
    width: screenWidth,
    height: screenHeight,
    flex: 1,
  },
  horizontalList: {
    flex: 1,
    width: screenWidth,
  },
  webViewFull: {
    flex: 1,
    width: screenWidth,
    height: screenHeight - (Platform.OS === 'ios' ? 100 : 80), // Adjust for header
    backgroundColor: '#fff',
  },
  webViewFullContainer: {
    width: screenWidth,
    height: screenHeight,
    position: 'relative',
    backgroundColor: '#fff',
  },
  webViewHeader: {
    width: '100%',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 10,
    zIndex: 100,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  webViewHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  webViewBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingRight: 12,
    borderRadius: 20,
  },
  webViewBackButtonHighlight: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    padding: 6,
    borderRadius: 20,
    marginRight: 6,
  },
  backButtonText: {
    marginLeft: 5,
    fontSize: RFValue(14),
    color: '#000',
    fontWeight: '500',
  },
  webViewTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#000',
  },
  webViewRefreshButton: {
    padding: 8,
    borderRadius: 20,
  },
  webViewLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  webViewLoaderText: {
    marginTop: 10,
    textAlign: 'center',
  },
  webViewError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    width: '100%',
    height: '100%',
  },
  noUrlContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    width: '100%',
    height: '100%',
  },
  paginationContainer: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    bottom: 20,
    left: 0,
    right: 0,
    zIndex: 99,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: Colors.white,
  },
  paginationDotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  swipeIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 10,
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  swipeText: {
    color: Colors.white,
    marginLeft: 5,
  },
  hintOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  hintContent: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 15,
  },
  hintText: {
    color: 'white',
    fontSize: RFValue(16),
    marginTop: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  backButtonHint: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: '50%',
    transform: [{ translateX: -100 }],
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    zIndex: 1001,
  },
  backButtonHintText: {
    color: 'white',
    marginLeft: 8,
    fontSize: RFValue(14),
    fontWeight: '500',
  },
});

export default ReelScrollScreen;