import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
  Text,
  Dimensions,
  ScrollView,
  AppState,
} from 'react-native';
import React, { FC, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import CustomView from '../../components/global/CustomView';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useAppDispatch } from '../../redux/reduxHook';
import { screenHeight, screenWidth } from '../../utils/Scaling';
import { fetchFeedScrollReel } from '../../redux/actions/reelAction';
import { ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/Colors';
// Use require instead of import for the loader image
const Loader = require('../../assets/images/loader.jpg');
import { goBack } from '../../utils/NavigationUtil';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RFValue } from 'react-native-responsive-fontsize';
import VideoItem from '../../components/reel/VideoItem';
import { ViewToken } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import convertToProxyURL from 'react-native-video-cache';

interface RouteProp {
  data: any[];
  initialIndex: number;
  selectedHashtag?: string;
  allHashtags?: string[]; // All hashtags in order
  originalCategoryIndex?: number; // Original category index from GlobalFeed
  preventBackSwiping?: boolean; // Flag to indicate whether backwards scrolling is allowed
}

interface VideoData {
  _id: string;
  videoUri: string;
  thumbUri: string;
  caption: string;
  isRead: boolean;
  createdAt: string;
}

interface HashtagData {
  hashtag: string;
  videos: VideoData[];
  unreadCount: number;
}

