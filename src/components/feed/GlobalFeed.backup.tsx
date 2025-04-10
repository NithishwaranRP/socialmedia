import React, { useEffect, useRef, useState,  useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  StatusBar,
  PanResponder,
  Dimensions,
  PixelRatio,
  Animated,
  Easing,
  TextStyle,
  ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
  InteractionManager,
  findNodeHandle,
  AppState,
  AppStateStatus,
  Platform,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../redux/reduxHook';
import { fetchFeedReel, fetchHashtags } from '../../redux/actions/reelAction';
import { fetchUserByUsername } from '../../redux/actions/userAction';
import { navigate } from '../../utils/NavigationUtil';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import Video from 'react-native-video';
import {Colors, useThemeColors} from '../../constants/Colors';
import { RootState } from '../../redux/store';

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import convertToProxyURL from 'react-native-video-cache';
import AnimatedCaption from './AnimatedCaption';

const normalizeWidth = (size: number) => PixelRatio.roundToNearestPixel(scale(size));
const normalizeHeight = (size: number) => PixelRatio.roundToNearestPixel(verticalScale(size));

// Add a type definition for the GradientText props
interface GradientTextProps {
  text: string;
  style: TextStyle | TextStyle[];
}

const GlobalFeed = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const colors = useThemeColors(); // Get dynamic theme colors
  const isDarkMode = useAppSelector((state: RootState) => state.theme.isDarkMode);
  
  // Log the theme state to debug
  useEffect(() => {
    console.log('Current theme mode:', isDarkMode ? 'Dark Mode' : 'Light Mode');
    console.log('Current background color:', colors.background);
    console.log('Current text color:', colors.text);
  }, [isDarkMode, colors]);
  
  const [allData, setAllData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(-1);
  const [currentThumbnailUri, setCurrentThumbnailUri] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [videoProgress, setVideoProgress] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isBreakingNewsVisible, setIsBreakingNewsVisible] = useState(true);
  const scrollPosition = useRef(0);
  const scrollDirection = useRef(1); // 1 for right, -1 for left
  const scrollViewRef = useRef<ScrollView>(null);
  const [hashedVideos, setHashedVideos] = useState<Map<string, any>>(new Map());
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [hashtagCounts, setHashtagCounts] = useState<Map<string, number>>(new Map());
  const [allHashtags, setAllHashtags] = useState<string[]>([]);
  const [endlessHashtags, setEndlessHashtags] = useState<string[]>([]);

  const flatListRefBreakingNews = useRef<FlatList>(null);
  const currentlyVisibleBreakingNewsIndex = useRef<number>(0);
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAppSelector(state => state.user);
  const breakingNewsRef = useRef<View>(null);
  const mainScrollViewRef = useRef<ScrollView>(null);
  const [isScreenActive, setIsScreenActive] = useState(true);
  const appState = useRef(AppState.currentState);

  // Add a state for force re-rendering
  const [forceRender, setForceRender] = useState(false);

  // Add a state to track if category is being scrolled
  const [isCategoryScrolling, setIsCategoryScrolling] = useState(false);
  // Add new states to track category scroll position
  const [categoryScrollPosition, setCategoryScrollPosition] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
 
  // Memoize the GradientText component to prevent unnecessary re-renders
  const GradientText = memo(({ text, style }: GradientTextProps) => {
    // Animation value for the flowing gradient effect
    const animValue = useRef(new Animated.Value(0)).current;
    const colors = useThemeColors(); // Get current theme colors
    
    // Start the animation when component mounts
    useEffect(() => {
      Animated.loop(
        Animated.timing(animValue, {
          toValue: 1,
          duration: 8000, // Slower animation (4 seconds per cycle)
          easing: Easing.linear,
          useNativeDriver: false,
        })
      ).start();
      
      return () => {
        animValue.stopAnimation();
      };
    }, []);
    
    // Split text into individual characters
    const chars = text.split('');
    
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {chars.map((char, index) => {
          // Calculate delay for this character based on position
          const position = index / chars.length;
          
          // Create animation that factors in the character position
          // This smaller multiplier (0.3) makes the wave move more slowly across the text
          const colorAnim = Animated.add(
            animValue,
            new Animated.Value(position * 0.3)
          );
          
          // Convert to modulo 1 to create the wave effect
          const modAnim = Animated.modulo(colorAnim, 1);
          
          return (
            <Animated.Text
              key={index}
              style={[
                style,
                {
                  color: modAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [colors.lightText, colors.text, colors.lightText],
                  }),
                },
              ]}
            >
              {char === ' ' ? '\u00A0' : char}
            </Animated.Text>
          );
        })}
      </View>
    );
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await dispatch(fetchFeedReel(0, 200));
      setAllData(result);
      await saveData(result);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      // await loadData();
      setRefreshing(false);
    }
  }, [dispatch]);

  const saveData = useCallback(async (data: any) => {
    try {
      await AsyncStorage.setItem('newsData', JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save data to AsyncStorage", error);
    }
  }, []);

  const handleVideoEnd = () => {
    const nextIndex = currentVideoIndex + 1;
    const videos = Array.from(hashedVideos.values()).map(item => item.videoUri);

    // Check if the next index is within bounds
    if (nextIndex < videos.length) {
      setCurrentVideoIndex(nextIndex);
      setActiveCategoryIndex(nextIndex);

      // Scroll to the next video
      if (flatListRefBreakingNews.current) {
        flatListRefBreakingNews.current.scrollToIndex({
          index: nextIndex,
          animated: true,
          viewPosition: 0.5, // Center the item in view
        });
      }
    } else {
      // Loop back to the first video
      setCurrentVideoIndex(0);
      setActiveCategoryIndex(0);

      if (flatListRefBreakingNews.current) {
        flatListRefBreakingNews.current.scrollToIndex({
          index: 0,
          animated: true,
          viewPosition: 0.5,
        });
      }
    }
  };

  useEffect(() => {
    // Calculate unread counts for each hashtag
    const calculateUnreadCounts = () => {
      const counts = new Map<string, number>();

      allData.forEach((item) => {
        const hashtags = (item.caption || '').split(' ').filter((tag: string) => tag.startsWith('#'));

        hashtags.forEach((hashtag: string) => {
          if (!item.isRead) {
            counts.set(hashtag, (counts.get(hashtag) || 0) + 1);
          }
        });
      });

      console.log('Unread counts:', counts);
      setHashtagCounts(counts);
    };

    // Extract all hashtags from the data
    const extractedHashtags = Array.from(new Set(allData.flatMap(item => 
      (item.caption || "").split(" ").filter((tag: string) => tag.startsWith("#"))
    )));
    setAllHashtags(extractedHashtags);

    calculateUnreadCounts();
  }, [allData]);

  // Update hashtag counts whenever endless hashtags are updated
  useEffect(() => {
    if (endlessHashtags.length > 0 && hashtagCounts.size > 0) {
      // Make sure all endlessHashtags have counts by copying from the original hashtags
      const updatedCounts = new Map(hashtagCounts);
      
      endlessHashtags.forEach(hashtag => {
        if (!updatedCounts.has(hashtag) && hashtagCounts.has(hashtag)) {
          updatedCounts.set(hashtag, hashtagCounts.get(hashtag) || 0);
        }
      });
      
      setHashtagCounts(updatedCounts);
    }
  }, [endlessHashtags]);

  useFocusEffect(
    React.useCallback(() => {
      // Screen is now focused/active
      setIsScreenActive(true);
      console.log('Screen is now active');
      
      // Play the first reel when the screen is focused
      setCurrentVideoIndex(0);

      // Resume auto-scrolling
      startAutoScroll();
      
      return () => {
        // Screen is now unfocused/inactive
        setIsScreenActive(false);
        console.log('Screen is now inactive');
        
        // Pause the video when the screen loses focus
        setCurrentVideoIndex(-1);
        
        // Stop auto-scrolling
        stopAutoScroll();
      };
    }, [])
  );

  // Also listen for app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  // Handle app state changes (active, background, inactive)
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground
      setIsScreenActive(true);
      console.log('App is now active');
      
      // Only start things if our screen is currently focused
      const isFocused = navigation?.isFocused?.();
      if (isFocused) {
        // Resume video playback starting from the first one
        setCurrentVideoIndex(0);
        
        // Resume auto-scrolling
        startAutoScroll();
      }
    } else if (nextAppState.match(/inactive|background/)) {
      // App has gone to the background
      setIsScreenActive(false);
      console.log('App is now inactive');
      
      // Pause video playback
      setCurrentVideoIndex(-1);
      
      // Stop auto-scrolling
      stopAutoScroll();
    }
    
    appState.current = nextAppState;
  };

  const loadData = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem('newsData');
      if (data !== null) {
        const parsedData = JSON.parse(data);
        console.log('Parsed data:', parsedData);
        setAllData(parsedData);
      }
    } catch (error) {
      console.error("Failed to load data from AsyncStorage", error);
    }
  }, []);

  useEffect(() => {
      const fetchNews = async () => {
        // if (activeCategory) {
          setLoading(true); 
          try {

     if (allData.length === 0) {
          const result = await dispatch(fetchFeedReel(0, 200));
          setAllData(result);
          await saveData(result); // Save fetched data to AsyncStorage
        }

          } catch (error) {
            console.error('Fetch error: ', error);
          } finally {
            // await loadData();

            setLoading(false);

          }
        // }
      };
      fetchNews();
    }, [dispatch]);

  useEffect(() => {
    if (user && user.username) {
      dispatch(fetchUserByUsername(user.username));
    }
  }, [dispatch]);

  // Add memory management cleanup effect
  useEffect(() => {
    // Clear all video players and release resources when component unmounts
    return () => {
      setVideoProgress(new Map());
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    };
  }, []);

  async function moveToFirst(arr: any[], index: number, idx?: React.Key | null | undefined) {
    await arr.unshift(arr.splice(index, 1)[0]);
    return arr;
  }


  const getItemLayout = (data: any, index: number) => (
    {length: normalizeWidth(350), offset: normalizeWidth(350) * index, index}
  );

 
  

  const handleNewsPress = useCallback(async (item: any, index: number, idx?: React.Key | null | undefined) => {
    // Pause current video before navigating
    // setCurrentVideoIndex(-1);
    
    const copyArray = Array.from(allData);
    
    // Find the hashtag of the selected video
    const currentHashtag = allHashtags[index];
    
    // Find the actual index of the selected video in the main data array
    let selectedVideoIndex;
    if (item && item._id) {
      selectedVideoIndex = copyArray.findIndex((data) => data._id === item._id);
      if (selectedVideoIndex === -1) {
        // If not found, use the provided index as fallback
        selectedVideoIndex = Number(index);
      }
    } else {
      // Calculate the index based on idx parameter
      const intIndex = Number(index);
      const intIdx = idx !== undefined ? Number(idx) : 0;
      
      if (intIdx === 0) {
        selectedVideoIndex = intIndex;
      } else {
        selectedVideoIndex = intIndex + intIdx;
      }
    }
    
    // Ensure index is within bounds
    if (selectedVideoIndex < 0) {
      selectedVideoIndex = 0;
    } else if (selectedVideoIndex >= copyArray.length) {
      selectedVideoIndex = copyArray.length - 1;
    }
    
    // Extract the selected video
    const selectedVideo = copyArray[selectedVideoIndex];
    
    // Create a new reordered array
    const newOrderedArray = [];
    
    // 1. Add the selected video first
    newOrderedArray.push(selectedVideo);
    
    // 2. Find videos with the same hashtag that have indices after the selected video
    const sameHashtagVideos = copyArray.filter((video, vidIdx) => {
      // Don't include the selected video again
      if (vidIdx === selectedVideoIndex) return false;
      
      // Only include videos that come after the selected video in the original array
      if (vidIdx < selectedVideoIndex) return false;
      
      // Check if this video has the current hashtag
      const videoHashtags = (video.caption || "").split(" ")
        .filter((tag: string) => tag.startsWith("#"));
      
      return videoHashtags.includes(currentHashtag);
    }).sort((a, b) => {
      // Sort by their original index in the array (ascending)
      return copyArray.indexOf(a) - copyArray.indexOf(b);
    });
    
    // Add videos with the same hashtag
    newOrderedArray.push(...sameHashtagVideos);
    
    // 3. Add videos with different hashtags (only those after the selected video)
    const otherHashtagVideos = copyArray.filter((video, vidIdx) => {
      // Don't include the selected video or videos with same hashtag
      if (vidIdx === selectedVideoIndex) return false;
      if (sameHashtagVideos.includes(video)) return false;
      
      // Only include videos that come after the selected video in the original array
      if (vidIdx < selectedVideoIndex) return false;
      
      // Check that this video doesn't have the current hashtag
      const videoHashtags = (video.caption || "").split(" ")
        .filter((tag: string) => tag.startsWith("#"));
      
      return !videoHashtags.includes(currentHashtag);
    }).sort((a, b) => {
      // Sort by their original index in the array (ascending)
      return copyArray.indexOf(a) - copyArray.indexOf(b);
    });
    
    // Add other hashtag videos
    newOrderedArray.push(...otherHashtagVideos);
    
    // Pre-cache videos before navigation
    const preloadCount = 2;
    for (let i = 0; i <= preloadCount && i < newOrderedArray.length; i++) {
      if (newOrderedArray[i] && newOrderedArray[i].videoUri) {
        const cachedVideoUri = convertToProxyURL(newOrderedArray[i].videoUri);
        fetch(cachedVideoUri).catch(err => {});
      }
    }
    
    console.log('Selected video index:', selectedVideoIndex);
    console.log('Same hashtag videos count:', sameHashtagVideos.length);
    console.log('Other hashtag videos count:', otherHashtagVideos.length);
    
    // Navigate to FeedReelScrollScreen with the reordered data
    navigate('FeedReelScrollScreen', {
      data: newOrderedArray,
      initialIndex: 0, // Always start at the first video, which is the selected one
      selectedHashtag: currentHashtag, // Pass the selected hashtag
      allHashtags: allHashtags, // Pass all hashtags for sequencing
    });
  }, [allData, allHashtags]);

  const handleRenderItemPress = useCallback(async (item: any, index: number, idx?: React.Key | null | undefined) => {
    const copyArray = Array.from(allData);

    // Find the hashtag of the selected video
    const currentHashtag = allHashtags[index];
    
    // Calculate the selected index for the specific thumbnail

    let selectedVideoIndex = -1;
    if (typeof idx === 'number') {
      // Find all videos with this hashtag
      const videosWithThisHashtag = copyArray.filter(video => {
        const videoHashtags = (video.caption || "").split(" ")
          .filter((tag: string) => tag.startsWith("#"));
        return videoHashtags.includes(currentHashtag);
      });
      
      // Get the video at this index within the filtered list
      if (idx < videosWithThisHashtag.length) {
        const selectedVideo = videosWithThisHashtag[idx];
        selectedVideoIndex = copyArray.findIndex(v => v._id === selectedVideo._id);
      }
    }
    
    // If we couldn't find a specific video, use the index from the grid
    if (selectedVideoIndex === -1) {
      selectedVideoIndex = index;
    }
    
    // Ensure the index is valid
    if (selectedVideoIndex < 0) {
      selectedVideoIndex = 0;
    } else if (selectedVideoIndex >= copyArray.length) {
      selectedVideoIndex = copyArray.length - 1;
    }
    
    // Get the selected video
    const selectedVideo = copyArray[selectedVideoIndex];
    
    // Create a new reordered array
    const newOrderedArray = [];
    
    // 1. Add the selected video first
    newOrderedArray.push(selectedVideo);
    
    // 2. Find videos with the same hashtag that have indices after the selected video
    const sameHashtagVideos = copyArray.filter((video, vidIdx) => {
      // Don't include the selected video again
      if (vidIdx === selectedVideoIndex) return false;
      
      // Only include videos that come after the selected video in the original array
      if (vidIdx < selectedVideoIndex) return false;
      
      // Check if this video has the current hashtag
      const videoHashtags = (video.caption || "").split(" ")
        .filter((tag: string) => tag.startsWith("#"));
      
      return videoHashtags.includes(currentHashtag);
    }).sort((a, b) => {
      // Sort by their original index in the array (ascending)
      return copyArray.indexOf(a) - copyArray.indexOf(b);
    });
    
    // Add videos with the same hashtag
    newOrderedArray.push(...sameHashtagVideos);
    
    // 3. Add videos with different hashtags (only those after the selected video)
    const otherHashtagVideos = copyArray.filter((video, vidIdx) => {
      // Don't include the selected video or videos with same hashtag
      if (vidIdx === selectedVideoIndex) return false;
      if (sameHashtagVideos.includes(video)) return false;
      
      // Only include videos that come after the selected video in the original array
      if (vidIdx < selectedVideoIndex) return false;
      
      // Check that this video doesn't have the current hashtag
      const videoHashtags = (video.caption || "").split(" ")
        .filter((tag: string) => tag.startsWith("#"));
      
      return !videoHashtags.includes(currentHashtag);
    }).sort((a, b) => {
      // Sort by their original index in the array (ascending)
      return copyArray.indexOf(a) - copyArray.indexOf(b);
    });
    
    // Add other hashtag videos
    newOrderedArray.push(...otherHashtagVideos);
    
    console.log('Selected video index:', selectedVideoIndex);
    console.log('Same hashtag videos count:', sameHashtagVideos.length);
    console.log('Other hashtag videos count:', otherHashtagVideos.length);
    
    // Navigate to FeedReelScrollScreen with the reordered data
    navigate('FeedReelScrollScreen', {
      data: newOrderedArray,
      initialIndex: 0, // Always start at the first video, which is the selected one
      selectedHashtag: currentHashtag, // Pass the selected hashtag
      allHashtags: allHashtags, // Pass all hashtags for sequencing
    });
  }, [allData, allHashtags]);

  const preloadVideos = (startIndex: number) => {
    const videos = Array.from(hashedVideos.values()).map(item => item.videoUri);
    const preloadCount = 3; // Increase the number of videos to preload
    const endIndex = Math.min(startIndex + preloadCount, videos.length - 1);
    const startPreloadIndex = Math.max(0, startIndex - 1); // Also preload the previous video
  
    for (let i = startPreloadIndex; i <= endIndex; i++) {
      const videoUri = videos[i];
      if (videoUri) {
        // Use react-native-video-cache to create a proxy URL for caching
        const cachedVideoUri = convertToProxyURL(videoUri);
        
        // Prefetch the URL to cache it
        fetch(cachedVideoUri)
          .then(response => {
            if (response.ok) {
              console.log(`Preloaded video: ${i}`);
            }
          })
          .catch(error => console.error(`Error preloading video: ${i}`, error));
      }
    }
  };
  
  const onViewableItemsChanged = ({ viewableItems }: { viewableItems: Array<{ item: any; index: number | null; isViewable: boolean }> }) => {
    viewableItems.forEach(item => {
      if (item.isViewable) {
        if (item.index !== null && currentVideoIndex !== item.index) {
          setCurrentVideoIndex(item.index);
          preloadVideos(item.index); // Preload videos starting from the current index
        }
      }
    });
  };

  // Function to check if breaking news section is visible
  const checkBreakingNewsVisibility = useCallback(() => {
    if (breakingNewsRef.current && mainScrollViewRef.current) {
      InteractionManager.runAfterInteractions(() => {
        const handle = findNodeHandle(breakingNewsRef.current);
        if (handle && breakingNewsRef.current) {
          breakingNewsRef.current.measureInWindow((x, y, width, height) => {
            const windowHeight = Dimensions.get('window').height;
            const isVisible = y < windowHeight && y + height > 0;
            
            if (isBreakingNewsVisible !== isVisible) {
              setIsBreakingNewsVisible(isVisible);
              
              // Auto-mute based on visibility
              if (!isVisible && !isMuted) {
                setIsMuted(true);
              } else if (isVisible && isMuted) {
                setIsMuted(false);
              }
            }
          });
        }
      });
    }
  }, [isBreakingNewsVisible, isMuted]);

  // Monitor scroll events to detect visibility
  const handleScrollForVisibility = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // First handle usual scroll events
    handleScroll(event);
    checkBreakingNewsVisibility();
    
    // Then ensure category scroll position is maintained
    preserveCategoryScrollPosition();
  }, [checkBreakingNewsVisibility, handleScroll, preserveCategoryScrollPosition]);

  // Run visibility check when the component mounts and on layout changes
  useEffect(() => {
    // Initial check after component mounts
    const timer = setTimeout(checkBreakingNewsVisibility, 500);
    return () => clearTimeout(timer);
  }, [checkBreakingNewsVisibility]);

  // Memoize the breaking news item renderer with React.memo for better performance
  const MemoizedBreakingNewsItem = memo(({ item, index, onPress, isActive, isPlaying, progress }: {
    item: any;
    index: number;
    onPress: (item: any, index: number) => void;
    isActive: boolean;
    isPlaying: boolean;
    progress: number;
  }) => {
    // Component implementation that renders a breaking news item
    return (
      <TouchableOpacity 
        style={styles.breakingNewsCard} 
        onPress={() => onPress(item, index)}
        activeOpacity={0.9}
      >
        {/* Simplified inner content for performance */}
      </TouchableOpacity>
    );
  });

  // Optimize renderBreakingNewsItem to reduce rendering work
  const renderBreakingNewsItem = useCallback(({ item, index }: { item: any; index: number }) => {
    // Use the first uploaded video for this tag
    const currentHashtag = allHashtags[index];
    const videoData = hashedVideos.get(currentHashtag);
    const videoItem = videoData?.item || item;
    const videoUri = videoData?.videoUri || item?.videoUri;
    const thumbUri = hashedVideos.get(currentHashtag)?.item?.thumbUri || item?.thumbUri;
    
    const imageSource = thumbUri || 'https://via.placeholder.com/150';
    const isActive = currentVideoIndex === index; 
    const progress = videoProgress.get(index) || 0;
    const preload = Math.abs(currentVideoIndex - index) <= 2; // Reduce preload range
    
    // Cache the video URI for better performance
    const cachedVideoUri = convertToProxyURL(videoUri);
    const shouldRenderVideo = isActive || preload;

    // Modified code to use the isBreakingNewsVisible state for muting
    // Also pause if screen is not active
    const shouldMute = !isBreakingNewsVisible || isMuted;
    const shouldPause = !isScreenActive || !isActive;

    return (
      <TouchableOpacity 
        style={styles.breakingNewsCard} 
        onPress={() => handleNewsPress(videoItem, index)}
        activeOpacity={0.9}
      >
        {shouldRenderVideo ? (
          <Video
            poster={thumbUri}
            posterResizeMode="cover"
            source={{ uri: cachedVideoUri }}
            style={styles.breakingNewsVideo}
            paused={shouldPause}
            onEnd={handleVideoEnd}
            onProgress={({ currentTime, seekableDuration }) => {
              if (isActive && isScreenActive && seekableDuration > 0) {
                const progressPercentage = currentTime / seekableDuration;
                setVideoProgress(prev => {
                  const newMap = new Map(prev);
                  newMap.set(index, progressPercentage);
                  return newMap;
                });
              }
            }}
            resizeMode="cover" 
            minLoadRetryCount={3}
            maxBitRate={1500000}
            shutterColor="transparent"
            playWhenInactive={false}
            playInBackground={false}
            useTextureView={true}
            controls={false}
            disableFocus={true}
            hideShutterView
            volume={shouldMute ? 0 : 1}
            bufferConfig={{
              minBufferMs: 15000,
              maxBufferMs: 30000,
              bufferForPlaybackMs: 2500,
              bufferForPlaybackAfterRebufferMs: 5000,
            }}
            onError={(e) => console.error('Video Error:', e)} 
            repeat={false}
            ignoreSilentSwitch="ignore"
          />
        ) : (
          <Image
            source={{ uri: imageSource }}
            style={styles.breakingNewsVideo}
            resizeMode="cover"
          />
        )}
        
        {preload && isActive === false && <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>}
        
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradientOverlay} />
        <View style={styles.newsContent}>
          <GradientText 
            text={getFormattedHashtagText1()}
            style={styles.newsTitle1}
          />
        </View>
        <TouchableOpacity style={styles.muteButton} onPress={() => setIsMuted(!isMuted)}>
          <Image source={shouldMute ? require('../../assets/icons/mute.png') : require('../../assets/icons/unmute.png')} style={styles.muteIcon} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [currentVideoIndex, allHashtags, hashedVideos, videoProgress, isBreakingNewsVisible, isMuted, isScreenActive, handleNewsPress, handleVideoEnd]);

  // Memoize the news item renderer with React.memo
  const MemoizedNewsItem = memo(({ item, index, onPress }: {
    item: any;
    index: number;
    onPress: (item: any, index: number) => void;
  }) => {
    // Component implementation that renders a news item
    return (
      <TouchableOpacity 
        style={styles.newsCard} 
        onPress={() => onPress(item, index)}
      >
        {/* Simplified inner content for performance */}
      </TouchableOpacity>
    );
  });

  // Set optimized FlatList configurations to improve performance
  const optimizedFlatListProps = {
    initialNumToRender: 2,         // Start with fewer items
    maxToRenderPerBatch: 2,        // Render fewer items per batch
    windowSize: 3,                 // Keep fewer items in memory
    updateCellsBatchingPeriod: 100, // Less frequent updates
    removeClippedSubviews: true,   // Remove offscreen views
    keyExtractor: (item: any, index: number) => `item-${index}`,
  };

  // Group thumbnails by hashtag - memoized for performance
  const groupedThumbnails = useMemo(() => {
    return allData.reduce((acc, item) => {
      const hashtags = (item.caption || "").split(" ").filter((tag: string) => tag.startsWith("#"));
      hashtags.forEach((hashtag: string | number) => {
        if (!acc[hashtag]) {
          acc[hashtag] = [];
        }
        acc[hashtag].push(item.thumbUri);
      });
      return acc;
    }, {} as { [key: string]: string[] });
  }, [allData]);

  const itemWidth = Dimensions.get('window').width; // or your specific item width
const layoutWidth = Dimensions.get('window').width; // or your FlatList container width

const handleScrollToBreakingNews = (index: number) => {
  if (flatListRefBreakingNews.current && index >= 0 && index < hashedVideos.size) {
    flatListRefBreakingNews.current.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.5, // Center the item in view
    });
  } else {
    console.warn(`scrollToIndex out of range: requested index ${index} is out of 0 to ${hashedVideos.size - 1}`);
  }
};

