import React, {useEffect, useState, useCallback, useRef, useMemo} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  View,
  FlatList,
} from 'react-native';
import ProfileReelCard from '../feed/ProfileReelCard';
import {useAppDispatch} from '../../redux/reduxHook';
import {fetchReel} from '../../redux/actions/reelAction';
import CustomText from '../global/CustomText';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {RFValue} from 'react-native-responsive-fontsize';
import {Colors} from '../../constants/Colors';
import {FONTS} from '../../constants/Fonts';
import {navigate} from '../../utils/NavigationUtil';
import {screenWidth} from '../../utils/Scaling';
import {debounce} from 'lodash';

const ReelListTab: React.FC<{
  user: ProfileUser | undefined | User;
  type: 'post' | 'liked' | 'watched';
  headerComponent?: React.ReactNode;
}> = React.memo(({user, type, headerComponent}) => {
  const [loading, setLoading] = useState(true);
  const [offsetLoading, setOffsetLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Track fetch attempts
  const fetchAttempts = useRef(0);
  // Track if component is mounted
  const isMounted = useRef(true);
  // Track the first load
  const initialLoadComplete = useRef(false);

  const dispatch = useAppDispatch();

  // Prevent excessive re-renders
  const memoizedData = useMemo(() => data, [data]);

  const renderItem = useCallback(({item, index}: {item: any; index: number}) => {
    return (
      <ProfileReelCard
        onPressReel={() => {
          if (data && data.length > 0) {
            // Prepare data by ensuring the selected video only appears once
            const currentVideo = data[index];
            
            // Create an array starting from the current video
            // This ensures we only play videos that come after the current one
            const forwardVideos = data.slice(index);
            
            // Extract hashtags from caption
            const extractHashtags = (caption: string): string[] => {
              if (!caption) return [];
              return caption.split(' ').filter(word => word.startsWith('#'));
            };
            
            // Get hashtags from the current video
            const currentHashtags = extractHashtags(currentVideo.caption || '');
            const currentMainHashtag = currentHashtags.length > 0 ? currentHashtags[0] : null;
            
            // Create a mapping of video IDs to their indices for sorting
            const videoIndices: Record<string, number> = {};
            data.forEach((video, idx) => {
              if (video && video._id) {
                videoIndices[video._id] = idx;
              }
            });
            
            // Group videos by hashtag
            const videosByHashtag: Record<string, any[]> = {};
            const noHashtagVideos: any[] = [];
            
            // Collect all hashtags to create a sequence
            const allHashtagsSet = new Set<string>();
            
            // First gather all videos by hashtag
            forwardVideos.forEach(video => {
              const videoHashtags = extractHashtags(video.caption || '');
              
              // Add hashtags to our set
              videoHashtags.forEach(tag => allHashtagsSet.add(tag));
              
              if (videoHashtags.length === 0) {
                noHashtagVideos.push(video);
                return;
              }
              
              // Check if this video has the current hashtag
              if (currentMainHashtag && videoHashtags.includes(currentMainHashtag)) {
                if (!videosByHashtag[currentMainHashtag]) {
                  videosByHashtag[currentMainHashtag] = [];
                }
                
                // Avoid duplicating the current video
                if (video._id !== currentVideo._id || videosByHashtag[currentMainHashtag].length === 0) {
                  videosByHashtag[currentMainHashtag].push(video);
                }
                
                return;
              }
              
              // For videos with other hashtags
              const videoHashtag = videoHashtags[0];
              if (!videosByHashtag[videoHashtag]) {
                videosByHashtag[videoHashtag] = [];
              }
              videosByHashtag[videoHashtag].push(video);
            });
            
            // Convert the hashtag set to an array and prioritize the current hashtag
            let allHashtags = Array.from(allHashtagsSet);
            
            // Ensure current hashtag is first in the sequence
            if (currentMainHashtag && allHashtags.includes(currentMainHashtag)) {
              allHashtags = [
                currentMainHashtag,
                ...allHashtags.filter(tag => tag !== currentMainHashtag)
              ];
            }
            
            // Sort videos within each hashtag by their index
            Object.keys(videosByHashtag).forEach(hashtag => {
              videosByHashtag[hashtag].sort((a, b) => {
                const aIndex = videoIndices[a._id] || 0;
                const bIndex = videoIndices[b._id] || 0;
                return aIndex - bIndex;
              });
            });
            
            // Build the final ordered array
            let orderedVideos: any[] = [];
            
            // Start with the selected video
            if (currentVideo) {
              orderedVideos.push(currentVideo);
              
              // If the video was part of hashtag groups, make sure we don't duplicate it
              if (currentMainHashtag && videosByHashtag[currentMainHashtag]) {
                videosByHashtag[currentMainHashtag] = videosByHashtag[currentMainHashtag].filter(
                  video => video._id !== currentVideo._id
                );
              }
            }
            
            // Add the remaining videos with the same hashtag
            if (currentMainHashtag && videosByHashtag[currentMainHashtag]) {
              orderedVideos = [...orderedVideos, ...videosByHashtag[currentMainHashtag]];
            }
            
            // Add videos from other hashtags
            Object.keys(videosByHashtag).forEach(hashtag => {
              if (hashtag !== currentMainHashtag) {
                orderedVideos = [...orderedVideos, ...videosByHashtag[hashtag]];
              }
            });
            
            // Add videos with no hashtags
            orderedVideos = [...orderedVideos, ...noHashtagVideos];
            
            // Navigate to FeedReelScrollScreen with the ordered videos
            navigate('FeedReelScrollScreen', {
              data: orderedVideos,
              initialIndex: 0, // Start at the current video
              selectedHashtag: currentMainHashtag, // Pass the selected hashtag
              allHashtags: allHashtags, // Pass the sequence of all hashtags
            });
          }
        }}
        item={item}
        loading={false} // Handle loading at the list level instead
      />
    );
  }, [data]);

  const removeDuplicates = useCallback((inputData: any) => {
    const uniqueDataMap = new Map();
    inputData.forEach((item: any) => {
      if (!uniqueDataMap.has(item._id)) {
        uniqueDataMap.set(item._id, item);
      }
    });
    return Array.from(uniqueDataMap.values());
  }, []);

  // Debounced fetch function to prevent rapid multiple calls
  const debouncedFetchReels = useRef(
    debounce(async (scrollOffset: number, isRefresh: boolean, userId: string, fetchType: string) => {
      try {
        const reelData = {
          userId: userId,
          offset: scrollOffset,
        };
        
        setError(null);
        
        // Only show spinner on initial load or refresh
        if (scrollOffset === 0) {
          if (!initialLoadComplete.current) {
            setLoading(true);
          } else if (isRefresh) {
            setRefreshing(true);
          }
        } else {
          setOffsetLoading(true);
        }
        
        let newData: any[] = [];
        try {
          if (fetchType === 'post') {
            newData = await dispatch(fetchReel(reelData, 'reel'));
          } else if (fetchType === 'liked') {
            newData = await dispatch(fetchReel(reelData, 'likedreel'));
          } else {
            newData = await dispatch(fetchReel(reelData, 'watchedreel'));
          }
          
          // Reset fetch attempts on success
          fetchAttempts.current = 0;
          
          if (isMounted.current) {
            if (isRefresh) {
              setData([...newData]);
              setOffset(0);
            } else {
              setData(prevData => removeDuplicates([...prevData, ...newData]));
              setOffset(prevOffset => prevOffset + 5);
            }
            
            // Check if we have more data
            setHasMore(newData.length === 5);
            
            // Mark initial load as complete
            initialLoadComplete.current = true;
          }
        } catch (error) {
          if (isMounted.current) {
            console.error('Error fetching reels:', error);
            setError('Failed to load reels. Please try again.');
            
            // Increment fetch attempts
            fetchAttempts.current += 1;
            
            // If we've tried too many times, don't try again automatically
            if (fetchAttempts.current >= 3) {
              setHasMore(false);
            }
          }
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
          setOffsetLoading(false);
          setRefreshing(false);
        }
      }
    }, 300)
  ).current;

  const fetchReels = useCallback((scrollOffset: number, isRefresh: boolean) => {
    if (!user?.id) {
      setError('User ID not available');
      setLoading(false);
      return;
    }
    
    debouncedFetchReels(scrollOffset, isRefresh, user.id, type);
  }, [debouncedFetchReels, user?.id, type]);
  
  // Initial data load
  useEffect(() => {
    fetchReels(0, false);
    
    // Cleanup when unmounting
    return () => {
      isMounted.current = false;
      debouncedFetchReels.cancel();
    };
  }, [fetchReels]);

  const handleRefresh = useCallback(() => {
    if (refreshing) return; // Prevent multiple refreshes
    setData([]);
    setOffset(0);
    setHasMore(true);
    fetchReels(0, true);
  }, [fetchReels, refreshing]);

  const handleEndReached = useCallback(() => {
    if (hasMore && !offsetLoading && !loading && !refreshing) {
      fetchReels(offset, false);
    }
  }, [hasMore, offsetLoading, loading, refreshing, offset, fetchReels]);

  const keyExtractor = useCallback((item: any) => 
    `reel-${item._id || Math.random().toString()}`, []);

  const ListEmptyComponent = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={Colors.white} size="large" />
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="error-outline" size={RFValue(35)} color={Colors.white} />
          <CustomText fontFamily={FONTS.Medium} variant="h6" style={styles.errorText}>
            {error}
          </CustomText>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Icon name="play-circle-outline" size={RFValue(35)} color={Colors.white} />
        <CustomText fontFamily={FONTS.Medium} variant="h6">
          No {type} Reels here!
        </CustomText>
      </View>
    );
  }, [loading, error, type]);

  const ListFooterComponent = useCallback(() => {
    if (!offsetLoading || loading) {
      return null;
    }
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={Colors.white} size="small" />
      </View>
    );
  }, [offsetLoading, loading]);

  // Add this function to handle header rendering
  const ListHeaderComponentMemo = useCallback(() => {
    // If a header component is provided, render it
    if (headerComponent) {
      return <>{headerComponent}</>;
    }
    return null;
  }, [headerComponent]);

  return (
    <View style={styles.container}>
      <FlatList
        data={memoizedData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={3}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        initialNumToRender={9} // Show 3 rows initially
        maxToRenderPerBatch={9} // Render up to 3 rows at a time
        windowSize={5} // Keep 5 "pages" in memory
        updateCellsBatchingPeriod={100} // Increase batching period for better performance
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.white]}
            tintColor={Colors.white}
          />
        }
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={styles.flatlistContainer}
        ListHeaderComponent={ListHeaderComponentMemo}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  flatlistContainer: {
    paddingVertical: 20,
    paddingBottom: 80,
    flexGrow: 1,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
    width: '100%',
  },
  loadingFooter: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    marginTop: 10,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 10,
    marginHorizontal: 20,
  },
});

export default ReelListTab;