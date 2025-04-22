import React, { useEffect, useRef, useState,  useCallback, memo  } from 'react';
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
  ActivityIndicator,
  Platform,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../redux/reduxHook';
import { fetchFeedReel, fetchGlobalFeedReel } from '../../redux/actions/reelAction';
import { fetchUserByUsername } from '../../redux/actions/userAction';
import { navigate } from '../../utils/NavigationUtil';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import Video from 'react-native-video';
import { debounce } from 'lodash';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import convertToProxyURL from 'react-native-video-cache';
import AnimatedCaption from './AnimatedCaption';
import { useTheme } from '@react-navigation/native';
import { Colors, useThemeColors } from '../../constants/Colors';
import { RootState } from '../../redux/store';
import { useAvatarPopup } from '../../context/AvatarPopupContext';

const normalizeWidth = (size: number) => PixelRatio.roundToNearestPixel(scale(size));
const normalizeHeight = (size: number) => PixelRatio.roundToNearestPixel(verticalScale(size));

// Add a type definition for the GradientText props
interface GradientTextProps {
  text: string;
  style: TextStyle | TextStyle[];
}

const GlobalFeed = () => {
  const dispatch = useAppDispatch();
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
  const { colors: themeColors } = useTheme();
  const colors = useThemeColors(); // Get dynamic theme colors
  const isDarkMode = useAppSelector((state: RootState) => state.theme.isDarkMode);
  const { showAIAvatar } = useAvatarPopup();
 
  const GradientText = ({ text, style }: GradientTextProps) => {
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
  };

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

  useFocusEffect(
    React.useCallback(() => {
      // Play the first reel when the screen is focused
      setCurrentVideoIndex(0);
      return () => {
        // Pause the video when the screen loses focus
        setCurrentVideoIndex(-1);
      };
    }, [])
  );

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

  // Add effect for initial video preloading
  useEffect(() => {
    // Preload initial videos when component mounts
    if (hashedVideos.size > 0) {
      // Preload first 3 videos on mount
      preloadInitialVideos(3);
    }
  }, [hashedVideos]);

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
    
    // Get all hashtags in the selected video's caption
    const selectedVideoHashtags = (selectedVideo.caption || "").split(" ")
      .filter((tag: string) => tag.startsWith("#"));
    
    // Create a new reordered array
    const newOrderedArray: any[] = [];
    
    // 1. Add the selected video first
    newOrderedArray.push(selectedVideo);
    
    // 2. Find videos with the same hashtag (excluding the selected video)
    const sameHashtagVideos = copyArray.filter((video) => {
      // Don't include the selected video again
      if (video._id === selectedVideo._id) return false;
      
      // Check if this video has the current hashtag
      const videoHashtags = (video.caption || "").split(" ")
        .filter((tag: string) => tag.startsWith("#"));
      
      return videoHashtags.includes(currentHashtag);
    });
    
    // Add videos with the same hashtag
    newOrderedArray.push(...sameHashtagVideos);
    
    // 3. Get all unique hashtags in the order they appear in allHashtags
    const orderedHashtags = allHashtags.filter(tag => tag !== currentHashtag);
    
    // 4. For each hashtag, add all videos with that hashtag that aren't already in the array
    for (const hashtag of orderedHashtags) {
      const hashtagVideos = copyArray.filter((video) => {
        // Skip if this video is already in newOrderedArray
        if (newOrderedArray.some(v => v._id === video._id)) return false;
        
        // Check if this video has the current hashtag being processed
        const videoHashtags = (video.caption || "").split(" ")
          .filter((tag: string) => tag.startsWith("#"));
        
        return videoHashtags.includes(hashtag);
      });
      
      // Add videos for this hashtag
      newOrderedArray.push(...hashtagVideos);
    }
    
    // 5. Finally, add any remaining videos not yet included
    const remainingVideos = copyArray.filter(video => 
      !newOrderedArray.some(v => v._id === video._id)
    );
    
    newOrderedArray.push(...remainingVideos);
    
    // Pre-cache videos before navigation
    const preloadCount = 2;
    for (let i = 0; i <= preloadCount && i < newOrderedArray.length; i++) {
      if (newOrderedArray[i] && newOrderedArray[i].videoUri) {
        const cachedVideoUri = convertToProxyURL(newOrderedArray[i].videoUri);
        fetch(cachedVideoUri).catch(err => {});
      }
    }
    
    console.log('Selected video hashtags:', selectedVideoHashtags);
    console.log('Same hashtag videos count:', sameHashtagVideos.length);
    console.log('Total ordered videos:', newOrderedArray.length);
    
    // Navigate to FeedReelScrollScreen with the reordered data
    navigate('FeedReelScrollScreen', {
      data: newOrderedArray,
      initialIndex: 0, // Always start at the first video, which is the selected one
      selectedHashtag: currentHashtag, // Pass the selected hashtag
      allHashtags: allHashtags, // Pass all hashtags for sequencing
    });
  }, [allData, allHashtags]);

  const handleRenderItemPress = useCallback(async (item: any, index: number, idx?: any) => {
    // Similar logic to handleNewsPress but for thumbnail grid items
    const copyArray = Array.from(allData);
    
    // Find the hashtag of the selected video
    const currentHashtag = allHashtags[index];
    
    // Find the specific video based on idx (position in the thumbnail grid)
    let selectedVideo;
    
    if (typeof idx === 'number') {
      // Find all videos with this hashtag
      const videosWithThisHashtag = copyArray.filter(video => {
        const videoHashtags = (video.caption || "").split(" ")
          .filter((tag: string) => tag.startsWith("#"));
        return videoHashtags.includes(currentHashtag);
      });
      
      // Get the video at this index within the filtered list
      if (idx < videosWithThisHashtag.length) {
        selectedVideo = videosWithThisHashtag[idx];
      }
    }
    
    // If we couldn't find a specific video, use the index from the main data
    if (!selectedVideo) {
      selectedVideo = copyArray[index] || copyArray[0];
    }
    
    // Get all hashtags in the selected video's caption
    const selectedVideoHashtags = (selectedVideo.caption || "").split(" ")
      .filter((tag: string) => tag.startsWith("#"));
    
    // Create a new reordered array
    const newOrderedArray: any[] = [];
    
    // 1. Add the selected video first
    newOrderedArray.push(selectedVideo);
    
    // 2. Find videos with the same hashtag (excluding the selected video)
    const sameHashtagVideos = copyArray.filter((video) => {
      // Don't include the selected video again
      if (video._id === selectedVideo._id) return false;
      
      // Check if this video has the current hashtag
      const videoHashtags = (video.caption || "").split(" ")
        .filter((tag: string) => tag.startsWith("#"));
      
      return videoHashtags.includes(currentHashtag);
    });
    
    // Add videos with the same hashtag
    newOrderedArray.push(...sameHashtagVideos);
    
    // 3. Get all unique hashtags in the order they appear in allHashtags
    const orderedHashtags = allHashtags.filter(tag => tag !== currentHashtag);
    
    // 4. For each hashtag, add all videos with that hashtag that aren't already in the array
    for (const hashtag of orderedHashtags) {
      const hashtagVideos = copyArray.filter((video) => {
        // Skip if this video is already in newOrderedArray
        if (newOrderedArray.some(v => v._id === video._id)) return false;
        
        // Check if this video has the current hashtag being processed
        const videoHashtags = (video.caption || "").split(" ")
          .filter((tag: string) => tag.startsWith("#"));
        
        return videoHashtags.includes(hashtag);
      });
      
      // Add videos for this hashtag
      newOrderedArray.push(...hashtagVideos);
    }
    
    // 5. Finally, add any remaining videos not yet included
    const remainingVideos = copyArray.filter(video => 
      !newOrderedArray.some(v => v._id === video._id)
    );
    
    newOrderedArray.push(...remainingVideos);
    
    console.log('Selected video hashtags:', selectedVideoHashtags);
    console.log('Same hashtag videos count:', sameHashtagVideos.length);
    console.log('Total ordered videos:', newOrderedArray.length);
    
    // Navigate to FeedReelScrollScreen with the reordered data
    navigate('FeedReelScrollScreen', {
      data: newOrderedArray,
      initialIndex: 0, // Always start at the first video, which is the selected one
      selectedHashtag: currentHashtag, // Pass the selected hashtag
      allHashtags: allHashtags, // Pass all hashtags for sequencing
    });
  }, [allData, allHashtags]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ item: any; index: number | null; isViewable: boolean }> }) => {
    if (!viewableItems.length) return;
    
    // Get the most visible item
    const mostVisible = viewableItems.reduce((prev, current) => {
      // If we don't have item.isViewable, use a simpler comparison
      if (typeof prev.isViewable !== 'number' || typeof current.isViewable !== 'number') {
        return current.isViewable ? current : prev;
      }
      
      // Otherwise, return the one with the higher visibility percentage
      return current.isViewable > prev.isViewable ? current : prev;
    });
    
    if (mostVisible.index !== null && currentVideoIndex !== mostVisible.index) {
      // Immediately set current video to reduce perceived loading time
      setCurrentVideoIndex(mostVisible.index);
      
      // Start preloading videos right away
      preloadVideos(mostVisible.index);
    }
  }, [currentVideoIndex]);

  // Enhanced preload function for smoother transitions
  const preloadVideos = (startIndex: number) => {
    const videos = Array.from(hashedVideos.values()).map(item => item.videoUri);
    if (!videos || videos.length === 0) return;
    
    // Preload range - load more videos ahead and a few behind
    const nextPreloadCount = 4; // Increased from 3
    const prevPreloadCount = 2; // Keep 2 previous videos in memory
    
    // Create prioritized indices array
    const indices: number[] = [];
    
    // 1. Next videos (highest priority for smooth forward scrolling)
    for (let i = 1; i <= nextPreloadCount; i++) {
      if (startIndex + i < videos.length) {
        indices.push(startIndex + i);
      }
    }
    
    // 2. Previous videos (for backward scrolling)
    for (let i = 1; i <= prevPreloadCount; i++) {
      if (startIndex - i >= 0) {
        indices.push(startIndex - i);
      }
    }
    
    // Create a Set to ensure no duplicate indices
    const uniqueIndices = Array.from(new Set(indices));
    
    // Fetch each video with optimized timing
    uniqueIndices.forEach((i, idx) => {
      setTimeout(() => {
        const videoUri = videos[i];
        if (videoUri) {
          const cachedVideoUri = convertToProxyURL(videoUri);
          console.log(`Starting preload for video ${i}`);
          
          // Determine priority based on position relative to current video
          const priority = idx < nextPreloadCount ? 'high' : 'auto';
          
          fetch(cachedVideoUri, {
            headers: {
              'Cache-Control': 'max-age=7200', // Cache for 2 hours
              'Priority': priority
            }
          })
            .then(response => {
              if (response.ok) {
                console.log(`Successfully preloaded video: ${i}`);
              }
            })
            .catch(error => {
              console.error(`Error preloading video: ${i}`, error);
              // Retry once on failure
              setTimeout(() => {
                fetch(cachedVideoUri).catch(err => console.error(`Retry failed for video ${i}:`, err));
              }, 1000);
            });
        }
      }, idx * 150); // Reduced delay between requests
    });
  };

  // Preload initial set of videos when component first loads
  const preloadInitialVideos = (count: number) => {
    const videos = Array.from(hashedVideos.values()).map(item => item.videoUri);
    const maxIndex = Math.min(count, videos.length);
    
    // Preload first batch immediately
    for (let i = 0; i < maxIndex; i++) {
      const videoUri = videos[i];
      if (videoUri) {
        const cachedVideoUri = convertToProxyURL(videoUri);
        console.log(`Preloading initial video ${i}`);
        
        fetch(cachedVideoUri, {
          headers: {
            'Cache-Control': 'max-age=7200',
            'Priority': i <= 2 ? 'high' : 'auto' // High priority for first 3 videos
          }
        })
          .then(response => {
            if (response.ok) {
              console.log(`Successfully preloaded initial video: ${i}`);
              // Start preloading next batch if first batch succeeds
              if (i === maxIndex - 1 && videos.length > maxIndex) {
                setTimeout(() => {
                  preloadVideos(maxIndex);
                }, 500);
              }
            }
          })
          .catch(error => console.error(`Error preloading initial video: ${i}`, error));
      }
    }
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
    // Update scroll position
    if (event && event.nativeEvent && event.nativeEvent.contentOffset) {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      scrollPosition.current = contentOffsetX;
    }
    
    // Check visibility
    checkBreakingNewsVisibility();
  }, [checkBreakingNewsVisibility]);

  // Run visibility check when the component mounts and on layout changes
  useEffect(() => {
    // Initial check after component mounts
    const timer = setTimeout(checkBreakingNewsVisibility, 500);
    return () => clearTimeout(timer);
  }, [checkBreakingNewsVisibility]);

  const renderBreakingNewsItem = ({ item, index }: { item: any; index: number }) => {
    // Use the first uploaded video for this tag
    const currentHashtag = allHashtags[index];
    const videoData = hashedVideos.get(currentHashtag);
    const videoItem = videoData?.item || item;
    const videoUri = videoData?.videoUri || item?.videoUri;
    const thumbUri = hashedVideos.get(currentHashtag)?.item?.thumbUri || item?.thumbUri;
    
    const imageSource = thumbUri || 'https://via.placeholder.com/150';
    const isActive = currentVideoIndex === index; 
    const progress = videoProgress.get(index) || 0;
    
    // Increased preload range to improve performance
    const shouldPreload = Math.abs(currentVideoIndex - index) <= 5;
    // Always render video elements for smoother transitions
    const shouldRenderVideo = true;
    const isPaused = !isActive;

    // Cache the video URI for better performance
    const cachedVideoUri = convertToProxyURL(videoUri);
    
    // Modified code to use the isBreakingNewsVisible state for muting
    // And also check if AI avatar is active
    const shouldMute = !isBreakingNewsVisible || isMuted || showAIAvatar;

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
            paused={isPaused}
            onEnd={handleVideoEnd}
            onLoad={() => {
              console.log(`Video ${index} loaded successfully`);
            }}
            onLoadStart={() => {
              console.log(`Video ${index} started loading`);
            }}
            onProgress={({ currentTime, seekableDuration }) => {
              const progressPercentage = currentTime / seekableDuration;
              setVideoProgress(prev => new Map(prev).set(index, progressPercentage));
            }}
            resizeMode="cover" 
            minLoadRetryCount={5}
            maxBitRate={2000000}
            reportBandwidth={true}
            preventsDisplaySleepDuringVideoPlayback
            playInBackground={false}
            playWhenInactive={true}
            useTextureView={Platform.OS === 'android'}
            renderToHardwareTextureAndroid
            controls={false}
            repeat={false}
            disableFocus={true}
            hideShutterView
            volume={shouldMute ? 0 : 1}
            bufferConfig={{
              minBufferMs: 15000, // Increased from 1000 to 15000
              maxBufferMs: 50000, // Increased from 10000 to 50000
              bufferForPlaybackMs: 2500, // Increased from 500 to 2500
              bufferForPlaybackAfterRebufferMs: 5000 // Increased from 1000 to 5000
            }}
            onError={(e) => {
              console.error(`Video Error for ${index}:`, e);
              // Retry loading on error
              if (videoUri) {
                const retryUri = convertToProxyURL(videoUri);
                console.log(`Retrying video ${index} with URI:`, retryUri);
              }
            }} 
            rate={1.0}
            muted={shouldMute}
            progressUpdateInterval={250}
            allowsExternalPlayback={false}
            automaticallyWaitsToMinimizeStalling={true}
          />
        ) : (
          <Image
            source={{ uri: imageSource }}
            style={styles.breakingNewsVideo}
            resizeMode="cover"
          />
        )}
        
        {shouldPreload && isActive === false && <View style={styles.loadingOverlay}>
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
        
        {/* Add carousel dots */}
        <View style={styles.carouselDotsContainer}>
          {Array.from(hashedVideos.values()).map((_, dotIndex) => (
            <View
              key={dotIndex}
              style={[
                styles.carouselDot,
                currentVideoIndex === dotIndex && styles.activeCarouselDot
              ]}
            />
          ))}
        </View>
      </TouchableOpacity>
    );
  };

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



  const renderNewsItem = ({ item, index }: { item: any; index: number }) => {
  const isActive = activeCategoryIndex === index;
  const currentHashtag = endlessHashtags[index] || allHashtags[index];
  const thumbnails = groupedThumbnails[currentHashtag] || [];
  
  // Sort thumbnails by creation date (oldest first)
  const sortedThumbnails = [...thumbnails].sort((a, b) => {
    const dateA = allData.find(item => item.thumbUri === a)?.createdAt || '';
    const dateB = allData.find(item => item.thumbUri === b)?.createdAt || '';
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  // Remove the first video (which is already shown in breaking news)
  const relatedThumbnails = sortedThumbnails.slice(1);

  const cardStyle = relatedThumbnails.length > 1 ? styles.multiThumbnailCard : styles.singleThumbnailCard;

  return (
    <View style={[styles.newsCard, cardStyle]}>
      {relatedThumbnails.length > 1 ? (
        <View style={styles.gridContainer}>
          {relatedThumbnails.map((thumb: any, idx: React.Key | null | undefined) => {
            const videoItem = allData.find(item => item.thumbUri === thumb);
            return (
              <TouchableOpacity 
                key={idx} 
                onPress={() => handleRenderItemPress(videoItem, index, idx)}
                style={styles.thumbnailWrapper1} 
              >
                <Image
                  source={{ uri: thumb }}
                  style={styles.gridImage}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      ) : relatedThumbnails.length > 0 ? (
        <TouchableOpacity onPress={() => {
          const videoItem = allData.find(item => item.thumbUri === relatedThumbnails[0]);
          handleNewsPress(videoItem, index);
        }}>
          <Image
            source={{ uri: relatedThumbnails[0] }}
            style={styles.newsImage}
          />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradientOverlay} />
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardText}>No related videos</Text>
        </View>
      )}
    </View>
  );
};
        
        const loadMoreHashtags = () => {
          setEndlessHashtags(prev => [...prev, ...allHashtags]);
        };

        // Timer reference for auto-scroll resumption
        const autoScrollResumeTimerRef = useRef<NodeJS.Timeout | null>(null);

        const startAutoScroll = () => {
          if (autoScrollIntervalRef.current) return;

          // Always set the scroll direction to forward (left to right)
          scrollDirection.current = 1;

          autoScrollIntervalRef.current = setInterval(() => {
            // Always increment the scroll position (no reversing)
            scrollPosition.current += 6 * scrollDirection.current;
            
            const hashtags = endlessHashtags.length > 0 ? endlessHashtags : allHashtags;
            const viewSize = 100;
            const scrollableWidth = hashtags.length * viewSize;

            // If we're approaching the end, load more hashtags
            if (scrollPosition.current + viewSize >= scrollableWidth - 250) {
              loadMoreHashtags(); // Load more hashtags
            }
            
            // If we've scrolled very far to the right (beyond the current hashtags),
            // consider resetting to the start for better performance
            if (scrollPosition.current > scrollableWidth + 500) {
              // Optional: reset to beginning for very long scrolls
              // scrollPosition.current = 0;
            }

            scrollViewRef.current?.scrollTo({ x: scrollPosition.current, animated: true });
          }, 30); // 30ms interval for fast scrolling
        };

        const stopAutoScroll = () => {
          if (autoScrollIntervalRef.current) {
            clearInterval(autoScrollIntervalRef.current);
            autoScrollIntervalRef.current = null;
          }
        };

        // Update the touch handlers to remember the scroll position and continue from there
        const handleTouchStart = () => {
          // Clear any existing resume timer
          if (autoScrollResumeTimerRef.current) {
            clearTimeout(autoScrollResumeTimerRef.current);
            autoScrollResumeTimerRef.current = null;
          }
          
          // Stop auto scroll when the user touches
          stopAutoScroll();
        };

        const handleTouchEnd = (event: any) => {
          // Clear any existing resume timer first
          if (autoScrollResumeTimerRef.current) {
            clearTimeout(autoScrollResumeTimerRef.current);
          }
          
          // If the event contains contentOffset, update the scrollPosition reference
          if (event && event.nativeEvent && event.nativeEvent.contentOffset) {
            // Update the scroll position to continue from where the user stopped
            scrollPosition.current = event.nativeEvent.contentOffset.x;
          }
          
          // Set a new timer to resume auto-scrolling after 3 seconds
          autoScrollResumeTimerRef.current = setTimeout(() => {
            startAutoScroll();
            autoScrollResumeTimerRef.current = null;
          }, 3000);
        };

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

          const groupedThumbnails = allData.reduce((acc, item) => {
            const hashtags = (item.caption || "").split(" ").filter((tag: string) => tag.startsWith("#"));
            hashtags.forEach((hashtag: string | number) => {
              if (!acc[hashtag]) {
                acc[hashtag] = [];
              }
              acc[hashtag].push(item.thumbUri);
            });
            return acc;
          }, {} as { [key: string]: string[] });

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
        padding: 8,
        width: '100%',
      },
      gridImage: {
        width: '100%',
        height: 300,
        borderRadius: 10,
      },
      horizontalContainer: {
        paddingVertical: 10,
        paddingHorizontal: 5,
      },
      newsContainer: {
        width: '50%',
        flex: 1,
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
      thumbnailWrapper1: {
        width: '48%',
        marginBottom: 10,
        marginHorizontal: '1%',
      },
      thumbnailWrapper: {
        marginRight: 8,
        borderRadius: 5,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
      },
      activeThumbnail: {
        opacity: 1,
      },
      thumbnailImage: {
        width: '100%',
        height: 80,
        borderRadius: 15,
      },
      inactiveThumbnail: {
        opacity: 0.9,
      },
      thumbnailProgressBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 5,
        backgroundColor: colors.inactive_tint,
      },
      thumbnailProgressBar: {
        height: '100%',
        backgroundColor: colors.theme,
      },
      breakingNewsCard: {
        width: normalizeWidth(350),
        height: normalizeHeight(450),
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
      },
      breakingNewsVideo: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.black,
      },
      scrollContainer: {
        flexGrow: 1,
        flexDirection: 'row',
        paddingVertical: 5,
      },
      firstRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginBottom: 10,
      },
      categoryWrapper: {
        flexDirection: 'column',
        width: '100%',
      },
      categoryItem: {
        borderRadius: 15,
        width: 80,
        height: 80,
        marginRight: 20,
        marginLeft: 20,
        marginBottom: 15,
        alignItems: 'center',
        justifyContent: 'flex-start',
        position: 'relative',
        overflow: 'visible',
        borderWidth: 1,
        borderColor: colors.lightText,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
      },
      categoryTextContainer: {
        // width: '100%',
        paddingVertical: 5,
        alignItems: 'center',
        justifyContent: 'center',
      },
      categoryText: {
        fontSize: 13,
        color: colors.lightText,
        fontWeight: 'bold',
        textAlign: 'center',
      },
      activeCategory: {
        opacity: 1,
        borderColor: colors.theme,
        borderWidth: 3,
        borderRadius: 15,
      },
      activeCategoryText: {
        color: colors.lightText,
        fontWeight: '900',
      },
      badgeContainer: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: isDarkMode ? '#a9c2eb' : '#4a6da7',
        borderRadius: 15,
        minWidth: 28,
        height: 28,
        paddingHorizontal: 6,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3000,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 10,
        borderWidth: 1,
        borderColor: isDarkMode ? '#a9c2eb' : '#4a6da7',
      },
      badgeText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
      },
      thumbnailOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 130,
        // backgroundColor: 'rgba(0,0,0,0.2)',
        zIndex: 2,
      },
      activeThumbnailOverlay: {
        // backgroundColor: 'rgba(0, 0, 0, 0.1)',
      },
      numberDisplay: {
        position: 'absolute',
        left: -30,
        top: 30,
        fontSize: 50,
        fontWeight: 'bold',
        color:  isDarkMode ? '#a9c2eb' : '#4a6da7',
        zIndex: 1,
      },
      activeNumberDisplay: {
        color: isDarkMode ? '#a9c2eb' : '#4a6da7',
        fontWeight: '900',
      },
      categoryScrollWrapper: {
        height: 125,
        marginVertical: 10,
        backgroundColor: colors.card,
        borderRadius: 20,
        marginHorizontal: 16,
        padding: 8,
      },
      dotsContainer: {
        position: 'absolute',
        bottom: 20,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        height: 10,
        pointerEvents: 'none',
      },
      dotWrapper: {
        width: 16,
        height: 10,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      },
      dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
      },
      activeDot: {
        backgroundColor:  isDarkMode ? '#a9c2eb' : '#4a6da7',
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
        color: '#fff',
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
        height: normalizeHeight(370),
        marginRight: 240,
        marginLeft: 5,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#222',
      },
      newsImage: {
        width: '50%',
        height: 300,
        borderRadius: 10,
      },
      newsTitle: {
        fontSize: normalizeWidth(8),
        fontWeight: 'bold',
        color: '#fff',
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
        color: colors.lightText,
        fontSize: 16,
        fontWeight: 'bold',
      },
      emptyCard: {
        width: normalizeWidth(350),
        height: normalizeHeight(240),
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
      },
      emptyCardText: {
        color: colors.lightText,
        fontSize: 16,
        fontWeight: 'bold',
      },
      carouselDotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        zIndex: 2,
      },
      carouselDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.lightText,
        marginHorizontal: 5,
      },
      activeCarouselDot: {
        backgroundColor:  isDarkMode ? '#a9c2eb' : '#4a6da7',
        width: 10,
        height: 10,
        borderRadius: 5,
      },
      border: {
        borderColor: colors.lightText,
        borderWidth: 1,
      },
      text: {
        color: colors.lightText,
      },
    });

    return (
      <ScrollView 
        ref={mainScrollViewRef}
        style={styles.container} 
        showsVerticalScrollIndicator={false} 
        nestedScrollEnabled={true}
        onScroll={handleScrollForVisibility}
        scrollEventThrottle={16}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000" translucent />
        <View>
          <View
            ref={breakingNewsRef}
            onLayout={checkBreakingNewsVisibility}
          >
            <FlatList
              ref={flatListRefBreakingNews}
              horizontal
              data={[...hashedVideos.values()]}
              renderItem={renderBreakingNewsItem}
              keyExtractor={(item, index) => `video-${index}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.breakingNewsContainer}
              pagingEnabled
              getItemLayout={getItemLayout}
              initialNumToRender={3}
              maxToRenderPerBatch={3}
              windowSize={5}
              removeClippedSubviews={true}
              updateCellsBatchingPeriod={50}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{
                itemVisiblePercentThreshold: 50,
              }}
              onScroll={handleScrollBreakingNews}
              onEndReachedThreshold={0.5}
            />
          </View>

          {/* <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.thumbnailContainer}
          >
            {Array.from(hashedVideos.entries()).map(([hashtag, videoData], index) => {
              const isActive = activeCategoryIndex === index;
              const progress = videoProgress.get(index) || 0; 
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleCategoryChange(index)}
                  style={[styles.thumbnailWrapper, isActive && styles.activeThumbnail]}
                >
                  <Image
                    source={{ uri: videoData.item?.thumbUri || 'https://via.placeholder.com/50' }} 
                    style={[styles.thumbnailImage, !isActive && styles.inactiveThumbnail]}
                  />
                  {isActive && (
                    <View style={styles.thumbnailProgressBarContainer}>
                      <View style={[styles.thumbnailProgressBar, { width: `${progress * 100}%` }]} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView> */}

      <ScrollView
      ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          handleScrollEnd(event);
          // Also use this event for touch end to capture final position
          handleTouchEnd(event);
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={(event) => handleTouchEnd(event)}
        onScroll={handleScroll}
      >
        <View style={styles.categoryWrapper}>
          <View style={styles.firstRow}>
          {(endlessHashtags.length > 0 ? endlessHashtags : allHashtags).map((hashtag, index) => {
              const selectedHashtag = hashtag;
              // Find the original index in the `allHashtags`
              const actualIndex = allHashtags.indexOf(selectedHashtag);
              const isActive = activeCategoryIndex === actualIndex; 
              // Get the unread count for the hashtag
              const unreadCount = hashtagCounts.get(hashtag) || 0;
              // Format the hashtag for display
              const displayHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
              // Display number (index + 1 to start from 1 instead of 0)
              const displayNumber = getDisplayNumber(hashtag, index, endlessHashtags.length > 0 ? endlessHashtags : allHashtags);
              // Get the thumbnail for this hashtag - get the last one (most recent)
              const hashtagThumbnails = groupedThumbnails[hashtag] || [];
              const thumbnailUri = hashtagThumbnails.length > 0 ? 
                                   hashtagThumbnails[hashtagThumbnails.length - 1] : 
                                   'https://via.placeholder.com/150';

              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    handleCategory(index);
                  }}
                  style={[
                    styles.categoryItem, 
                    isActive && styles.activeCategory,
                  ]}
                >
                  {/* Number before the thumbnail - with improved numbering logic */}
                  <Text style={styles.numberDisplay}>
                    {displayNumber}
                  </Text>
                  
                  {/* Thumbnail image */}
                  <Image 
                    source={{ uri: thumbnailUri }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                  
                  {/* Thumbnail overlay for better contrast */}
                  <View style={styles.thumbnailOverlay} />
                  
                  {/* Hashtag text container */}
                  <View style={styles.categoryTextContainer}>
                    <Text style={[styles.categoryText, isActive && styles.activeCategoryText]}>
                      {displayHashtag}
                    </Text>
                  </View>
                  
                  {/* Count badge - always shown, positioned as overlay, moved to the end */}
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
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
        style={{fontWeight: 'bold', fontSize: 16, color: '#fff', textAlign: 'left'}}
      />
    </View>
    <FlatList
  ref={flatListRef}
  horizontal
  data={Object.keys(groupedThumbnails)}
  renderItem={renderNewsItem}
  keyExtractor={(item, index) => index.toString()}
  pagingEnabled
  refreshing={refreshing}
  onRefresh={handleRefresh}
  contentContainerStyle={styles.horizontalContainer}
  showsHorizontalScrollIndicator={false}
  onMomentumScrollEnd={onMomentumScrollEnd}
/>
  </ScrollView>
);
};

export default GlobalFeed;