const handleCategoryChange = (index: any) => {
  // Get the hashtag at the current index
  const currentHashtag = allHashtags[index] || endlessHashtags[index];
  
  // Get the first uploaded video for this hashtag
  const videoData = hashedVideos.get(currentHashtag);
  const newThumbnailUri = videoData?.item?.thumbUri || allData[index]?.thumbUri || 'https://via.placeholder.com/150';
  
  // Update the currentThumbnailUri if necessary
  setCurrentThumbnailUri(newThumbnailUri);
  handleScrollToBreakingNews(index); 
  // Update active category index
  setActiveCategoryIndex(index);
  
  // Change the video index to match the selected category
  setCurrentVideoIndex(index);
  const simulatedEvent = {
    nativeEvent: {
      contentOffset: {
        x: index * itemWidth, // Calculate the x offset based on the index
      },
      layoutMeasurement: {
        width: layoutWidth, // Width of the FlatList viewport
      },
    },
  };
  // Optionally scroll to the first item if needed
  if (index >= 0 && index < Object.keys(groupedThumbnails).length) {
    flatListRef.current?.scrollToIndex({ 
      index,
      animated: true,
      viewPosition: 0.5 // Adjust to 0.5 to center in the view
    });
  } else {
    console.warn(`scrollToIndex out of range: requested index ${index} is out of 0 to ${Object.keys(groupedThumbnails).length - 1}`);
  }
};

