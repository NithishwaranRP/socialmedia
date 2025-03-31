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
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../redux/reduxHook';
import { fetchFeedReel, fetchHashtags } from '../../redux/actions/reelAction';
import { fetchUserByUsername } from '../../redux/actions/userAction';
import { navigate } from '../../utils/NavigationUtil';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import Video from 'react-native-video';
import { debounce } from 'lodash';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import convertToProxyURL from 'react-native-video-cache';

const normalizeWidth = (size: number) => PixelRatio.roundToNearestPixel(scale(size));
const normalizeHeight = (size: number) => PixelRatio.roundToNearestPixel(verticalScale(size));

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

  const handleRenderItemPress = useCallback(async (item: any, index: number, idx?:any) => {
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
    const preload = Math.abs(currentVideoIndex - index) <= 3;
    
    // Cache the video URI for better performance
    const cachedVideoUri = convertToProxyURL(videoUri);
    const shouldRenderVideo = isActive || preload;

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
            paused={!isActive}
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
            shutterColor="transparent"
            playWhenInactive={false}
            playInBackground={false}
            useTextureView={true}
            controls={false}
            disableFocus={true}
            hideShutterView
            volume={isMuted ? 0 : 1}
            bufferConfig={{
              minBufferMs: 15000,
              maxBufferMs: 50000,
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
          <Text style={styles.newsTitle1} numberOfLines={2}>{videoItem?.caption}</Text>
        </View>
        <TouchableOpacity style={styles.muteButton} onPress={() => setIsMuted(!isMuted)}>
          <Image source={isMuted ? require('../../assets/icons/mute.png') : require('../../assets/icons/unmute.png')} style={styles.muteIcon} />
        </TouchableOpacity>
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
  
  const renderNewsItem = ({ item, index }: { item: any; index: number }) => {
  const isActive = activeCategoryIndex === index; // Determine if the current item is active
  const currentHashtag = endlessHashtags[index];
  const thumbnails = groupedThumbnails[currentHashtag] || [];

  const cardStyle = thumbnails.length > 1 ? styles.multiThumbnailCard : styles.singleThumbnailCard;

  return (
    <View style={[styles.newsCard, cardStyle]}>
      {thumbnails.length > 1 ? (
        <View style={styles.gridContainer}>
          {thumbnails.map((thumb: any, idx: React.Key | null | undefined) => (
            <TouchableOpacity 
            key={idx} 
            onPress={() => handleRenderItemPress(item, index, idx)} // Navigate to news detail
            style={styles.thumbnailWrapper1} 
          >

           <Image
              // key={idx} 
              source={{ uri: thumb }}
              style={styles.gridImage}
            />
              </TouchableOpacity>
          ))}
        </View>
      ) : (
        <TouchableOpacity onPress={() => handleNewsPress(item, index)}>
          <Image
            source={{ uri: thumbnails[0] || 'https://via.placeholder.com/150' }}
            style={styles.newsImage}
          />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradientOverlay} />
        </TouchableOpacity>
      )}
    </View>
  );
};
        
        const loadMoreHashtags = () => {
          setEndlessHashtags(prev => [...prev, ...allHashtags]);
        };

        const startAutoScroll = () => {
          if (autoScrollIntervalRef.current) return;
      
          autoScrollIntervalRef.current = setInterval(() => {
            scrollPosition.current += 3 * scrollDirection.current; 
            const hashtags = allHashtags ? endlessHashtags : allHashtags;
            const contentOffsetX = scrollPosition.current;
            const viewSize = 100;
            const scrollableWidth = hashtags.length * viewSize;
      
            if (contentOffsetX + viewSize >= scrollableWidth - 250) {
              loadMoreHashtags(); // Load more hashtags
            }
            if (scrollPosition.current > hashtags.length * 100) { 
              scrollDirection.current = -1; // Change direction
            } else if (scrollPosition.current < 0) {
              scrollDirection.current = 1; // Reset direction
            }
      
            scrollViewRef.current?.scrollTo({ x: scrollPosition.current, animated: true });
          }, 50); // Adjust this interval for scroll speed
        };
      
        const stopAutoScroll = () => {
          if (autoScrollIntervalRef.current) {
            clearInterval(autoScrollIntervalRef.current);
            autoScrollIntervalRef.current = null;
          }
        };
      
        useEffect(() => {
          startAutoScroll(); // Start auto-scrolling on component mount.
      
          return () => {
            stopAutoScroll(); // Cleanup on unmount
          };
        }, [allHashtags, endlessHashtags]);
      
        const handleTouchStart = () => {
          stopAutoScroll(); // Stop auto scroll when the user touches
        };
      
        const handleTouchEnd = () => {
          // Wait for 3 seconds before starting auto scroll again
          setTimeout(() => {
            startAutoScroll(); // Resume auto scrolling
          }, 3000);
        };



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

    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>

        <StatusBar barStyle="light-content" backgroundColor="#000" translucent />
        <View>
      
          
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
            initialNumToRender={3} // Render fewer items initially
            maxToRenderPerBatch={3} // Render fewer items per batch
            windowSize={5} // Smaller window size for better performance
            removeClippedSubviews={true} // Remove items not in view
            updateCellsBatchingPeriod={50} // Update cells in batches
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{
              itemVisiblePercentThreshold: 50,
            }}
            onScroll={handleScrollBreakingNews}
            onEndReachedThreshold={0.5}
          />

          <ScrollView 
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
          </ScrollView>

      <ScrollView
      ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScrollEnd}
        onTouchStart={handleTouchStart} // Hook the touch start event
        onTouchEnd={handleTouchEnd} // Hook the touch end event
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

              return (
                <TouchableOpacity
                key={index}
                onPress={() => {
                  handleCategory(index);
                }}
                style={[styles.categoryItem, isActive && styles.activeCategory]}
              >
                <Text style={[styles.categoryText, isActive && styles.activeCategoryText]}>
                  {hashtag}
                </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridImage: {
    width: '100%', // Adjust as needed
    height: 300, // Adjust as needed
    borderRadius: 10,
    // marginBottom: 5,
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
  backgroundColor: 'rgba(245, 245, 245, 0.5)',
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
    width: '45%', // Two items per row with some margin
    marginBottom: 5,
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
    width: 60, // Adjust size as needed
    height: 60,
    borderRadius: 5,
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
    height: normalizeHeight(370),
    borderRadius: 20,
    overflow: 'hidden',
  },
  breakingNewsVideo: {
    width: '100%', // Ensures the video covers full width
    height: '100%', // Adjust height to prevent blank screen
    backgroundColor: 'black', // Fix black screen issue on some devices
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
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  firstRow: {
    flexDirection: 'row', // Row layout for the first row
    marginBottom: 5, // Space between the rows
  },
  
  secondRow: {
    flexDirection: 'row', // Row layout for the second row
  },
  categoryWrapper: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    gap: 8, // Space between buttons
    width: '100%',
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginTop: 10,
  },
  categoryItem: {
  backgroundColor: '#000',
  paddingVertical: 6,
  borderColor: '#d2d2d2',
  borderWidth: 0.5,
  paddingHorizontal: 16,
  borderRadius: 4,
  minWidth: 90,
  marginRight: 8,
  alignItems: 'center',
  justifyContent: 'center',
},
  categoryText: {
    fontSize: 14,
    color: '#d2d2d2', // Light gray text
    fontWeight: 'bold',
  },
  activeCategory: {
    backgroundColor: '#d2d2d2', // Slightly brighter for active category
    borderWidth:0.5,
  // borderColor:'grey'
  },
  activeCategoryText: {
    color: '#111', // White text for active category
  },
  badgeContainer: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#2999fe',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white', // Badge text color
    fontSize: 12,
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
    // paddingHorizontal: normalizeWidth(50),
    // paddingVertical: normalizeHeight(50),
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
    bottom: normalizeHeight(20),
    left: normalizeWidth(20),
    right: normalizeWidth(20),
  },
  newsTitle1: {
    fontSize: normalizeWidth(12),
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
    width: normalizeWidth(350), // Adjust as necessary
    height: normalizeHeight(240),
    borderRadius: 10,
    overflow: 'hidden',
  },
  multiThumbnailCard: {
    width: normalizeWidth(350), // Adjust as necessary
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000', // Background color
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
    width: '50%', // Adjust as needed
    height: 300, // Adjust as needed
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
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GlobalFeed;
