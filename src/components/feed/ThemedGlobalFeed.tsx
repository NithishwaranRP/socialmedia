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
  useColorScheme,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../redux/reduxHook';
import { fetchFeedReel, fetchHashtags } from '../../redux/actions/reelAction';
import { fetchUserByUsername } from '../../redux/actions/userAction';
import { navigate } from '../../utils/NavigationUtil';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import Video from 'react-native-video';
import { debounce } from 'lodash';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import convertToProxyURL from 'react-native-video-cache';
import AnimatedCaption from './AnimatedCaption';
import useThemeColors from '../../hooks/useThemeColors';

const normalizeWidth = (size: number) => PixelRatio.roundToNearestPixel(scale(size));
const normalizeHeight = (size: number) => PixelRatio.roundToNearestPixel(verticalScale(size));

// Add a type definition for the GradientText props
interface GradientTextProps {
  text: string;
  style: TextStyle | TextStyle[];
}

// Define an interface for HashtagItem props
interface HashtagItemProps {
  hashtag: string;
  index: number;
  activeCategoryIndex: number;
  allHashtags: string[];
  hashtagCounts: Map<string, number>;
  groupedThumbnails: any;
  onPress: (index: number) => void;
}

// Create memoized item renderers for both FlatLists
// Breaking News Item - Create a separate component and memoize it
const BreakingNewsItem = memo(({ 
  item, 
  index, 
  currentVideoIndex, 
  allHashtags, 
  hashedVideos, 
  videoProgress, 
  isBreakingNewsVisible, 
  isMuted, 
  isScreenActive,
  onItemPress,
  onVideoEnd,
  onMuteToggle,
  setVideoProgress,
  GradientTextComponent
}: {
  item: any;
  index: number;
  currentVideoIndex: number;
  allHashtags: string[];
  hashedVideos: Map<string, any>;
  videoProgress: Map<number, number>;
  isBreakingNewsVisible: boolean;
  isMuted: boolean;
  isScreenActive: boolean;
  onItemPress: (item: any, index: number) => void;
  onVideoEnd: () => void;
  onMuteToggle: () => void;
  setVideoProgress: (callback: (prev: Map<number, number>) => Map<number, number>) => void;
  GradientTextComponent: React.ComponentType<{ text: string; style: any; }>;
}) => {
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
  const cachedVideoUri = useMemo(() => convertToProxyURL(videoUri), [videoUri]);
  const shouldRenderVideo = isActive || preload;

  // Modified code to use the isBreakingNewsVisible state for muting
  // Also pause if screen is not active
  const shouldMute = !isBreakingNewsVisible || isMuted;
  const shouldPause = !isScreenActive || !isActive;

  // Define formatted text for the caption (avoids recomputing in render)
  const formattedText = useMemo(() => {
    const hashtag = currentHashtag || '';
    if (!hashtag) return 'NEWS RECAP';
    const formattedTag = hashtag.startsWith('#') ? hashtag.substring(1) : hashtag;
    const capitalizedTag = formattedTag.toUpperCase();
    return `${capitalizedTag} NEWS RECAP`;
  }, [currentHashtag]);

  return (
    <TouchableOpacity 
      style={styles.breakingNewsCard} 
      onPress={() => onItemPress(videoItem, index)}
      activeOpacity={0.9}
    >
      {shouldRenderVideo ? (
        <Video
          poster={thumbUri}
          posterResizeMode="cover"
          source={{ uri: cachedVideoUri }}
          style={styles.breakingNewsVideo}
          paused={shouldPause}
          onEnd={onVideoEnd}
          onProgress={({ currentTime, seekableDuration }) => {
            if (isActive && isScreenActive && seekableDuration > 0) {
              const progressPercentage = currentTime / seekableDuration;
              // Use callback pattern for state updates
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
        <GradientTextComponent 
          text={formattedText}
          style={styles.newsTitle1}
        />
      </View>
      <TouchableOpacity style={styles.muteButton} onPress={onMuteToggle}>
        <Image source={shouldMute ? require('../../assets/icons/mute.png') : require('../../assets/icons/unmute.png')} style={styles.muteIcon} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

// News Item - Create a separate component and memoize it
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
    
    return thumbnails.slice(0, 4).map((thumb: string, idx: number) => (
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

const GlobalFeed = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const { colors, isDark } = useThemeColors();
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
 
  // Memoize the GradientText component to prevent unnecessary re-renders
  const GradientText = memo(({ text, style }: GradientTextProps) => {
    // Animation value for the flowing gradient effect
    const animValue = useRef(new Animated.Value(0)).current;
    
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
                    outputRange: ['#555555', '#ffffff', '#555555'],
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
    handleScroll(event);
    checkBreakingNewsVisibility();
  }, [checkBreakingNewsVisibility]);

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
  }, [currentVideoIndex, allHashtags, hashedVideos, videoProgress, isBreakingNewsVisible, isMuted, isScreenActive, handleNewsPress, handleVideoEnd, themedStyles, colors]);

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
  
  // Update scrollPosition based on the scroll event
  const contentOffsetX = event.nativeEvent.contentOffset.x; 
  scrollPosition.current = contentOffsetX; // This keeps track of the latest scroll position
};
  
const currentHashtag = endlessHashtags || allHashtags;

// Update the renderNewsItem function to use themedStyles
const renderNewsItem = useCallback(({ item, index }: { item: any; index: number }) => {
  const isActive = activeCategoryIndex === index;
  const currentHashtag = index < endlessHashtags.length 
    ? endlessHashtags[index] 
    : allHashtags[index - endlessHashtags.length];
  const thumbnails = groupedThumbnails[currentHashtag] || [];
  const lastThumbnailUri = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1] : 'https://via.placeholder.com/150';

  const cardStyle = thumbnails.length > 1 ? themedStyles.multiThumbnailCard : themedStyles.singleThumbnailCard;

  return (
    <View style={[themedStyles.newsCard, cardStyle]}>
      {thumbnails.length > 1 ? (
        <View style={themedStyles.gridContainer}>
          {thumbnails.slice(0, 4).map((thumb: any, idx: React.Key | null | undefined) => (
            <TouchableOpacity 
              key={`thumb-${idx}`} 
              onPress={() => handleRenderItemPress(item, index, idx)}
              style={themedStyles.thumbnailWrapper1} 
            >
              <Image
                source={{ uri: thumb }}
                style={themedStyles.gridImage}
              />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <TouchableOpacity onPress={() => handleNewsPress(item, index)}>
          <Image
            source={{ uri: lastThumbnailUri || 'https://via.placeholder.com/150' }}
            style={themedStyles.newsImage}
          />
          <LinearGradient colors={colors.gradientOverlay} style={themedStyles.gradientOverlay} />
        </TouchableOpacity>
      )}
    </View>
  );
}, [activeCategoryIndex, endlessHashtags, allHashtags, groupedThumbnails, handleRenderItemPress, handleNewsPress, themedStyles, colors]);

// Create themed styles with useMemo 
const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Rest of your styles using theme colors
  // ...
}), [colors]);

// Update StatusBar in render
return (
  <ScrollView 
    ref={mainScrollViewRef}
    style={[styles.container, { backgroundColor: colors.background }]} 
    showsVerticalScrollIndicator={false} 
    nestedScrollEnabled={true}
    onScroll={handleScrollForVisibility}
    scrollEventThrottle={16}
  >
    <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} translucent />
    <View>
      <View
        ref={breakingNewsRef}
        onLayout={checkBreakingNewsVisible}
      >
        <FlatList
          ref={flatListRefBreakingNews}
          horizontal
          data={[...hashedVideos.values()]}
          renderItem={renderBreakingNewsItem}
          keyExtractor={(item, index) => `video-${index}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={themedStyles.breakingNewsContainer}
          pagingEnabled
          getItemLayout={getItemLayout}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={100}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50,
            minimumViewTime: 250,
          }}
          onScroll={handleScrollBreakingNews}
          onEndReachedThreshold={0.5}
        />
      </View>

      {/* ScrollView for hashtags */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={themedStyles.scrollContainer}
        scrollEventThrottle={32}
        decelerationRate="fast"
        snapToAlignment="center"
        onMomentumScrollEnd={handleScrollEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onScroll={handleScroll}
        removeClippedSubviews={false}
      >
        <View style={themedStyles.categoryWrapper}>
          <View style={themedStyles.firstRow}>
            {(endlessHashtags.length > 0 ? endlessHashtags : allHashtags).map((hashtag, index) => {
              const selectedHashtag = hashtag;
              const actualIndex = allHashtags.indexOf(selectedHashtag);
              const isActive = activeCategoryIndex === actualIndex;
              
              // Make sure we get the hashtag count, defaulting to 0 if not available
              const unreadCount = hashtagCounts.get(hashtag) || 0;
              
              const displayHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
              const displayNumber = getDisplayNumber(hashtag, index, endlessHashtags.length > 0 ? endlessHashtags : allHashtags);
              
              // IMPORTANT FIX: Get thumbnail directly from groupedThumbnails first
              let thumbnailUri = 'https://via.placeholder.com/150';
              
              // Always try to get thumbnail from groupedThumbnails regardless of distance from active
              const hashtagThumbnails = groupedThumbnails[hashtag] || [];
              if (hashtagThumbnails.length > 0) {
                thumbnailUri = hashtagThumbnails[hashtagThumbnails.length - 1];
              }
              
              // If still no thumbnail, search through all data to find one for this hashtag
              if (thumbnailUri === 'https://via.placeholder.com/150') {
                // Find first item with this hashtag
                const matchingItem = allData.find(item => {
                  const itemHashtags = (item.caption || '').split(' ').filter((tag: string) => tag.startsWith('#'));
                  return itemHashtags.includes(hashtag) && item.thumbUri;
                });
                
                if (matchingItem && matchingItem.thumbUri) {
                  thumbnailUri = matchingItem.thumbUri;
                }
              }

              return (
                <TouchableOpacity
                  key={`hashtag-${hashtag}-${index}`}
                  onPress={() => handleCategory(index)}
                  style={[
                    themedStyles.categoryItem,
                    isActive && themedStyles.activeCategory,
                    Math.abs(index - activeCategoryIndex) > 10 ? {opacity: 0.5} : {opacity: 1}
                  ]}
                >
                  <Text style={themedStyles.numberDisplay}>
                    {displayNumber}
                  </Text>

                  <Image
                    source={{ uri: thumbnailUri }}
                    style={themedStyles.thumbnailImage}
                    resizeMode="cover"
                    progressiveRenderingEnabled={true}
                  />

                  <View style={themedStyles.thumbnailOverlay} />

                  <View style={themedStyles.categoryTextContainer}>
                    <Text style={[themedStyles.categoryText, isActive && themedStyles.activeCategoryText]}>
                      {displayHashtag}
                    </Text>
                  </View>

                  <View style={themedStyles.badgeContainer}>
                    <Text style={themedStyles.badgeText}>{unreadCount}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
    <View style={{flex:1, marginVertical: 10, marginLeft: 10}}>
      <GradientText 
        text={getFormattedHashtagText2()}
        style={{fontWeight: 'bold', fontSize: 16, color: colors.primaryText, textAlign: 'left'}}
      />
    </View>
    <FlatList
      ref={flatListRef}
      horizontal
      data={Object.keys(groupedThumbnails)}
      renderItem={renderNewsItem}
      keyExtractor={(item, index) => `news-${index}`}
      pagingEnabled
      refreshing={refreshing}
      onRefresh={handleRefresh}
      contentContainerStyle={themedStyles.horizontalContainer}
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={onMomentumScrollEnd}
      initialNumToRender={2}
      maxToRenderPerBatch={2}
      windowSize={3}
      removeClippedSubviews={true}
      updateCellsBatchingPeriod={100}
      getItemLayout={(data, index) => ({
        length: Dimensions.get('window').width,
        offset: Dimensions.get('window').width * index,
        index,
      })}
    />
  </ScrollView>
);
}

export default GlobalFeed;