const handleCategory = (index: number) => {
  // This is the hashtag that was selected
  const selectedHashtag = allHashtags[index] || endlessHashtags[index];
  
  // Find the original index in the `allHashtags`
  const actualIndex = allHashtags.indexOf(selectedHashtag);

  if (actualIndex !== -1) {
    // Update the active category index with the original index if it exists
    setActiveCategoryIndex(actualIndex);
    
    // Update the current video index
    setCurrentVideoIndex(actualIndex);
    
    // Scroll to breaking news of the new category
    handleScrollToBreakingNews(actualIndex);
  }
};

// Debounce the scroll handler for better performance
const handleScrollBreakingNews = (event: any) => {
  // Safely check if event and nativeEvent exist
  if (!event || !event.nativeEvent || !event.nativeEvent.contentOffset) {
    return;
  }
  
  const contentOffsetX = event.nativeEvent.contentOffset.x; // Scroll offset
  const viewSize = event.nativeEvent.layoutMeasurement.width; // View width
  const visibleIndex = Math.floor(contentOffsetX / viewSize); // Calculate visible index

  if (visibleIndex !== currentlyVisibleBreakingNewsIndex.current) {
    // Scroll the thumbnail FlatList to the same index
    setCurrentVideoIndex(visibleIndex);
    setActiveCategoryIndex(visibleIndex);
    currentlyVisibleBreakingNewsIndex.current = visibleIndex;
    preloadVideos(visibleIndex);
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: visibleIndex,
        animated: true,
        viewPosition: 0.5, // Center the item in view
      });
    }
  }
};

