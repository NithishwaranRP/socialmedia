import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
  Text,
} from 'react-native';
import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
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
}

const FeedReelScrollScreen: FC = () => {
  const route = useRoute();
  const dispatch = useAppDispatch();
  const routeParams = route?.params as RouteProp;
  const flatListRef = useRef<FlatList>(null);
  const initialIndexRef = useRef<number>(routeParams?.initialIndex || 0);
  const hasInitializedRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [currentVisibleIndex, setCurrentVisibleIndex] = useState<number>(routeParams?.initialIndex || 0);
  const [readyToPlay, setReadyToPlay] = useState(false);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [videoLoadStates, setVideoLoadStates] = useState<Record<string, boolean>>({});
  const [processedHashtags, setProcessedHashtags] = useState<string[]>([]);
  const [videoIndices, setVideoIndices] = useState<Record<string, number>>({});
  const [allHashtags, setAllHashtags] = useState<string[]>([]);
  const [hashtagVideoMap, setHashtagVideoMap] = useState<Record<string, any[]>>({});
  const [currentHashtagIndex, setCurrentHashtagIndex] = useState<number>(0);
  const originalCategoryIndexRef = useRef<number | null>(null);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 300,
  }).current;

  // Initialize data and setup when component mounts or route params change
  useEffect(() => {
    const initializeScreen = async () => {
      if (!routeParams?.data || hasInitializedRef.current) return;

      const initialData = [...routeParams.data];
      const initialIndex = routeParams.initialIndex || 0;
        
      // Set initial states
      setData(initialData);
      setOffset(initialData.length);
      setCurrentVisibleIndex(initialIndex);
          
      // Pre-cache videos
      try {
        // Preload current video
        if (initialData[initialIndex]?.videoUri) {
          const currentUri = convertToProxyURL(initialData[initialIndex].videoUri);
          await fetch(currentUri, { 
            method: 'HEAD',
            headers: { 'Priority': 'high' }
          });
        }

        // Preload next video if exists
        if (initialData[initialIndex + 1]?.videoUri) {
          const nextUri = convertToProxyURL(initialData[initialIndex + 1].videoUri);
          await fetch(nextUri, { 
            method: 'HEAD',
            headers: { 'Priority': 'high' }
          });
        }

        // Mark as ready to play
        setReadyToPlay(true);
        hasInitializedRef.current = true;

        // Scroll to initial position
        setTimeout(() => {
          if (flatListRef.current && initialIndex > 0) {
            flatListRef.current.scrollToIndex({
              index: initialIndex,
              animated: false,
              viewPosition: 0
            });
          }
        }, 100);
      } catch (error) {
        console.error('Error initializing videos:', error);
        // Still mark as ready even if preloading fails
        setReadyToPlay(true);
        hasInitializedRef.current = true;
        }
    };

    initializeScreen();
  }, [routeParams]);
  
  // Reset initialization when screen loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        hasInitializedRef.current = false;
        setReadyToPlay(false);
      };
    }, [])
  );

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
    if (viewableItems.length > 0) {
      const visibleItem = viewableItems[0];
      if (visibleItem.index !== null && visibleItem.isViewable) {
        setCurrentVisibleIndex(visibleItem.index);
        
        // Preload next videos
        const nextIndex = visibleItem.index + 1;
        if (nextIndex < data.length && data[nextIndex]?.videoUri) {
          const nextUri = convertToProxyURL(data[nextIndex].videoUri);
          fetch(nextUri, { 
            method: 'HEAD',
            headers: { 'Priority': 'high' }
          }).catch(() => {});
        }
      }
    }
  }, [data]);

  const handleVideoLoad = useCallback((videoId: string) => {
    setVideoLoadStates(prev => ({
      ...prev,
      [videoId]: true
    }));
  }, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: screenHeight,
      offset: screenHeight * index,
      index,
    }),
    []
  );

  // Helper function to extract hashtags from caption
  const extractHashtags = (caption: string): string[] => {
    if (!caption) return [];
    return caption.split(' ').filter(word => word.startsWith('#'));
  };

  // Generate a map of all unique hashtags and their corresponding videos
  const generateHashtagVideoMap = useCallback((videos: any[]): Record<string, any[]> => {
    const hashtagMap: Record<string, any[]> = {};
    
    videos.forEach(video => {
      const videoHashtags = extractHashtags(video.caption || '');
      
      videoHashtags.forEach(hashtag => {
        if (!hashtagMap[hashtag]) {
          hashtagMap[hashtag] = [];
        }
        
        // Only add the video if it's not already in the array
        if (!hashtagMap[hashtag].some(v => v._id === video._id)) {
          hashtagMap[hashtag].push(video);
        }
      });
    });
    
    return hashtagMap;
  }, []);

  const fetchMoreVideos = useCallback(async () => {
      if (loading || !hasMore) return;
    
      setLoading(true);
      try {
      const newData = await dispatch(fetchFeedScrollReel(offset, 2));
      if (newData?.length) {
        setData(prevData => [...prevData, ...newData]);
        setOffset(prev => prev + newData.length);
        setHasMore(newData.length >= 2);
        
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
  }, [loading, hasMore, offset, dispatch]);

  // Store the original category index from route params
  useEffect(() => {
    console.log('FeedReelScrollScreen - Route params:', {
      initialIndex: routeParams?.initialIndex,
      selectedHashtag: routeParams?.selectedHashtag,
      originalCategoryIndex: routeParams?.originalCategoryIndex,
      hashtagsCount: routeParams?.allHashtags?.length
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

  // Modify App.tsx's clear logic to avoid clearing our index
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

  const renderVideoList = useCallback(
    ({ item, index }: { item: any; index: number }) => (
        <View style={styles.videoContainer}>
          <VideoItem
          key={`${item._id}-${index}`}
          isVisible={index === currentVisibleIndex && readyToPlay}
            item={item}
          preload={index >= currentVisibleIndex - 1 && index <= currentVisibleIndex + 2}
          index={index}
          currentIndex={currentVisibleIndex}
          onVideoEnd={() => {
            if (index < data.length - 1) {
              // Update current index
              setCurrentVisibleIndex(index + 1);
              
              // Scroll to next video
              if (flatListRef.current) {
                flatListRef.current.scrollToIndex({
                  index: index + 1,
                  animated: true,
                  viewPosition: 0
                });
              }

              // Preload next video
              const nextIndex = index + 2;
              if (nextIndex < data.length && data[nextIndex]?.videoUri) {
                const nextUri = convertToProxyURL(data[nextIndex].videoUri);
                fetch(nextUri, { 
                  method: 'HEAD',
                  headers: { 'Priority': 'high' }
                }).catch(() => {});
                      }
            }
          }}
            />
            </View>
    ),
    [currentVisibleIndex, data.length, readyToPlay]
  );

  return (
    <CustomView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" translucent />
      <FlatList
        ref={flatListRef}
        data={data}
        keyExtractor={(item, index) => `${item._id}-${index}`}
        renderItem={renderVideoList}
        windowSize={3}
        pagingEnabled
        viewabilityConfig={viewabilityConfig}
        disableIntervalMomentum
        removeClippedSubviews={false}
        maxToRenderPerBatch={3}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        initialNumToRender={3}
        onEndReached={fetchMoreVideos}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() =>
          loading ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={Colors.white} />
            </View>
          ) : null
        }
        decelerationRate={'fast'}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        initialScrollIndex={initialIndexRef.current}
      />

      <Image source={Loader} style={styles.thumbnail} />

      <View style={styles.backButton}>
        <TouchableOpacity onPress={handleGoBack}>
          <Icon name="arrow-back" color="white" size={RFValue(20)} />
        </TouchableOpacity>
      </View>
    </CustomView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    marginTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    backgroundColor: Colors.black,
  },
  videoContainer: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 70 : 40,
    left: 10,
    zIndex: 99,
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
});

export default FeedReelScrollScreen;