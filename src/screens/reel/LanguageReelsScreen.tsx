import React, {FC, useCallback, useEffect, useState} from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {useRoute} from '@react-navigation/native';
import {useAppDispatch} from '../../redux/reduxHook';
import {fetchReelsByLanguage} from '../../redux/actions/reelAction';
import VideoItem from '../../components/reel/VideoItem';
import CustomView from '../../components/global/CustomView';
import {RFValue} from 'react-native-responsive-fontsize';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {goBack} from '../../utils/NavigationUtil';
import {useThemeColors} from '../../constants/Colors';
import CustomText from '../../components/global/CustomText';
import {FONTS} from '../../constants/Fonts';

interface RouteProp {
  language: string;
}

const LanguageReelsScreen: FC = () => {
  const route = useRoute();
  const routeParams = route?.params as RouteProp;
  const dispatch = useAppDispatch();
  const colors = useThemeColors();

  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchReels = useCallback(async (currentOffset: number, isRefreshing: boolean = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const result = await dispatch(
        fetchReelsByLanguage(routeParams.language, currentOffset, 10)
      );

      if (isRefreshing) {
        setReels(result.reels);
      } else {
        setReels(prev => [...prev, ...result.reels]);
      }

      setHasMore(result.hasMore);
      setOffset(currentOffset + result.reels.length);
    } catch (error) {
      console.error('Error fetching reels:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch, routeParams.language]);

  useEffect(() => {
    fetchReels(0);
  }, [fetchReels]);

  const handleRefresh = useCallback(() => {
    setOffset(0);
    fetchReels(0, true);
  }, [fetchReels]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore && !refreshing) {
      fetchReels(offset);
    }
  }, [loading, hasMore, refreshing, offset, fetchReels]);

  const renderItem = useCallback(({item}: {item: any}) => {
    return <VideoItem item={item} isVisible={true} preload={true} />;
  }, []);

  const renderFooter = useCallback(() => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.text} />
      </View>
    );
  }, [loading, colors]);

  return (
    <CustomView>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBack()}>
          <Icon name="arrow-back" color={colors.text} size={RFValue(20)} />
        </TouchableOpacity>
        <CustomText
          variant="h6"
          fontFamily={FONTS.Medium}
          style={[styles.title, {color: colors.text}]}>
          {routeParams.language} Reels
        </CustomText>
      </View>

      <FlatList
        data={reels}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
    </CustomView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: RFValue(16),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    marginLeft: RFValue(16),
    fontSize: RFValue(18),
  },
  list: {
    paddingBottom: RFValue(16),
  },
  footer: {
    paddingVertical: RFValue(20),
    alignItems: 'center',
  },
});

export default LanguageReelsScreen; 