const onMomentumScrollEnd = (event: any) => {
  // Safely check if event and nativeEvent exist
  if (!event || !event.nativeEvent || !event.nativeEvent.contentOffset) {
    return;
  }
  
  const contentOffsetX = event.nativeEvent.contentOffset.x; // Scroll offset
  const viewSize = event.nativeEvent.layoutMeasurement.width; // View width
  const visibleIndex = Math.floor(contentOffsetX / viewSize); // Calculate visible index

  // Ensure visibleIndex is within bounds of groupedThumbnails
  if (visibleIndex >= 0 && visibleIndex < Object.keys(groupedThumbnails).length) {
      setCurrentVideoIndex(visibleIndex); // Update current video index
      setActiveCategoryIndex(visibleIndex); // Update active category index
      
      // Scroll breaking news FlatList to the same index, ensuring it's in range
      if (flatListRefBreakingNews.current) {
          // Check if the current visible index corresponds to a valid breaking news item
          if (visibleIndex < hashedVideos.size) {
              flatListRefBreakingNews.current.scrollToIndex({
                  index: visibleIndex,
                  animated: true,
                  viewPosition: 0.5 // Center the item in view
              });
          } else {
              console.warn(`Requested index ${visibleIndex} is out of bounds for breaking news`);
          }
      }
  } else {
      console.warn(`Requested visible index ${visibleIndex} out of bounds for groupedThumbnails`);
  }
};

