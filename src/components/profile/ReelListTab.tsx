import React, {useEffect, useState, useCallback, useRef, useMemo} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  View,
  FlatList,
} from 'react-native';
import ProfileReelCard from '../feed/ProfileReelCard';
import {useAppDispatch, useAppSelector} from '../../redux/reduxHook';
import {fetchReel} from '../../redux/actions/reelAction';
import CustomText from '../global/CustomText';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {RFValue} from 'react-native-responsive-fontsize';
import {Colors, useThemeColors} from '../../constants/Colors';
import {FONTS} from '../../constants/Fonts';
import {navigate} from '../../utils/NavigationUtil';
import {useNavigation} from '@react-navigation/native';
import {screenWidth} from '../../utils/Scaling';
import {debounce} from 'lodash';
import {selectUser} from '../../redux/reducers/userSlice';
import {selectDeletedReelIds} from '../../redux/reducers/reelSlice';

const ReelListTab: React.FC<{
  user: ProfileUser | undefined | User;
  type: 'post' | 'liked' | 'watched';
}> = React.memo(({user, type}) => {
  const colors = useThemeColors();
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
  const navigation = useNavigation();

  // Get deleted reel IDs from Redux
  const deletedReelIds = useAppSelector(selectDeletedReelIds);

  // Filter out deleted reels from data
  const filteredData = useMemo(() => {
    return data.filter(item => !deletedReelIds.includes(item._id));
  }, [data, deletedReelIds]);

  // Prevent excessive re-renders by only updating when filteredData changes
  const memoizedFilteredData = useMemo(() => filteredData, [filteredData]);

  // Get current user at component level, not in renderItem
  const currentUser = useAppSelector(selectUser);

  const renderItem = useCallback(({item, index}: {item: any; index: number}) => {
    const handlePressReel = () => {
      navigate('ReelScrollScreen', {
        data: filteredData,
        index,
      });
    };
    
    const handleDeleteSuccess = () => {
      // No need to refresh the data immediately
      // The Redux store will handle removing the item from the list
    };

    return (
      <ProfileReelCard
        item={item}
        onPressReel={handlePressReel}
        loading={false}
        onDeleteSuccess={handleDeleteSuccess}
      />
    );
  }, [filteredData]);

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

  // Listen for navigation params changes that signal a refresh is needed
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Check if we need to refresh data
      const parentNav = navigation.getParent();
      if (parentNav) {
        // Get current parent route params
        const parentState = parentNav.getState();
        const currentRouteIndex = parentState?.index ?? 0;
        const currentRoute = parentState?.routes[currentRouteIndex];
        // Access params safely with type assertion
        const params = currentRoute?.params as { refreshData?: number } || {};
        const refreshData = params.refreshData;
        
        if (refreshData) {
          // Clear the refresh flag to prevent duplicate refreshes
          parentNav.setParams({ refreshData: null });
          // Refresh the data
          handleRefresh();
        }
      }
    });

    return unsubscribe;
  }, [navigation, handleRefresh]);

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
          <ActivityIndicator color={colors.text} size="large" />
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="error-outline" size={RFValue(35)} color={colors.text} />
          <CustomText fontFamily={FONTS.Medium} variant="h6" style={styles.errorText}>
            {error}
          </CustomText>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Icon name="play-circle-outline" size={RFValue(35)} color={colors.text} />
        <CustomText fontFamily={FONTS.Medium} variant="h6">
          No {type} Reels here!
        </CustomText>
      </View>
    );
  }, [loading, error, type, colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={memoizedFilteredData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={3}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.theme]}
            tintColor={colors.theme}
          />
        }
        ListFooterComponent={
          offsetLoading && hasMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.text} size="small" />
            </View>
          ) : null
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
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
  footer: {
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