const FeedReelScrollScreen: FC = () => {
  const route = useRoute();
  const dispatch = useAppDispatch();
  const routeParams = route?.params as RouteProp;
  const verticalFlatListRef = useRef<FlatList>(null);
  const horizontalScrollRefs = useRef<Record<string, FlatList>>({});
  const initialIndexRef = useRef<number>(routeParams?.initialIndex || 0);
  const hasInitializedRef = useRef(false);
  const isFirstRender = useRef(true);
  const mountTimeRef = useRef(Date.now());

  // Generate a truly unique ID - combining both mounted time and random part
  // to ensure complete reset when returning to this screen
  const screenInstanceId = useRef(`${Date.now()}-${Math.random().toString(36).substring(2, 9)}`).current;

  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<VideoData[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [readyToPlay, setReadyToPlay] = useState(false);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [videoLoadStates, setVideoLoadStates] = useState<Record<string, boolean>>({});
  const [allHashtags, setAllHashtags] = useState<string[]>([]);
  const [hashtagData, setHashtagData] = useState<HashtagData[]>([]);
  const [currentHashtagIndex, setCurrentHashtagIndex] = useState<number>(0);
  const [currentVideoIndexes, setCurrentVideoIndexes] = useState<Record<string, number>>({});
  const originalCategoryIndexRef = useRef<number | null>(null);
  const allowBackScrolling = !routeParams?.preventBackSwiping;

  // Define viewability configurations with stricter thresholds to ensure immediate pausing
  const horizontalViewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 95, // Only consider items viewable if they're 95% or more visible
    minimumViewTime: 100, // Reduced time to ensure faster response
  }), []);

  const verticalViewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 95, // Only consider items viewable if they're 95% or more visible
    minimumViewTime: 100, // Reduced time to ensure faster response
  }), []);

  // Add app state tracking
  const appState = useRef(AppState.currentState);
  const [appActive, setAppActive] = useState(true);
  
  // Keep track of videos that have already been preloaded to avoid duplicate requests
  const preloadedVideos = useRef<Set<string>>(new Set());
  
  // Add a flag to force pause/stop all videos
  const [forceStopAllVideos, setForceStopAllVideos] = useState(false);

  // Track if user is currently scrolling
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to handle scroll start
  const handleScrollBegin = useCallback(() => {
    setIsScrolling(true);
    // Immediately pause all videos when scrolling starts
    setForceStopAllVideos(true);
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  // Function to handle scroll end
  const handleScrollEnd = useCallback(() => {
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set a short timeout to ensure scrolling has truly stopped
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      // Resume video playback (if appropriate)
      setForceStopAllVideos(false);
    }, 150); // Short delay to ensure scrolling has stopped
  }, []);

  // Add a separate more reliable handler for horizontal scroll end
  const handleHorizontalScrollEnd = useCallback((hashtag: string, event: any) => {
    // Calculate which video is now visible based on scroll position
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const width = event.nativeEvent.layoutMeasurement.width;
    const currentIndex = Math.round(contentOffsetX / width);
    
    console.log(`Horizontal scroll ended for ${hashtag}. New index: ${currentIndex}`);
    
    // Update current video index for this hashtag
    setCurrentVideoIndexes(prev => ({
      ...prev,
      [hashtag]: currentIndex
    }));
    
    // Regular scroll end handling
    handleScrollEnd();
  }, [handleScrollEnd]);

  // Cleanup for scroll timeout
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Add a function to clear all video playback state
  const clearAllVideoState = useCallback(() => {
    console.log('FeedReelScrollScreen: Stopping all videos forcefully');
    // Reset state
    setForceStopAllVideos(true);
    setReadyToPlay(false);
    
    // Wait for state update then continue
    setTimeout(() => {
      setVideoLoadStates({});
      preloadedVideos.current.clear();
    }, 50);
  }, []);

  // Function to fully reset FlatList references
  const resetFlatListRefs = useCallback(() => {
    // Create new empty objects for references instead of nullifying them
    console.log('Resetting all FlatList references');
    horizontalScrollRefs.current = {};
    // We can't directly reset the verticalFlatListRef.current to null as it's read-only
    // Instead we'll handle this by using the key prop to force unmount/remount
  }, []);

  // Reset all state when screen gains focus
  useFocusEffect(
    useCallback(() => {
      console.log('FeedReelScrollScreen gained focus with screenInstanceId:', screenInstanceId);
      
      // Don't run on first render, only when returning to screen
      if (!isFirstRender.current) {
        console.log('Resetting FeedReelScrollScreen on refocus');
        
        // Clear playback state and forcibly stop videos
        clearAllVideoState();
        
        // Reset FlatList references
        resetFlatListRefs();
        
        // Reset view state
        hasInitializedRef.current = false;
        
        // Force a re-render of all video components
        setCurrentHashtagIndex(0);
        setCurrentVideoIndexes({});
      } else {
        isFirstRender.current = false;
      }
      
      // Enable video playback with a delay to ensure all previous videos are stopped
      setTimeout(() => {
        console.log('Enabling video playback on screen focus');
        setForceStopAllVideos(false);
        setReadyToPlay(true);
      }, 300);
      
      return () => {
        // When leaving this screen, stop all videos immediately
        console.log('FeedReelScrollScreen lost focus, stopping all videos');
        setForceStopAllVideos(true);
      };
    }, [clearAllVideoState, resetFlatListRefs])
  );

  // Add app state change handler to pause videos when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        console.log('App has come to the foreground!');
        setAppActive(true);
        setForceStopAllVideos(false);
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App has gone to the background
        console.log('App has gone to the background!');
        setAppActive(false);
        setForceStopAllVideos(true); // Force stop all videos
      }
      
      appState.current = nextAppState;
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  // Reset force stop when screen comes into focus and app is active
  useFocusEffect(
    useCallback(() => {
      // Reset the force stop when screen comes into focus and app is active
      if (appActive) {
        setForceStopAllVideos(false);
      }
    }, [appActive])
  );

  // Function to completely reset the component state
  const resetComponentState = useCallback(() => {
    // Reset all state variables
    setLoading(false);
    setOffset(0);
    setData([]);
    setHasMore(true);
    setReadyToPlay(false);
    setSelectedHashtag(null);
    setVideoLoadStates({});
    setAllHashtags([]);
    setHashtagData([]);
    setCurrentHashtagIndex(0);
    setCurrentVideoIndexes({});
    setForceStopAllVideos(true);
    
    // Reset refs
    hasInitializedRef.current = false;
    preloadedVideos.current.clear();
    
    console.log('FeedReelScrollScreen: Component state fully reset');
  }, []);

  // Initialize data and setup when component mounts or route params change
  useEffect(() => {
    // Reset state if route params have changed
    if (isFirstRender.current) {
      isFirstRender.current = false;
    } else {
      resetComponentState();
    }
    
    const initializeScreen = async () => {
      if (!routeParams?.data || hasInitializedRef.current) return;

      console.log('Initializing FeedReelScrollScreen with new uniqueScreenId:', screenInstanceId);
      
      // Ensure we stop any previously playing videos
      setForceStopAllVideos(true);
      
      // Get initial data and settings from route params
      const initialData = [...routeParams.data];
      const initialIndex = routeParams.initialIndex || 0;
      const initialSelectedHashtag = routeParams.selectedHashtag || null;
      const clickedVideoId = initialData[initialIndex]?._id;
        
      // Set basic state
      setData(initialData);
      setOffset(initialData.length);
      setSelectedHashtag(initialSelectedHashtag);
      
      // Process hashtags from all videos
      const extractedHashtags = extractUniqueHashtags(initialData);
      
      // If we have allHashtags from params, use them
      if (routeParams.allHashtags && routeParams.allHashtags.length > 0) {
        setAllHashtags(routeParams.allHashtags);
      } else {
        // Otherwise use extracted hashtags
        setAllHashtags(extractedHashtags);
      }
      
      // Group videos by hashtag, with unread videos first but keeping the original order
      const processedHashtagData = organizeVideosByHashtag(initialData, extractedHashtags);
      setHashtagData(processedHashtagData);
      
      // Find the hashtag and index for the clicked video
      let initialHashtagIndex = 0;
      let initialVideoIndex = initialIndex;
      let targetHashtag = initialSelectedHashtag || '';
      
      // If target hashtag is provided, find its index
      if (targetHashtag) {
        initialHashtagIndex = processedHashtagData.findIndex(h => h.hashtag === targetHashtag);
        if (initialHashtagIndex === -1) initialHashtagIndex = 0;
      } 
      
      if (!targetHashtag || initialHashtagIndex === -1) {
        // Find which hashtag contains our clicked video and at what position
        for (let i = 0; i < processedHashtagData.length; i++) {
          const hashtagItem = processedHashtagData[i];
          const videoIndex = hashtagItem.videos.findIndex(v => v._id === clickedVideoId);
          
          if (videoIndex !== -1) {
            initialHashtagIndex = i;
            initialVideoIndex = videoIndex;
            targetHashtag = hashtagItem.hashtag;
            break;
          }
        }
      }
      
      // Initialize the positions
      setCurrentHashtagIndex(initialHashtagIndex);
      
      // Initialize video indices for all hashtags, using the initial index for the target hashtag
      const initialVideoIndexes: Record<string, number> = {};
      processedHashtagData.forEach(hashtagItem => {
        if (hashtagItem.hashtag === targetHashtag) {
          // For the target hashtag, use the provided index
          initialVideoIndexes[hashtagItem.hashtag] = initialVideoIndex;
        } else {
          // For other hashtags, default to 0
          initialVideoIndexes[hashtagItem.hashtag] = 0;
        }
      });
      
      setCurrentVideoIndexes(initialVideoIndexes);
      
      // Set selected hashtag based on found hashtag
      if (targetHashtag) {
        setSelectedHashtag(targetHashtag);
      }
      
      // Allow videos to play once initialization is complete
      setForceStopAllVideos(false);
          
      // Pre-cache videos
      try {
        // Find the hashtag item that contains our target video
        const targetHashtagItem = processedHashtagData.find(h => h.hashtag === targetHashtag);
        if (targetHashtagItem && targetHashtagItem.videos.length > 0) {
          // Preload the selected video first (high priority)
          const selectedVideo = targetHashtagItem.videos[initialVideoIndex];
          if (selectedVideo && selectedVideo.videoUri) {
            const currentUri = convertToProxyURL(selectedVideo.videoUri);
            preloadedVideos.current.add(currentUri); // Track this as preloaded
          await fetch(currentUri, { 
            method: 'HEAD',
            headers: { 'Priority': 'high' }
          });
        }

          // Then preload adjacent videos (lower priority)
          await preloadAdjacentVideos(targetHashtagItem.videos, initialVideoIndex);
        }

        // Mark as ready to play
        setReadyToPlay(true);
        hasInitializedRef.current = true;

        // Scroll to initial hashtag position with a slight delay to ensure rendering is complete
        setTimeout(() => {
          // Scroll vertically to the correct hashtag
          if (verticalFlatListRef.current && initialHashtagIndex > 0) {
            verticalFlatListRef.current.scrollToIndex({
              index: initialHashtagIndex,
              animated: false,
              viewPosition: 0
            });
          }
          
          // Scroll horizontally to the clicked video position
          if (targetHashtag && horizontalScrollRefs.current[targetHashtag]) {
            horizontalScrollRefs.current[targetHashtag].scrollToIndex({
              index: initialVideoIndex,
              animated: false,
              viewPosition: 0.5 // Center the video
            });
          }
        }, 600); // Increased timeout to ensure UI is ready
      } catch (error) {
        console.error('Error initializing videos:', error);
        setReadyToPlay(true);
        hasInitializedRef.current = true;
        }
    };

    initializeScreen();
  }, [routeParams, screenInstanceId, resetComponentState]);

  // Helper function to extract unique hashtags from all videos
  const extractUniqueHashtags = (videos: VideoData[]): string[] => {
    const hashtagSet = new Set<string>();
    
    videos.forEach(video => {
      const hashtags = extractHashtags(video.caption);
      hashtags.forEach(tag => hashtagSet.add(tag));
    });
    
    return Array.from(hashtagSet);
  };

  // Helper function to extract hashtags from caption
  const extractHashtags = (caption: string): string[] => {
    if (!caption) return [];
    return caption.split(' ').filter(word => word.startsWith('#'));
  };

  // Helper to organize videos by hashtag, with unread videos first but keeping the original order
  const organizeVideosByHashtag = (videos: VideoData[], hashtags: string[]): HashtagData[] => {
    const hashtagMap: Record<string, VideoData[]> = {};
    const unreadCounts: Record<string, number> = {};
    
    // Initialize hashtag arrays and unread counters
    hashtags.forEach(tag => {
      hashtagMap[tag] = [];
      unreadCounts[tag] = 0;
    });
    
    // Group videos by hashtag while maintaining original order
    videos.forEach(video => {
      const videoHashtags = extractHashtags(video.caption);
      
      videoHashtags.forEach(tag => {
        if (hashtagMap[tag]) {
          // Check if the video is already in the array to avoid duplicates
          if (!hashtagMap[tag].some(v => v._id === video._id)) {
            hashtagMap[tag].push(video);
            
            // Count unread videos
            if (!video.isRead) {
              unreadCounts[tag]++;
            }
          }
        }
      });
    });
    
    // Convert to HashtagData array without sorting
    return hashtags.map(tag => ({
      hashtag: tag,
      videos: hashtagMap[tag],
      unreadCount: unreadCounts[tag]
    })).filter(item => item.videos.length > 0); // Remove empty hashtags
  };

  // Mark videos as read when viewed
  const markVideoAsRead = useCallback(async (videoId: string) => {
    try {
      // Update local state
      setData(prevData => prevData.map(item => 
        item._id === videoId ? { ...item, isRead: true } : item
      ));
      
      // No need to update the server here as this is handled by the API
      console.log('Marked video as read:', videoId);
      
      // Update the hashtagData to reflect this change
      setHashtagData(prev => prev.map(hashtag => ({
        ...hashtag,
        videos: hashtag.videos.map(video => 
          video._id === videoId ? { ...video, isRead: true } : video
        ),
        unreadCount: hashtag.videos.some(v => v._id === videoId && !v.isRead) 
          ? hashtag.unreadCount - 1 
          : hashtag.unreadCount
      })));
    } catch (error) {
      console.error('Error marking video as read:', error);
    }
  }, []);

  // Function to preload adjacent videos (with deduplication)
  const preloadAdjacentVideos = useCallback(async (videos: VideoData[], currentIndex: number) => {
    // Define which videos to preload (previous, next, next+1)
    const indicesToPreload = [
      currentIndex - 1,  // Previous video
      currentIndex + 1,  // Next video
      currentIndex + 2   // Next + 1 video
    ].filter(i => i >= 0 && i < videos.length);
    
    // Preload each video if not already preloaded
    for (const index of indicesToPreload) {
      const video = videos[index];
      if (video && video.videoUri) {
        const proxyUri = convertToProxyURL(video.videoUri);
        
        // Only fetch if we haven't preloaded this video yet
        if (!preloadedVideos.current.has(proxyUri)) {
          preloadedVideos.current.add(proxyUri); // Mark as preloaded
          
          try {
            // Use explicit timeout to avoid hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout
            
            // Lower priority for adjacent videos
            const response = await fetch(proxyUri, { 
              method: 'HEAD',
              headers: { 
                'Priority': 'low',
                'Cache-Control': 'no-cache', // Force fresh request
                'Pragma': 'no-cache'
              },
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              console.log('Successfully preloaded video at index:', index);
            } else {
              console.log('Error preloading video - status:', response.status);
              // If HEAD fails, try a small range request as fallback (esp. for WiFi issues)
              fetch(proxyUri, {
                headers: { 'Range': 'bytes=0-10000' }
              }).catch(() => {});
            }
          } catch (err: any) {
            console.log('Error preloading video:', err.message);
            // On timeout or error, try a direct fetch as fallback
            if (err.name === 'AbortError') {
              console.log('Preload timed out, trying direct fetch');
              // Use reload instead of cache property
              fetch(proxyUri).catch(() => {});
            }
          }
        }
      }
    }
  }, []);

  // Handle when a horizontal item becomes visible (changing video within hashtag)
  const onHorizontalViewableItemsChanged = useCallback((hashtag: string) => ({ viewableItems, changed }: { viewableItems: Array<ViewToken>, changed: Array<ViewToken> }) => {
    // If currently scrolling, track items but don't update visibility
    // but collect data about what's becoming visible for when scrolling stops
    const fullyVisibleItems = viewableItems.filter(item => {
      if (typeof item.isViewable === 'number') {
        return item.isViewable >= 0.90; // 90% threshold
      }
      return item.isViewable === true;
    });
    
    if (fullyVisibleItems.length > 0) {
      const visibleItem = fullyVisibleItems[0];
      if (visibleItem.index !== null) {
        const newIndex = visibleItem.index as number;
        
        // Set the current video index in state for proper rendering
        // but don't allow new videos to play until scrolling stops
        setCurrentVideoIndexes(prev => {
          // Only update if different to avoid unnecessary re-renders
          if (prev[hashtag] !== newIndex) {
            console.log(`Updating video index for ${hashtag} from ${prev[hashtag]} to ${newIndex}`);
            return {
              ...prev,
              [hashtag]: newIndex
            };
          }
          return prev;
        });
        
        // Mark the current video as watched if not scrolling
        if (!isScrolling) {
          const currentVideo = visibleItem.item as VideoData;
          if (currentVideo && !currentVideo.isRead) {
            markVideoAsRead(currentVideo._id);
          }
          
          // Preload adjacent videos for smooth playback if not scrolling
          const hashtagItem = hashtagData.find(h => h.hashtag === hashtag);
          if (hashtagItem) {
            preloadAdjacentVideos(hashtagItem.videos, newIndex);
          }
        }
      }
    }
    
    // Handle videos that are no longer fully visible
    changed.forEach(item => {
      if (item.index !== null) {
        const video = item.item as VideoData;
        
        // Even a slight change in visibility should mark as read and trigger pause
        if (!item.isViewable || (typeof item.isViewable === 'number' && item.isViewable < 0.90)) {
          // If it's an unread video, mark it as read
          if (video && !video.isRead) {
            markVideoAsRead(video._id);
          }
        }
      }
    });
  }, [hashtagData, preloadAdjacentVideos, markVideoAsRead, isScrolling]);

  // Handler for when a video ends - mark it as watched
  const handleVideoEnd = useCallback((hashtag: string, index: number) => {
    const hashtagItem = hashtagData.find(h => h.hashtag === hashtag);
    if (!hashtagItem) return;
    
    const video = hashtagItem.videos[index];
    if (video && !video.isRead) {
      markVideoAsRead(video._id);
    }
  }, [hashtagData, markVideoAsRead]);

  // Fetch more videos
  const fetchMoreVideos = useCallback(async () => {
      if (loading || !hasMore) return;
    
      setLoading(true);
      try {
      const newData = await dispatch(fetchFeedScrollReel(offset, 5));
      if (newData?.length) {
        // Add to existing data
        const combinedData = [...data, ...newData];
        setData(combinedData);
        setOffset(prev => prev + newData.length);
        setHasMore(newData.length >= 5);
        
        // Extract new hashtags
        const updatedUniqueHashtags = extractUniqueHashtags(combinedData);
        setAllHashtags(updatedUniqueHashtags);
        
        // Update hashtag data
        const updatedHashtagData = organizeVideosByHashtag(combinedData, updatedUniqueHashtags);
        setHashtagData(updatedHashtagData);
        
        // Preload first video from new batch
        if (newData[0]?.videoUri) {
          const nextUri = convertToProxyURL(newData[0].videoUri);
          fetch(nextUri, { 
            method: 'HEAD',
            headers: { 'Priority': 'high' }
          }).catch(() => {});
        }
      } else {
        setHasMore(false);
          }
        } catch (error) {
      console.error('Error fetching more videos:', error);
        } finally {
          setLoading(false);
        }
  }, [loading, hasMore, offset, dispatch, data]);

  // Store the original category index from route params
  useEffect(() => {
    console.log('FeedReelScrollScreen - Route params:', {
      initialIndex: routeParams?.initialIndex,
      selectedHashtag: routeParams?.selectedHashtag,
      originalCategoryIndex: routeParams?.originalCategoryIndex,
      hashtagsCount: routeParams?.allHashtags?.length,
      preventBackSwiping: routeParams?.preventBackSwiping
    });

    if (routeParams?.originalCategoryIndex !== undefined) {
      originalCategoryIndexRef.current = routeParams.originalCategoryIndex;
      console.log('Stored original category index:', originalCategoryIndexRef.current);
    }
  }, [routeParams]);

  // Custom goBack function to preserve the original category index
  const handleGoBack = async () => {
    try {
      if (routeParams?.originalCategoryIndex !== undefined) {
        await AsyncStorage.setItem('lastActiveCategoryIndex', String(routeParams.originalCategoryIndex));
      }
      goBack();
    } catch (error) {
      console.error('Error in handleGoBack:', error);
      goBack();
    }
  };

  // Avoid clearing our index in App.tsx
  useEffect(() => {
    // Check if App.tsx has cleared our index
    const checkForClearedStorage = async () => {
      try {
        // First verify if original index is set
        if (originalCategoryIndexRef.current !== null) {
          // Check if our index is still in storage
          const savedIndex = await AsyncStorage.getItem('lastActiveCategoryIndex');
          console.log('Current saved index in storage:', savedIndex);
          
          // If it's not there, it might have been cleared - restore it
          if (!savedIndex && originalCategoryIndexRef.current !== null) {
            console.log('Index was cleared, restoring to:', originalCategoryIndexRef.current);
            await AsyncStorage.setItem(
              'lastActiveCategoryIndex', 
              String(originalCategoryIndexRef.current)
            );
          }
        }
      } catch (error) {
        console.error('Error checking cleared storage:', error);
      }
    };
    
    checkForClearedStorage();
  }, []);

  // Handle when a vertical item becomes visible (changing hashtag)
  const onVerticalViewableItemsChanged = useCallback(({ viewableItems, changed }: { viewableItems: Array<ViewToken>, changed: Array<ViewToken> }) => {
    if (viewableItems.length > 0) {
      const visibleItem = viewableItems[0];
      if (visibleItem.index !== null && visibleItem.isViewable) {
        const newHashtagIndex = visibleItem.index;
        
        // Only update if it's a new hashtag
        if (newHashtagIndex !== currentHashtagIndex) {
          console.log(`Changing from hashtag index ${currentHashtagIndex} to ${newHashtagIndex}`);
          setCurrentHashtagIndex(newHashtagIndex);
          
          // Update the current hashtag
          if (hashtagData[newHashtagIndex]) {
            setSelectedHashtag(hashtagData[newHashtagIndex].hashtag);
            
            // Force all videos to stop when switching hashtags to avoid audio overlap
            setForceStopAllVideos(true);
            setTimeout(() => {
              setForceStopAllVideos(false);
            }, 50);
          }
        }
      }
    }
    
    // Make sure to stop videos in hashtags that are no longer visible
    changed.forEach(item => {
      if (!item.isViewable && item.index !== null) {
        const hashtag = hashtagData[item.index]?.hashtag;
        if (hashtag) {
          console.log(`Ensuring all videos in hashtag ${hashtag} are stopped`);
          // The VideoItem components will handle stopping based on visibility
        }
      }
    });
  }, [currentHashtagIndex, hashtagData]);

  // Get layout information for vertical FlatList items
  const getVerticalItemLayout = useCallback(
    (_: any, index: number) => ({
      length: screenHeight,
      offset: screenHeight * index,
      index,
    }),
    []
  );

  // Get layout information for horizontal FlatList items
  const getHorizontalItemLayout = useCallback(
    (_: any, index: number) => ({
      length: screenWidth,
      offset: screenWidth * index,
      index,
    }),
    []
  );

  // Render a single vertical item (hashtag group)
  const renderHashtagItem = useCallback(({ item, index }: { item: HashtagData; index: number }) => {
    const isCurrentHashtag = index === currentHashtagIndex;
    const hashtag = item.hashtag;
    const videos = item.videos;
    
    // If no videos for this hashtag, return null
    if (!videos || videos.length === 0) return null;
    
    // Determine the initial index for horizontal scrolling
    const initialScrollIndex = currentVideoIndexes[hashtag] || 0;
    
    return (
      <View style={styles.hashtagContainer}>
        <View style={styles.hashtagHeader}>
          <Text style={styles.hashtagTitle}>{hashtag}</Text>
          <Text style={styles.videosCount}>
            {videos.length} {videos.length === 1 ? 'video' : 'videos'} 
            {item.unreadCount > 0 ? ` • ${item.unreadCount} unread` : ''}
          </Text>
        </View>
        
        <FlatList
          ref={(ref) => {
            // Store reference for this hashtag's horizontal list
            if (ref) {
              horizontalScrollRefs.current[hashtag] = ref;
            }
          }}
          data={videos}
          keyExtractor={(item) => `${item._id}-horizontal-${screenInstanceId}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate={'fast'}
          initialScrollIndex={initialScrollIndex}
          getItemLayout={getHorizontalItemLayout}
          onViewableItemsChanged={onHorizontalViewableItemsChanged(hashtag)}
          viewabilityConfig={horizontalViewabilityConfig}
          onScrollBeginDrag={handleScrollBegin}
          onScrollEndDrag={(event) => handleHorizontalScrollEnd(hashtag, event)}
          onMomentumScrollBegin={handleScrollBegin}
          onMomentumScrollEnd={(event) => handleHorizontalScrollEnd(hashtag, event)}
          scrollEventThrottle={16}
          onScrollToIndexFailed={(info) => {
            console.warn('Failed to scroll to index', info, videos.length);
            // Try to recover by scrolling to a safe index
            setTimeout(() => {
              if (horizontalScrollRefs.current[hashtag] && videos.length > 0) {
                const safeIndex = Math.min(info.index, videos.length - 1);
                horizontalScrollRefs.current[hashtag].scrollToIndex({
                  index: safeIndex,
                  animated: false,
                  viewPosition: 0.5
                });
              }
            }, 500);
          }}
          renderItem={({ item: video, index: videoIndex }) => (
            <View style={styles.videoContainer}>
              <VideoItem
                key={`${video._id}-${videoIndex}-${screenInstanceId}`}
                isVisible={
                  isCurrentHashtag && 
                  videoIndex === (currentVideoIndexes[hashtag] || 0) && 
                  readyToPlay && 
                  appActive &&
                  !isScrolling // Only visible if not scrolling
                }
                item={video}
                preload={isCurrentHashtag && Math.abs(videoIndex - (currentVideoIndexes[hashtag] || 0)) <= 1}
                index={videoIndex}
                currentIndex={currentVideoIndexes[hashtag] || 0}
                onVideoEnd={() => handleVideoEnd(hashtag, videoIndex)}
                forceStop={forceStopAllVideos || isScrolling || videoIndex !== (currentVideoIndexes[hashtag] || 0)}
              />
              
              {/* Video not read indicator */}
              {!video.isRead && (
                <View style={styles.unreadIndicator}>
                  <Text style={styles.unreadIndicatorText}>NEW</Text>
                </View>
              )}
              
              {/* Render video position indicator */}
              <View style={styles.videoPositionIndicatorCustom}>
                <Text style={styles.videoPositionText}>
                  {videoIndex + 1} / {videos.length}
                </Text>
              </View>
              
              {/* Render carousel dots for horizontal navigation */}
              <View style={styles.carouselDotsContainer}>
                {videos.map((_, i) => (
                  <View
                    key={`dot-${i}-${screenInstanceId}`}
                    style={[
                      styles.carouselDot,
                      i === videoIndex ? styles.carouselDotActive : null
                    ]}
                  />
                ))}
              </View>
            </View>
          )}
        />
      </View>
    );
  }, [
    currentHashtagIndex, 
    currentVideoIndexes, 
    readyToPlay, 
    getHorizontalItemLayout, 
    onHorizontalViewableItemsChanged,
    handleVideoEnd,
    appActive,
    forceStopAllVideos,
    screenInstanceId,
    isScrolling,
    handleScrollBegin,
    handleScrollEnd,
    handleHorizontalScrollEnd
  ]);

  // Handle vertical list reaching its end
  const handleEndReached = useCallback(() => {
    fetchMoreVideos();
  }, [fetchMoreVideos]);

  // Make sure we call resetComponentState when unmounting
  useEffect(() => {
    return () => {
      console.log('FeedReelScrollScreen unmounting, cleaning up resources');
      resetComponentState();
    };
  }, [resetComponentState]);

  // Add a polling mechanism to check for force stop flag
  useEffect(() => {
    let isMounted = true;
    let checkInterval: NodeJS.Timeout | null = null;
    
    // Function to check for force stop flag
    const checkForForceStop = async () => {
      if (!isMounted) return;
      
      try {
        const forceStop = await AsyncStorage.getItem('force_stop_all_videos');
        
        if (forceStop === 'true') {
          console.log('FeedReelScrollScreen: Detected force_stop_all_videos flag - stopping all videos');
          setForceStopAllVideos(true);
          setReadyToPlay(false);
          
          // Clear any active video states
          setVideoLoadStates({});
        }
      } catch (error) {
        console.error('Error checking force stop flag:', error);
      }
    };
    
    // Start polling for the flag
    checkInterval = setInterval(checkForForceStop, 300);
    
    // Cleanup
    return () => {
      isMounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, []);

  // Add an event listener for app state changes to ensure videos stop when app comes to foreground
  useEffect(() => {
    const handleAppActive = async () => {
      // Check for the force stop flag immediately when app becomes active
      try {
        const forceStop = await AsyncStorage.getItem('force_stop_all_videos');
        if (forceStop === 'true') {
          console.log('FeedReelScrollScreen: App active with force stop flag - stopping all videos');
          setForceStopAllVideos(true);
          setReadyToPlay(false);
          
          // Remove the flag
          await AsyncStorage.removeItem('force_stop_all_videos');
        }
      } catch (error) {
        console.error('Error handling app active state:', error);
      }
    };
    
    // Create a subscription to app state changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        handleAppActive();
      }
    });
    
    // Run once on mount
    handleAppActive();
    
    // Cleanup
    return () => {
      subscription.remove();
    };
  }, []);

  // Add cleanup effect to mark current video as watched when unmounting
  useEffect(() => {
    return () => {
      // Mark the current video as watched when component unmounts
      const currentHashtag = hashtagData[currentHashtagIndex];
      if (currentHashtag) {
        const currentVideoIndex = currentVideoIndexes[currentHashtag.hashtag] || 0;
        const currentVideo = currentHashtag.videos[currentVideoIndex];
        if (currentVideo && !currentVideo.isRead) {
          markVideoAsRead(currentVideo._id);
        }
      }
    };
  }, [currentHashtagIndex, hashtagData, currentVideoIndexes, markVideoAsRead]);

  return (
    <CustomView 
      style={styles.container} 
      key={`feed-screen-${screenInstanceId}-${isFirstRender.current ? 'initial' : 'remounted'}`}
    >
      <StatusBar barStyle="light-content" backgroundColor="black" translucent />
      
      {/* Main vertical FlatList for hashtags */}
      <FlatList
        ref={verticalFlatListRef}
        data={hashtagData}
        keyExtractor={(item) => `${item.hashtag}-vertical-${screenInstanceId}`}
        renderItem={renderHashtagItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        viewabilityConfig={verticalViewabilityConfig}
        onViewableItemsChanged={onVerticalViewableItemsChanged}
        getItemLayout={getVerticalItemLayout}
        initialScrollIndex={currentHashtagIndex}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        windowSize={3}
        maxToRenderPerBatch={3}
        removeClippedSubviews={false}
        decelerationRate={'fast'}
        scrollEventThrottle={16}
        onScrollBeginDrag={handleScrollBegin}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollBegin={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        ListFooterComponent={() =>
          loading ? (
            <View style={styles.footer}>
              <ActivityIndicator size="large" color={Colors.white} />
            </View>
          ) : null
        }
      />

      <Image source={Loader} style={styles.thumbnail} />

      {/* Back button */}
      <View style={styles.backButton}>
        <TouchableOpacity onPress={handleGoBack}>
          <Icon name="arrow-back" color="white" size={RFValue(20)} />
        </TouchableOpacity>
      </View>
      
      {/* Hashtag indicator */}
      {/* <View style={styles.hashtagIndicator}>
        <Text style={styles.currentHashtagText}>
          {selectedHashtag || 'Explore'}
        </Text>
        <Text style={styles.hashtagCountText}>
          {hashtagData.length > 0 ? `${currentHashtagIndex + 1}/${hashtagData.length}` : ''}
        </Text>
      </View> */}
      
      {/* Scroll direction helper */}
      {/* <View style={styles.instructionContainer}>
        <View style={styles.instruction}>
          <Icon name="swap-vert" color="white" size={RFValue(18)} />
          <Text style={styles.instructionText}>Swipe for different topics</Text>
        </View>
        <View style={styles.instruction}>
          <Icon name="swap-horiz" color="white" size={RFValue(18)} />
          <Text style={styles.instructionText}>Swipe for similar videos</Text>
        </View>
      </View> */}
    </CustomView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    marginTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    backgroundColor: Colors.black,
  },
  hashtagContainer: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
  },
  videoContainer: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 70 : 40,
    left: 15,
    zIndex: 99,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnail: {
    position: 'absolute',
    zIndex: -2,
    height: screenHeight,
    width: screenWidth,
    alignSelf: 'center',
    resizeMode: 'cover',
    top: 0,
  },
  hashtagHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 70 : 70,
    right: 20,
    zIndex: 99,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  hashtagTitle: {
    color: Colors.white,
    fontSize: RFValue(14),
    fontWeight: 'bold',
  },
  videosCount: {
    color: Colors.white,
    fontSize: RFValue(10),
    opacity: 0.8,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 20,
    right: 15,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 99,
  },
  unreadIndicatorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  carouselDotsContainer: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  carouselDotActive: {
    backgroundColor: 'white',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  swipeLeftIndicator: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: [{ translateY: -15 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeRightIndicator: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -15 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeText: {
    color: 'white',
    fontSize: RFValue(10),
    marginHorizontal: 5,
  },
  videoPositionIndicatorCustom: {
    position: 'absolute',
    top: 30,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 6,
    zIndex: 99,
    // Center horizontally with right edge aligned to unread indicator
    transform: [{ translateX: 0 }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPositionText: {
    color: 'white',
    fontSize: RFValue(12),
  },
  hashtagIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 70 : 40,
    right: 15,
    zIndex: 99,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  currentHashtagText: {
    color: Colors.white,
    fontSize: RFValue(12),
    fontWeight: 'bold',
  },
  hashtagCountText: {
    color: Colors.white,
    fontSize: RFValue(10),
    opacity: 0.8,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 120,
    right: 15,
    zIndex: 99,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 10,
  },
  instruction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  instructionText: {
    color: Colors.white,
    fontSize: RFValue(10),
    marginLeft: 5,
  },
});

export default FeedReelScrollScreen;