const handleScroll = (event: any) => {
  // Safely check if event and nativeEvent exist
  if (!event || !event.nativeEvent || !event.nativeEvent.contentOffset) {
    return;
  }
  
  // Get the current content offset X
  const contentOffsetX = event.nativeEvent.contentOffset.x; 
  
  // Always update the scrollPosition.current to keep track
  scrollPosition.current = contentOffsetX;
  
  // Update the category scroll position state when:
  // 1. User is interacting with categories, OR
  // 2. This is a programmatic scroll that's intended to update category position
  if (isUserInteracting || isCategoryScrolling) {
    setCategoryScrollPosition(contentOffsetX);
  }
};
  
const currentHashtag = endlessHashtags || allHashtags;

// Update the renderNewsItem function to use the memoized component
const renderNewsItem = useCallback(({ item, index }: { item: any; index: number }) => {
  return (
    <NewsItem
      item={item}
      index={index}
      activeCategoryIndex={activeCategoryIndex}
      endlessHashtags={endlessHashtags}
      allHashtags={allHashtags}
      groupedThumbnails={groupedThumbnails}
      onItemPress={handleNewsPress}
      onThumbnailPress={handleRenderItemPress}
    />
  );
}, [activeCategoryIndex, endlessHashtags, allHashtags, groupedThumbnails, handleNewsPress, handleRenderItemPress]);
        
        // Add a thumbnail cache to store all thumbnails and their URIs
        const [thumbnailCache, setThumbnailCache] = useState<Map<string, string>>(new Map());

        // After setting allData, update this effect to cache all thumbnails
        useEffect(() => {
          if (allData.length > 0) {
            // Create a new thumbnail cache
            const newCache = new Map<string, string>();
            
            // Extract all unique thumbnails and their hashtags
            allData.forEach((item) => {
              const hashtags = (item.caption || '').split(' ').filter((tag: string) => tag.startsWith('#'));
              
              if (item.thumbUri) {
                // Store thumbnail for each associated hashtag
                hashtags.forEach((hashtag: string) => {
                  newCache.set(hashtag, item.thumbUri);
                });
              }
            });
            
            // Update the thumbnail cache
            setThumbnailCache(newCache);
            console.log('Thumbnail cache updated with', newCache.size, 'entries');
          }
        }, [allData]);

        // Update the loadMoreHashtags function to maintain thumbnail cache
        const loadMoreHashtags = () => {
          // Create a new array of hashtags to add
          const newHashtagsToAdd = [...allHashtags]; 
          
          // Update the endless hashtags array
          const updatedEndlessHashtags = [...endlessHashtags, ...newHashtagsToAdd];
          
          // Create a new Map for hashtag counts that includes all hashtags
          const updatedCounts = new Map(hashtagCounts);
          
          // Also update the thumbnail cache for the new hashtags
          const updatedCache = new Map(thumbnailCache);
          
          // Make sure all hashtags in updatedEndlessHashtags have counts and thumbnails
          newHashtagsToAdd.forEach(hashtag => {
            // If this hashtag doesn't have a count yet, add it from the original counts
            if (!updatedCounts.has(hashtag)) {
              // Find the original count for this hashtag, or default to 0
              const count = hashtagCounts.get(hashtag) || 0;
              updatedCounts.set(hashtag, count);
            }
            
            // Ensure this hashtag has a thumbnail in the cache
            if (!updatedCache.has(hashtag)) {
              // Try to find a thumbnail from groupedThumbnails
              const thumbs = groupedThumbnails[hashtag] || [];
              if (thumbs.length > 0) {
                updatedCache.set(hashtag, thumbs[thumbs.length - 1]);
              }
            }
          });
          
          // Update the state with the new hashtags, counts, and thumbnails
          setHashtagCounts(updatedCounts);
          setThumbnailCache(updatedCache);
          setEndlessHashtags(updatedEndlessHashtags);
          
          console.log('Added more hashtags, total now:', updatedEndlessHashtags.length);
          console.log('Updated hashtag counts:', updatedCounts.size);
          console.log('Updated thumbnail cache:', updatedCache.size);
        };

        // Timer reference for auto-scroll resumption
        const autoScrollResumeTimerRef = useRef<NodeJS.Timeout | null>(null);

        const startAutoScroll = () => {
          // Don't start if screen is not active or already scrolling or user is interacting
          if (!isScreenActive || autoScrollIntervalRef.current || isUserInteracting) return;

          // Always set the scroll direction to forward (left to right)
          scrollDirection.current = 1;

          autoScrollIntervalRef.current = setInterval(() => {
            // If screen becomes inactive during scrolling, stop it
            if (!isScreenActive || isUserInteracting) {
              stopAutoScroll();
              return;
            }
            
            // Use the current category scroll position as the starting point
            const currentPosition = categoryScrollPosition;
            // Add a small increment for smooth scrolling
            const newPosition = currentPosition + (1.5 * scrollDirection.current);
            
            const hashtags = endlessHashtags.length > 0 ? endlessHashtags : allHashtags;
            const viewSize = 100;
            const scrollableWidth = hashtags.length * viewSize;

            // If we're approaching the end, load more hashtags
            if (newPosition + viewSize >= scrollableWidth - 250) {
              loadMoreHashtags(); // Load more hashtags
            }
            
            // Update the category scroll position state
            setCategoryScrollPosition(newPosition);
            // Also update the scrollPosition.current for compatibility
            scrollPosition.current = newPosition;

            // Scroll the category ScrollView to the new position
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollTo({ 
                x: newPosition, 
                animated: false // Use false for animation to avoid jerkiness
              });
            }
          }, 16); // Use ~60fps (16ms) for smoother animation
        };

        const stopAutoScroll = () => {
          if (autoScrollIntervalRef.current) {
            clearInterval(autoScrollIntervalRef.current);
            autoScrollIntervalRef.current = null;
          }
        };

        // Update the touch handlers
        const handleTouchStart = () => {
          // Set flag to indicate category is being scrolled
          setIsCategoryScrolling(true);
          setIsUserInteracting(true);
          
          // Clear any existing resume timer
          if (autoScrollResumeTimerRef.current) {
            clearTimeout(autoScrollResumeTimerRef.current);
            autoScrollResumeTimerRef.current = null;
          }
          
          // Stop auto scroll when the user touches
          stopAutoScroll();
        };

        const handleTouchEnd = (event: any) => {
          // Set flag to indicate category is no longer being scrolled
          setIsCategoryScrolling(false);
          
          // Clear any existing resume timer first
          if (autoScrollResumeTimerRef.current) {
            clearTimeout(autoScrollResumeTimerRef.current);
          }
          
          // If the event contains contentOffset, update the categoryScrollPosition
          if (event && event.nativeEvent && event.nativeEvent.contentOffset) {
            // Update the category scroll position to continue from where the user stopped
            const newPosition = event.nativeEvent.contentOffset.x;
            setCategoryScrollPosition(newPosition);
            scrollPosition.current = newPosition;
          }
          
          // Set a new timer to resume auto-scrolling after delay
          autoScrollResumeTimerRef.current = setTimeout(() => {
            setIsUserInteracting(false);
            startAutoScroll();
            autoScrollResumeTimerRef.current = null;
          }, 3000); // Longer delay before resuming auto-scroll after user interaction
        };

        // Add this effect to ensure hashtag counts are refreshed during scrolling
        useEffect(() => {
          // If we have endless hashtags loaded, make sure all of them have counts
          if (endlessHashtags.length > 0) {
            const updatedCounts = new Map(hashtagCounts);
            
            // Go through all current endless hashtags
            endlessHashtags.forEach(hashtag => {
              // If this hashtag doesn't have a count, add it
              if (!updatedCounts.has(hashtag)) {
                // Find the hashtag in the original hashtags and use its count
                const originalIndex = allHashtags.indexOf(hashtag);
                if (originalIndex !== -1) {
                  const count = hashtagCounts.get(allHashtags[originalIndex]) || 0;
                  updatedCounts.set(hashtag, count);
                } else {
                  // If not found in original hashtags, default to 0
                  updatedCounts.set(hashtag, 0);
                }
              }
            });
            
            // Only update state if there were changes
            if (updatedCounts.size !== hashtagCounts.size) {
              setHashtagCounts(updatedCounts);
            }
          }
        }, [endlessHashtags, scrollPosition.current]);

        // Start auto-scrolling on component mount
        useEffect(() => {
          startAutoScroll();

          return () => {
            stopAutoScroll(); // Cleanup on unmount
            // Also clean up the resume timer
            if (autoScrollResumeTimerRef.current) {
              clearTimeout(autoScrollResumeTimerRef.current);
            }
          };
        }, [allHashtags, endlessHashtags]);

        useEffect(() => {
          if (allData.length > 0) {
            const newHashedVideos = new Map();
            const newVideoCounts = new Map();

            allData.forEach((item) => {
              const hashtags = (item.caption || '').split(' ').filter((tag: string) => tag.startsWith('#'));
              const videoUri = item.videoUri;

              hashtags.forEach((hashtag: any) => {
                // Store videos for each hashtag based on creation date
                if (!newHashedVideos.has(hashtag) || 
                    (item.createdAt && newHashedVideos.get(hashtag)?.createdAt && 
                    new Date(item.createdAt) < new Date(newHashedVideos.get(hashtag).createdAt))) {
                  newHashedVideos.set(hashtag, {
                    videoUri: item.videoUri,
                    item: item,
                    createdAt: item.createdAt
                  });
                }

                // Store thumbnails for each hashtag based on creation date
                if (!newHashedVideos.has(hashtag) || 
                    (item.createdAt && newHashedVideos.get(hashtag)?.createdAt && 
                    new Date(item.createdAt) < new Date(newHashedVideos.get(hashtag).createdAt))) {
                  newHashedVideos.set(hashtag, {
                    thumbUri: item.thumbUri,
                    createdAt: item.createdAt
                  });
                }

                // Count videos for each hashtag
                if (newVideoCounts.has(hashtag)) {
                  newVideoCounts.set(hashtag, newVideoCounts.get(hashtag) + 1);
                } else {
                  newVideoCounts.set(hashtag, 1);
                }
              });
            });

            setHashedVideos(newHashedVideos);
          }
        }, [allData]);
        
          const handleScrollEnd = (event: { nativeEvent: { contentOffset: { x: any; }; layoutMeasurement: { width: any; }; contentSize: { width: any; }; }; }) => {
            const contentOffsetX = event.nativeEvent.contentOffset.x; // Scroll offset
            const viewSize = event.nativeEvent.layoutMeasurement.width; // View width
            const scrollableWidth = event.nativeEvent.contentSize.width; // Total content width
          
            // Check if the user has scrolled to the end (within a small threshold)
            if (contentOffsetX + viewSize >= scrollableWidth - 50) {
              loadMoreHashtags(); // Load more hashtags
            }
          };

    // Function to format hashtag text
    const getFormattedHashtagText1 = () => {
      const hashtag = endlessHashtags[activeCategoryIndex] || allHashtags[activeCategoryIndex] || '';
      if (!hashtag) return 'NEWS RECAP';
      
      const formattedTag = hashtag.startsWith('#') ? hashtag.substring(1) : hashtag;
      const capitalizedTag = formattedTag.toUpperCase();
      return `${capitalizedTag} NEWS RECAP`;
    };
    const getFormattedHashtagText2 = () => {
      const hashtag = endlessHashtags[activeCategoryIndex] || allHashtags[activeCategoryIndex] || '';
      if (!hashtag) return 'RELATED VIDEOS';
      
      const formattedTag = hashtag.startsWith('#') ? hashtag.substring(1) : hashtag;
      const capitalizedTag = formattedTag.toUpperCase();
      return `${capitalizedTag} RELATED VIDEOS`;
    };

    // Update the getDisplayNumber function to use dynamic modulo based on hashtag length
    const getDisplayNumber = (hashtag: string, index: number, allTags: string[]) => {
      // Get total number of hashtags (or use a minimum of 5)
      const totalTags = allHashtags.length > 0 ? allHashtags.length : 5;
      
      // Sequential numbering that resets after reaching the maximum number of tags
      // Ensure we're using 1-based numbering (index + 1)
      // If index exceeds totalTags, it wraps around
      const sequentialNumber = (index % totalTags) + 1;
      
      return sequentialNumber.toString();
    };
    
    // Move the StyleSheet here to access 'colors'
