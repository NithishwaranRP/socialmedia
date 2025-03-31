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
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CustomView from '../../components/global/CustomView';
import { useRoute } from '@react-navigation/native';
import { useAppDispatch } from '../../redux/reduxHook';
import { screenHeight, screenWidth } from '../../utils/Scaling';
import { debounce } from 'lodash';
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

  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [currentVisibleIndex, setCurrentVisibleIndex] = useState<number>(0);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [processedHashtags, setProcessedHashtags] = useState<string[]>([]);
  const [videoIndices, setVideoIndices] = useState<Record<string, number>>({});
  const [allHashtags, setAllHashtags] = useState<string[]>([]);
  const [hashtagVideoMap, setHashtagVideoMap] = useState<Record<string, any[]>>({});
  const [currentHashtagIndex, setCurrentHashtagIndex] = useState<number>(0);
  const originalCategoryIndexRef = useRef<number | null>(null);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const onViewableItemsChanged = useRef(
    debounce(({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (viewableItems.length > 0) {
        setCurrentVisibleIndex(viewableItems[0].index || 0);
        
        // When a new video is viewed, check if we need to transition to the next hashtag
        if (viewableItems[0].item && viewableItems[0].index !== null) {
          checkHashtagTransition(viewableItems[0].item, viewableItems[0].index);
        }
      }
    }, 100)
  ).current;

  // Function to check if we need to transition to the next hashtag
  const checkHashtagTransition = (currentItem: any, index: number) => {
    if (!currentItem || !allHashtags.length) return;
    
    // Extract hashtags from the current video
    const videoHashtags = extractHashtags(currentItem.caption || '');
    
    // Find the hashtag that's currently playing
    const currentPlayingHashtag = videoHashtags.find(tag => allHashtags.includes(tag)) || null;
    
    // Check if we're playing a hashtag different from the selected one
    if (currentPlayingHashtag !== selectedHashtag) {
      // If the hashtag changed, update the selected hashtag
      setSelectedHashtag(currentPlayingHashtag);
      
      if (currentPlayingHashtag) {
        const tagIndex = allHashtags.indexOf(currentPlayingHashtag);
        if (tagIndex !== -1) {
          setCurrentHashtagIndex(tagIndex);
        }
      }
    }
    
    // Check if we need to find the next hashtag video
    // This happens when we're at the last video of a hashtag group
    const isLastVideoOfCurrentHashtag = isLastVideoForHashtag(currentItem, index);
    
    if (isLastVideoOfCurrentHashtag && currentPlayingHashtag) {
      // Find the next hashtag in sequence
      const currentTagIndex = allHashtags.indexOf(currentPlayingHashtag);
      if (currentTagIndex !== -1 && currentTagIndex < allHashtags.length - 1) {
        // Get the next hashtag
        const nextHashtag = allHashtags[currentTagIndex + 1];
        
        // Find the index of the first video with the next hashtag
        const nextVideoIndex = findFirstVideoWithHashtag(nextHashtag, index + 1);
        
        if (nextVideoIndex !== -1) {
          // We found a video with the next hashtag, update the state
          setSelectedHashtag(nextHashtag);
          setCurrentHashtagIndex(currentTagIndex + 1);
        }
      }
    }
  };
  
  // Helper function to check if the current video is the last one for its hashtag
  const isLastVideoForHashtag = (currentItem: any, currentIndex: number): boolean => {
    if (!currentItem) return false;
    
    // Get the hashtags of the current video
    const videoHashtags = extractHashtags(currentItem.caption || '');
    
    // Find the first matching hashtag that's in our sequence
    const relevantHashtag = videoHashtags.find(tag => allHashtags.includes(tag));
    if (!relevantHashtag) return false;
    
    // Check if there are any more videos with this hashtag after the current index
    const hasMoreVideosWithSameHashtag = data.slice(currentIndex + 1).some(video => {
      const nextVideoHashtags = extractHashtags(video.caption || '');
      return nextVideoHashtags.includes(relevantHashtag);
    });
    
    // If there are no more videos with this hashtag, it's the last one
    return !hasMoreVideosWithSameHashtag;
  };
  
  // Helper function to find the first video with a specific hashtag starting from a given index
  const findFirstVideoWithHashtag = (hashtag: string, startIndex: number): number => {
    const videoIndex = data.findIndex((video, idx) => {
      if (idx < startIndex) return false; // Skip videos before the start index
      
      const videoHashtags = extractHashtags(video.caption || '');
      return videoHashtags.includes(hashtag);
    });
    
    return videoIndex;
  };

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

  const fetchFeed = useCallback(
    debounce(async (offset: number) => {
      if (loading || !hasMore) return;
      setLoading(true);
      try {
        const newData = await dispatch(fetchFeedScrollReel(offset, 2));
        setOffset(offset + 2);
        if (newData?.length < 2) {
          setHasMore(false);
        }

        if (newData && newData.length > 0) {
          // Get all hashtags we've already processed
          const currentProcessedHashtags = [...processedHashtags];
          
          // Generate hashtag to video mapping for the new data
          const newHashtagMap = generateHashtagVideoMap(newData);
          
          // Update our overall hashtag-video mapping
          setHashtagVideoMap(prevMap => {
            const updatedMap = { ...prevMap };
            
            // Merge the new hashtag-video mappings with existing ones
            Object.keys(newHashtagMap).forEach(hashtag => {
              if (!updatedMap[hashtag]) {
                updatedMap[hashtag] = [];
              }
              
              // Add new videos for this hashtag that aren't already there
              newHashtagMap[hashtag].forEach(video => {
                if (!updatedMap[hashtag].some(v => v._id === video._id)) {
                  updatedMap[hashtag].push(video);
                }
              });
            });
            
            return updatedMap;
          });
          
          // Add any new hashtags we haven't seen before to allHashtags
          const newHashtags = Object.keys(newHashtagMap).filter(tag => 
            !allHashtags.includes(tag) && !currentProcessedHashtags.includes(tag)
          );
          
          if (newHashtags.length > 0) {
            setAllHashtags(prev => [...prev, ...newHashtags]);
          }
          
          // Process new videos according to hashtags
          const orderedNewVideos = arrangeVideosByHashtagPriority(newData);
          setData((prevData) => [...prevData, ...orderedNewVideos]);
        }
      } finally {
        setLoading(false);
      }
    }, 200),
    [loading, hasMore, selectedHashtag, processedHashtags, videoIndices, allHashtags, hashtagVideoMap, generateHashtagVideoMap]
  );

  // Function to arrange videos by hashtag priority
  const arrangeVideosByHashtagPriority = (videos: any[]): any[] => {
    // Create a mapping of hashtags to videos
    const videosByHashtag: Record<string, any[]> = {};
    const noHashtagVideos: any[] = [];
    const currentProcessedHashtags = [...processedHashtags];
    
    // Assign index to each video for sorting by position
    videos.forEach((video, index) => {
      if (!videoIndices[video._id]) {
        setVideoIndices(prev => ({ ...prev, [video._id]: index }));
      }
    });

    // Group videos by their hashtags
    videos.forEach(video => {
      const videoHashtags = extractHashtags(video.caption || '');
      
      if (videoHashtags.length === 0) {
        noHashtagVideos.push(video);
        return;
      }
      
      // Check if this video has any hashtags that match current hashtag sequence
      let matched = false;
      
      // First priority: Match the currently selected hashtag
      if (selectedHashtag && videoHashtags.includes(selectedHashtag)) {
        if (!videosByHashtag[selectedHashtag]) {
          videosByHashtag[selectedHashtag] = [];
        }
        videosByHashtag[selectedHashtag].push(video);
        matched = true;
      }
      
      // If not matched with current hashtag, try the next hashtags in sequence
      if (!matched) {
        // Find where we are in the hashtag sequence
        const currentIdx = selectedHashtag ? allHashtags.indexOf(selectedHashtag) : -1;
        
        // Check each hashtag from the video against our sequence
        for (const videoHashtag of videoHashtags) {
          const tagIndex = allHashtags.indexOf(videoHashtag);
          
          // Only match hashtags that come after the current one in sequence
          if (tagIndex > currentIdx) {
            if (!videosByHashtag[videoHashtag]) {
              videosByHashtag[videoHashtag] = [];
            }
            videosByHashtag[videoHashtag].push(video);
            matched = true;
            break; // Match with the first valid hashtag in sequence
          }
        }
      }
      
      // If still not matched, use the first hashtag
      if (!matched) {
        const primaryHashtag = videoHashtags[0];
        if (!videosByHashtag[primaryHashtag]) {
          videosByHashtag[primaryHashtag] = [];
        }
        videosByHashtag[primaryHashtag].push(video);
      }
    });

    // Sort videos within each hashtag group by their index in the original array
    Object.keys(videosByHashtag).forEach(hashtag => {
      videosByHashtag[hashtag].sort((a, b) => {
        return (videoIndices[a._id] || 0) - (videoIndices[b._id] || 0);
      });
    });

    // Create the final ordered array
    let orderedVideos: any[] = [];
    
    // 1. First add videos with the selected hashtag (if not processed yet)
    if (selectedHashtag && videosByHashtag[selectedHashtag] && !currentProcessedHashtags.includes(selectedHashtag)) {
      orderedVideos = [...videosByHashtag[selectedHashtag]];
      // Mark as processed
      if (!currentProcessedHashtags.includes(selectedHashtag)) {
        currentProcessedHashtags.push(selectedHashtag);
      }
    }
    
    // 2. Add videos from other hashtags based on hashtag sequence
    // First get all remaining hashtags not yet processed
    const remainingHashtags = allHashtags.filter(
      tag => tag !== selectedHashtag && !currentProcessedHashtags.includes(tag)
    );
    
    // Add them in order of the sequence
    remainingHashtags.forEach(hashtag => {
      if (videosByHashtag[hashtag]) {
        orderedVideos = [...orderedVideos, ...videosByHashtag[hashtag]];
        // Mark as processed
        if (!currentProcessedHashtags.includes(hashtag)) {
          currentProcessedHashtags.push(hashtag);
        }
      }
    });
    
    // 3. Add videos from any other hashtags not in our sequence
    Object.keys(videosByHashtag).forEach(hashtag => {
      // Skip hashtags we've already processed
      if (hashtag === selectedHashtag || remainingHashtags.includes(hashtag) || currentProcessedHashtags.includes(hashtag)) {
        return;
      }
      
      orderedVideos = [...orderedVideos, ...videosByHashtag[hashtag]];
      // Mark as processed
      if (!currentProcessedHashtags.includes(hashtag)) {
        currentProcessedHashtags.push(hashtag);
      }
    });
    
    // 4. Add videos with no hashtags
    orderedVideos = [...orderedVideos, ...noHashtagVideos];
    
    // Update processed hashtags
    setProcessedHashtags(currentProcessedHashtags);
    
    return orderedVideos;
  };

  useEffect(() => {
    // When the component mounts or routeParams change, prepare the video data
    if (routeParams?.data) {
      const initialData = [...routeParams.data];
      
      // Set initial video index to play first
      setCurrentVisibleIndex(routeParams.initialIndex || 0);
      
      // Get the selected hashtag from route params
      const primaryHashtag = routeParams.selectedHashtag || null;
      setSelectedHashtag(primaryHashtag);
      
      // Setup initial video indices
      const indices: Record<string, number> = {};
      const seenVideoIds = new Set<string>(); // Track seen video IDs to avoid duplicates
      
      initialData.forEach((video, idx) => {
        if (video && video._id) {
          // Only store the first index we see for each video
          if (!seenVideoIds.has(video._id)) {
            indices[video._id] = idx;
            seenVideoIds.add(video._id);
          }
        }
      });
      setVideoIndices(indices);
      
      // Extract all hashtags from videos and build a sequence
      const allTagsSet = new Set<string>();
      initialData.forEach(video => {
        const videoHashtags = extractHashtags(video.caption || '');
        videoHashtags.forEach(hashtag => {
          allTagsSet.add(hashtag);
        });
      });
      
      // IMPORTANT: Use the provided allHashtags exactly as they are from routeParams
      // This preserves the original order of hashtags
      const initialHashtags = routeParams.allHashtags || Array.from(allTagsSet);
      
      setAllHashtags(initialHashtags);
      setCurrentHashtagIndex(primaryHashtag ? initialHashtags.indexOf(primaryHashtag) : 0);
      
      // Generate map of hashtags to videos
      const hashtagsToVideos = generateHashtagVideoMap(initialData);
      setHashtagVideoMap(hashtagsToVideos);
      
      // Group videos by hashtag
      const videosByHashtag: Record<string, any[]> = {};
      const noHashtagVideos: any[] = [];
      const uniqueVideoIds = new Set<string>(); // Track videos to avoid duplicates
      
      // First, group all videos by their hashtag
      initialData.forEach(video => {
        // Skip already processed videos to avoid duplicates
        if (video._id && uniqueVideoIds.has(video._id)) {
          return;
        }
        
        // Add this video ID to our tracking set
        if (video._id) {
          uniqueVideoIds.add(video._id);
        }
        
        const videoHashtags = extractHashtags(video.caption || '');
        
        // Videos with no hashtags go to a separate array
        if (videoHashtags.length === 0) {
          noHashtagVideos.push(video);
          return;
        }
        
        // Check if this video has the selected hashtag
        if (primaryHashtag && videoHashtags.includes(primaryHashtag)) {
          if (!videosByHashtag[primaryHashtag]) {
            videosByHashtag[primaryHashtag] = [];
          }
          videosByHashtag[primaryHashtag].push(video);
          return;
        }
        
        // For other videos, use their first hashtag for grouping
        const videoHashtag = videoHashtags[0];
        if (!videosByHashtag[videoHashtag]) {
          videosByHashtag[videoHashtag] = [];
        }
        videosByHashtag[videoHashtag].push(video);
      });
      
      // Sort videos within each hashtag group by their index
      Object.keys(videosByHashtag).forEach(hashtag => {
        videosByHashtag[hashtag].sort((a, b) => {
          // Special case for selected hashtag - ensure selected video is first
          if (hashtag === primaryHashtag) {
            const initialVideoId = initialData[routeParams.initialIndex || 0]?._id;
            if (a._id === initialVideoId) return -1;
            if (b._id === initialVideoId) return 1;
          }
          
          // Sort by index
          return indices[a._id] - indices[b._id];
        });
      });
      
      // Build the final ordered array starting with the selected video
      let finalData: any[] = [];
      const processedTags: string[] = [];
      const processedVideoIds = new Set<string>(); // Track videos that have been included
      
      // 1. Add the selected video first
      if (routeParams.initialIndex !== undefined) {
        const selectedVideo = initialData[routeParams.initialIndex];
        if (selectedVideo && selectedVideo._id) {
          finalData.push(selectedVideo);
          processedVideoIds.add(selectedVideo._id);
          
          // Remove from its hashtag group to avoid duplication
          if (primaryHashtag && videosByHashtag[primaryHashtag]) {
            videosByHashtag[primaryHashtag] = videosByHashtag[primaryHashtag].filter(
              video => !processedVideoIds.has(video._id)
            );
          }
        }
      }
      
      // 2. Add remaining videos with the same hashtag as selected video
      if (primaryHashtag && videosByHashtag[primaryHashtag]) {
        // Add each video, checking for duplicates
        videosByHashtag[primaryHashtag].forEach(video => {
          if (video._id && !processedVideoIds.has(video._id)) {
            finalData.push(video);
            processedVideoIds.add(video._id);
          }
        });
        
        processedTags.push(primaryHashtag);
      }
      
      // 3. Add videos from other hashtags in sequence
      initialHashtags.forEach(hashtag => {
        if (hashtag !== primaryHashtag && videosByHashtag[hashtag]) {
          // Add each video, checking for duplicates
          videosByHashtag[hashtag].forEach(video => {
            if (video._id && !processedVideoIds.has(video._id)) {
              finalData.push(video);
              processedVideoIds.add(video._id);
            }
          });
          
          processedTags.push(hashtag);
        }
      });
      
      // 4. Add videos with no hashtags
      noHashtagVideos.forEach(video => {
        if (video._id && !processedVideoIds.has(video._id)) {
          finalData.push(video);
          processedVideoIds.add(video._id);
        }
      });
      
      // Set the processed data
      setData(finalData);
      setOffset(finalData.length);
      setProcessedHashtags(processedTags);
    }
  }, [routeParams?.data, routeParams?.initialIndex, routeParams?.selectedHashtag, routeParams?.allHashtags, generateHashtagVideoMap]);

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
      // Get the original index that was passed from GlobalFeed
      const currentIndex = originalCategoryIndexRef.current;
      console.log('Navigating back - Original category index:', currentIndex);
      
      if (currentIndex !== null) {
        // Save the index to AsyncStorage to make it available to GlobalFeed
        await AsyncStorage.setItem('lastActiveCategoryIndex', String(currentIndex));
        console.log('Saved category index to AsyncStorage:', currentIndex);
        
        // Additional check - read back what we just wrote to verify
        const savedValue = await AsyncStorage.getItem('lastActiveCategoryIndex');
        console.log('Verification - Read back saved index:', savedValue);
      } else {
        console.log('No original category index found to preserve');
      }
      
      // Navigate back using the standard goBack function
      goBack();
    } catch (error) {
      console.error('Error in handleGoBack:', error);
      // If there's an error, still go back but log the issue
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
          key={index}
          isVisible={index === currentVisibleIndex}
          item={item}
          preload={index >= currentVisibleIndex && index <= currentVisibleIndex + 2}
        />
      </View>
    ),
    [currentVisibleIndex]
  );

  return (
    <CustomView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" translucent />
      <FlatList
        data={data}
        keyExtractor={(item, index) => `${item._id}-${index}`}
        renderItem={renderVideoList}
        windowSize={2}
        pagingEnabled
        viewabilityConfig={viewabilityConfig}
        disableIntervalMomentum
        removeClippedSubviews
        maxToRenderPerBatch={2}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        initialNumToRender={1}
        onEndReached={async () => await fetchFeed(offset)}
        onEndReachedThreshold={0.1}
        ListFooterComponent={() =>
          loading ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={Colors.white} />
            </View>
          ) : null
        }
        decelerationRate={'normal'}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
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