const styles = StyleSheet.create({
  container: {
    flex: 1,
        backgroundColor: colors.background,
      },
      mainScrollContainer: {
        flexGrow: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridImage: {
        width: '100%',
        height: 300,
    borderRadius: 10,
  },
  horizontalContainer: {
    paddingVertical: 10,  // Space above and below the FlatList
    paddingHorizontal: 5, // Space on the sides
  },
  newsContainer: {
    width: '50%', // Full width for available space
    flex: 1, // Ensure it can expand correctly
  },
  muteButton: {
  position: 'absolute',
  bottom: 10,
  right: 10,
        backgroundColor: colors.card,
  borderRadius: 20,
  padding: 8,
},
muteIcon: {
  width: 15,
  height: 15,
},
thumbnailContainer: {
    flexDirection: 'row',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  thumbnailWrapper1: {
        width: '48%', // Two items per row with some margin
    marginBottom: 5,
        gap: 10,
  },
  thumbnailWrapper: {
    marginRight: 8,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeThumbnail: {
    opacity: 1, // Highlight the active one
  },
  thumbnailImage: {
    width: '100%',
    height: 100, // Slightly taller
        borderRadius: 15,
        // borderTopRightRadius: 15,
  },
  inactiveThumbnail: {
    opacity: 0.5, // Reduce opacity for non-active thumbnails
  },
  thumbnailProgressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.3)', // Background color of the track
  },
  thumbnailProgressBar: {
    height: '100%',
    backgroundColor: 'rgb(255, 255, 255)', // Color for progress
  },

    breakingNewsCard: {
    width: normalizeWidth(350),
    height: normalizeHeight(450),
    borderRadius: 20,
    overflow: 'hidden',
  },
  breakingNewsVideo: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.black,
  },
  placeholderImage: {
    width: '100%',
    height: '70%',
    backgroundColor: '#444',
  },
  placeholderText: {
    width: '80%',
    height: 20,
    backgroundColor: '#444',
    marginVertical: 5,
    borderRadius: 5,
  },
  placeholderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  placeholderMetaItem: {
    width: '30%',
    height: 10,
    backgroundColor: '#444',
    borderRadius: 5,
  },
  placeholderCategory: {
    width: normalizeWidth(80), // Adjust to match the actual category width
    height: normalizeHeight(20), // Adjust to match the actual category height
    backgroundColor: '#444', // Placeholder background
    borderRadius: 5,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: normalizeHeight(15),
    marginTop: normalizeHeight(10),
  },
  headerTitle: {
    fontSize: normalizeWidth(22),
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  firstRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  secondRow: {
    flexDirection: 'row', // Row layout for the second row
  },
  categoryWrapper: {
    flexDirection: 'column',
    width: '100%',
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginTop: 10,
  },
  categoryItem: {
        backgroundColor: isDarkMode ? 'rgba(22, 38, 64, 0.8)' : 'rgba(233, 217, 191, 0.8)',
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 15,
    width: 100,
    height: 100,
    marginRight: 40,
        marginLeft: 30,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
    overflow: 'visible',
    borderWidth: 1,
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  },
  categoryTextContainer: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
        // backgroundColor: isDarkMode ? 'rgba(2, 11, 23, 0.8)' : 'rgba(255, 255, 255, 0.8)',
  },
  categoryText: {
    fontSize: 15,
        color: isDarkMode ? colors.lightText : '#555',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  activeCategory: {
        backgroundColor: isDarkMode ? 'rgba(22, 38, 64, 1)' : 'rgba(233, 217, 191, 1)', 
        borderColor: colors.theme,
        borderWidth: 3,
        borderRadius: 15,

        transform: [{ scale: 1.05 }], // Make active category slightly larger
        // Add shadow for better visibility in both modes
        ...Platform.select({
          ios: {
            shadowColor: colors.theme,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 8,
          },
          android: {
            elevation: 10,
          },
        }),
  },
  activeCategoryText: {
        color: isDarkMode ? '#ffffff' : '#000000',
        fontWeight: '900',
        fontSize: 16, // Slightly larger font for active category
  },
  badgeContainer: {
    position: 'absolute',
    top: -10,
    right: -10,
        backgroundColor: '#a9c2eb',
    borderRadius: 15,
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000,
        shadowColor: isDarkMode ? '#000' : '#555',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
        borderWidth: 1,
        borderColor: isDarkMode ? '#a9c2eb' : '#a9c2eb',
  },
  badgeText: {
        color: isDarkMode ? '#fff' : '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bellIcon: {
    width: normalizeWidth(15),
    height: normalizeHeight(15),
    tintColor: '#fff',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalizeWidth(5),
    marginBottom: normalizeHeight(15),
  },
  userInfo: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    flex: 1,
  },
  rightIconContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  iconBackground: {
    backgroundColor: '#222',
    borderRadius: 100,
    padding: normalizeHeight(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: normalizeWidth(45),
    height: normalizeHeight(45),
    borderRadius: 15,
    marginRight: normalizeWidth(10),
  },
  greeting: {
    fontSize: normalizeWidth(12),
    color: '#aaa',
  },
  userName: {
    fontSize: normalizeWidth(14),
    fontWeight: 'bold',
    color: '#fff',
  },
  searchTitle: {
    fontSize: normalizeWidth(14),
    color: '#fff',
    marginBottom: normalizeHeight(15),
    fontWeight: 'bold',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 10,
    flex: 1,
    paddingHorizontal: normalizeWidth(15),
    height: normalizeHeight(40),
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    marginLeft: normalizeWidth(10),
  },
  voiceContainer: {
    backgroundColor: '#222',
    borderRadius: 100,
    padding: normalizeHeight(10),
    marginLeft: normalizeWidth(10),
  },
  micIcon: {
    width: normalizeWidth(15),
    height: normalizeHeight(15),
    tintColor: '#fff',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: normalizeWidth(18),
    fontWeight: 'bold',
    marginLeft: normalizeWidth(15),
    marginTop: normalizeHeight(10),
  },
  breakingNewsContainer: {
    // Padding for the breaking news container
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '35%',
  },
  newsContent: {
    position: 'absolute',
    top: 55,
    left: 20,
    right: 20,
    zIndex: 5,
  },
  newsTitle1: {
    fontSize: normalizeWidth(22),
    fontWeight: 'bold',
        color: colors.text,
    marginBottom: 5,
  },
  metaRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem1: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewIcon1: {
    width: normalizeWidth(14),
    height: normalizeHeight(10),
    marginRight: 5,
    tintColor: '#dcdcdc',
  },
  commentIcon1: {
    width: normalizeWidth(12),
    height: normalizeHeight(10),
    marginRight: 5,
    tintColor: '#dcdcdc',
  },
  shareIcon1: {
    width: normalizeWidth(10),
    height: normalizeHeight(10),
    marginRight: 5,
    tintColor: '#dcdcdc',
  },
  metaText1: {
    fontSize: normalizeWidth(10),
    color: '#dcdcdc',
  },
  newsCard: {
    borderRadius: 10,
  },
  singleThumbnailCard: {
    width: normalizeWidth(350),
    height: normalizeHeight(240),
    borderRadius: 10,
    overflow: 'hidden',
  },
  multiThumbnailCard: {
    width: normalizeWidth(350),
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
        backgroundColor: colors.background,
  },
  loaderContainer: {
    width: '100%',
    height: normalizeHeight(370), // Match the height of newsCard
    marginRight: 240, // Match the space between items
    marginLeft: 5, // Match the space between items
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#222', // Match the newsCard background color
  },
  newsImage: {
    width: '50%',
    height: 300,
    borderRadius: 10,
  },
  newsTitle: {
    fontSize: normalizeWidth(8),
    fontWeight: 'bold',
        color: colors.text,
    marginBottom: 5,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewIcon: {
    width: normalizeWidth(7),
    height: normalizeHeight(5),
    marginRight: 5,
    tintColor: '#dcdcdc',
  },
  commentIcon: {
    width: normalizeWidth(6),
    height: normalizeHeight(5),
    marginRight: 5,
    tintColor: '#dcdcdc',
  },
  shareIcon: {
    width: normalizeWidth(5),
    height: normalizeHeight(5),
    marginRight: 5,
    tintColor: '#dcdcdc',
  },
  metaText: {
    fontSize: normalizeWidth(6),
    color: '#dcdcdc',
  },
  breakingNewsImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tagsContainer1: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  trendingTag1: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: normalizeWidth(12),
    paddingHorizontal: normalizeWidth(10),
    paddingVertical: normalizeHeight(5),
    borderRadius: 12,
    marginRight: 6,
  },
  categoryTag1: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    color: '#fff',
    fontSize: normalizeWidth(12),
    paddingHorizontal: normalizeWidth(10),
    paddingVertical: normalizeHeight(5),
    borderRadius: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
        color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  numberIndicator: {
    position: 'absolute',
    left: -10, // Move it more to the left
    top: -20, // Move it more to the top
    fontSize: 120, // Larger size
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.1)',
    zIndex: 1,
  },
  thumbnailOverlay: {
    position: 'absolute',
        borderRadius: 15,

    top: 0,
    left: 0,
    right: 0,
    height: 130, // Match thumbnail height
        backgroundColor: isDarkMode ? 'rgba(2, 11, 23, 0.5)' : 'rgba(255, 255, 255, 0.5)',
    zIndex: 2,
  },
      activeThumbnailOverlay: {
        // backgroundColor: 'rgba(169, 194, 235, 0.3)', // Use theme color but with transparency
      },
  numberDisplay: {
    position: 'absolute',
    left: -30,
    top: 30,
    fontSize: 50,
    fontWeight: 'bold',
        color: isDarkMode ? colors.lightText : '#888',
    zIndex: 1,
  },
      activeNumberDisplay: {
        color: colors.theme, // Use theme color for active number
        fontWeight: '900',
      },
      categoryScrollWrapper: {
        height: 160, // Fixed height for the category section
        marginVertical: 10,
        backgroundColor: isDarkMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
        borderRadius: 15,
        marginHorizontal: 5,
        // Add subtle shadow
        ...Platform.select({
          ios: {
            shadowColor: isDarkMode ? '#000' : '#ccc',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
          },
          android: {
            elevation: 2,
          },
        }),
      },
    });

    // Move NewsItem here so it can access styles
    const NewsItem = memo(({ 
      item, 
      index, 
      activeCategoryIndex, 
      endlessHashtags, 
      allHashtags, 
      groupedThumbnails, 
      onItemPress,
      onThumbnailPress
    }: {
      item: any;
      index: number;
      activeCategoryIndex: number;
      endlessHashtags: string[];
      allHashtags: string[];
      groupedThumbnails: Record<string, string[]>;
      onItemPress: (item: any, index: number) => void;
      onThumbnailPress: (item: any, index: number, idx?: React.Key | null | undefined) => void;
    }) => {
      const isActive = activeCategoryIndex === index;
      const currentHashtag = index < endlessHashtags.length 
        ? endlessHashtags[index] 
        : allHashtags[index - endlessHashtags.length];
      const thumbnails = groupedThumbnails[currentHashtag] || [];
      const lastThumbnailUri = useMemo(() => 
        thumbnails.length > 0 ? thumbnails[thumbnails.length - 1] : 'https://via.placeholder.com/150'
      , [thumbnails]);

      const cardStyle = thumbnails.length > 1 ? styles.multiThumbnailCard : styles.singleThumbnailCard;

      // Optimize the thumbnail rendering with useMemo
      const gridThumbnails = useMemo(() => {
        if (thumbnails.length <= 1) return null;
        
        return thumbnails.map((thumb: string, idx: number) => (
          <TouchableOpacity 
            key={`thumb-${idx}`} 
            onPress={() => onThumbnailPress(item, index, idx)} 
            style={styles.thumbnailWrapper1} 
          >
            <Image
              source={{ uri: thumb }}
              style={styles.gridImage}
            />
          </TouchableOpacity>
        ));
      }, [thumbnails, item, index, onThumbnailPress]);

      return (
        <View style={[styles.newsCard, cardStyle]}>
          {thumbnails.length > 1 ? (
            <View style={styles.gridContainer}>
              {gridThumbnails}
            </View>
          ) : (
            <TouchableOpacity onPress={() => onItemPress(item, index)}>
              <Image
                source={{ uri: lastThumbnailUri }}
                style={styles.newsImage}
              />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradientOverlay} />
            </TouchableOpacity>
          )}
        </View>
      );
    });

    // Add this effect to force re-render when theme changes
    useEffect(() => {
      // Force re-render when theme changes
      setForceRender(prev => !prev);
    }, [isDarkMode]);

    // Add this method near the other useEffect declarations to create a PanResponder
    const categoryPanResponder = React.useMemo(
      () =>
        PanResponder.create({
          // Prevent category scroll view from capturing vertical scroll gestures
          onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
            // Only allow horizontal scrolling in the category section by checking if 
            // the horizontal movement is greater than the vertical movement
            return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
          },
        }),
      []
    );

    // Update the onPress handler for categories to prevent rapid multiple presses
    const handleCategoryPress = useCallback((index: number) => {
      // Temporarily disable category scrolling to prevent double scroll issues
      setIsCategoryScrolling(true);
      setIsUserInteracting(true);
      
      // Get the selected hashtag
      const selectedHashtag = allHashtags[index] || endlessHashtags[index];
      
      // Find the actual index in allHashtags to ensure correct video selection
      const actualIndex = allHashtags.indexOf(selectedHashtag);
      if (actualIndex !== -1) {
        // Update state variables
        setActiveCategoryIndex(actualIndex);
        setCurrentVideoIndex(actualIndex);
        
        // Calculate the position to scroll to
        const categoryItemWidth = 170; // Approximate width of category item (width + margins)
        const targetPosition = index * categoryItemWidth;
        
        // Update scroll positions
        setCategoryScrollPosition(targetPosition);
        scrollPosition.current = targetPosition;
        
        // Scroll to the category
        scrollViewRef.current?.scrollTo({
          x: targetPosition,
          animated: true
        });
        
        // Also scroll the breaking news to match
        handleScrollToBreakingNews(actualIndex);
      }
      
      // Re-enable scrolling after a short delay
      setTimeout(() => {
        setIsCategoryScrolling(false);
        
        // Set a timer to reset the user interaction flag after another delay
        setTimeout(() => {
          setIsUserInteracting(false);
        }, 300);
      }, 300);
    }, [allHashtags, endlessHashtags, handleScrollToBreakingNews]);

    // Add this method to the component to preserve category scroll position when needed
    const preserveCategoryScrollPosition = useCallback(() => {
      if (scrollViewRef.current && categoryScrollPosition > 0) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            x: categoryScrollPosition,
            animated: false
          });
        }, 50);
      }
    }, [categoryScrollPosition]);

    return (
      <ScrollView 
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        scrollEventThrottle={32}
        decelerationRate="fast"
        snapToAlignment="center"
        onMomentumScrollEnd={handleScrollEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onScroll={handleScroll}
        contentOffset={{x: categoryScrollPosition, y: 0}}
        removeClippedSubviews={false}
        directionalLockEnabled={true}
        {...categoryPanResponder.panHandlers}
      >
        <View style={styles.container}>
          <View style={styles.mainScrollContainer}>
            <View style={styles.gridContainer}>
              {Object.entries(groupedThumbnails).map(([hashtag, thumbnails], index) => (
                <TouchableOpacity
                  key={`hashtag-${hashtag}-${index}`}
                  onPress={() => handleCategoryPress(index)}
                  style={[
                    styles.categoryItem,
                    isActive && styles.activeCategory,
                    Math.abs(index - activeCategoryIndex) > 10 ? {opacity: 0.5} : {opacity: 1}
                  ]}
                >
                  <Text style={[
                    styles.numberDisplay,
                    isActive && styles.activeNumberDisplay
                  ]}>
                    {getDisplayNumber(hashtag, index, allHashtags)}
                  </Text>

                  <Image
                    source={{ uri: thumbnails[0] }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                    progressiveRenderingEnabled={true}
                  />

                  <View style={[
                    styles.thumbnailOverlay,
                    isActive && styles.activeThumbnailOverlay
                  ]} />

                  <View style={styles.categoryTextContainer}>
                    <Text style={[styles.categoryText, isActive && styles.activeCategoryText]}>
                      {hashtag}
                    </Text>
                  </View>

                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{hashtagCounts.get(hashtag) || 0}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

export default GlobalFeed;
