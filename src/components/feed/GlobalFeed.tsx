// import {View, ImageBackground, StyleSheet, FlatList} from 'react-native';
// import React, {useEffect, useState} from 'react';
// import GlobalBg from '../../assets/images/globebg.jpg';
// import {screenHeight, screenWidth} from '../../utils/Scaling';
// import {fetchFeedReel} from '../../redux/actions/reelAction';
// import {useAppDispatch, useAppSelector} from '../../redux/reduxHook';
// import ReelItemCard from './ReelItemCard';
// import {
//   Gesture,
//   GestureDetector,
//   GestureHandlerRootView,
// } from 'react-native-gesture-handler';
// import Animated, {
//   useAnimatedStyle,
//   useSharedValue,
// } from 'react-native-reanimated';
// import StatsContainer from './StatsContainer';
// import {navigate} from '../../utils/NavigationUtil';

// function clamp(val: any, min: any, max: any) {
//   return Math.min(Math.max(val, min), max);
// }

// const GlobalFeed = () => {
//   const dispatch = useAppDispatch();
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const translateY = useSharedValue(0);
//   const translateX = useSharedValue(0);
//   const prevTranslationX = useSharedValue(0);
//   const prevTranslationY = useSharedValue(0);
//   const zoomScale = useSharedValue(1);
//   const zoomStartScale = useSharedValue(0);

//   const fetchFeed = async () => {
//     setLoading(true);
//     console.log('fetching');
//     const data = await dispatch(fetchFeedReel(0, 16));
//     console.log('failed');
//     console.log('data', data);s

//     setData(data);
//     setLoading(false);
//   };

//   useEffect(() => {
//     fetchFeed();
//   }, []);

//   const pinch = Gesture.Pinch()
//     .onStart(() => {
//       zoomStartScale.value = zoomScale.value;
//     })
//     .onUpdate(event => {
//       zoomScale.value = clamp(
//         zoomStartScale.value * event.scale,
//         0.3,
//         Math.min(screenWidth / 100, screenHeight / 100),
//       );
//     })
//     .runOnJS(true);

//   const pan = Gesture.Pan()
//     .minDistance(1)
//     .onStart(() => {
//       prevTranslationX.value = translateX.value;
//       prevTranslationY.value = translateY.value;
//     })
//     .onUpdate(event => {
//       const maxTranslateX = screenWidth - 10;
//       const maxTranslateY = screenHeight / 2 - 50;

//       translateX.value = clamp(
//         prevTranslationX.value + event.translationX,
//         -maxTranslateX,
//         maxTranslateX,
//       );
//       translateY.value = clamp(
//         prevTranslationY.value + event.translationY,
//         -maxTranslateY,
//         maxTranslateY,
//       );
//     })
//     .runOnJS(true);

//   const animatedStyle = useAnimatedStyle(() => {
//     return {
//       transform: [
//         {scale: zoomScale.value},
//         {
//           translateX: translateX.value,
//         },
//         {translateY: translateY.value},
//       ],
//     };
//   });

//   async function moveToFirst(arr: any[], index: number) {
//     await arr.unshift(arr.splice(index, 1)[0]);
//     return arr;
//   }

//   const renderItem = ({item, index}: {item: any; index: number}) => {
//     const verticalShift = index % 2 === 0 ? -20 : 20;
//     return (
//       <Animated.View style={{transform: [{translateY: verticalShift}]}}>
//         <ReelItemCard
//           item={item}
//           loading={loading}
//           onPressReel={async () => {
//             const copyarray = Array.from(data);
//             const result = await moveToFirst(copyarray, index);
//             navigate('FeedReelScrollScreen', {
//               data: result,
//             });
//           }}
//         />
//       </Animated.View>
//     );
//   };

//   return (
//     <GestureHandlerRootView style={{flex: 1}}>
//       <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
//         <ImageBackground
//           source={GlobalBg}
//           style={{flex: 1, zIndex: -1}}
//           imageStyle={{resizeMode: 'cover'}}>
//           <Animated.View style={[styles.container, animatedStyle]}>
//             <StatsContainer />
//             <View style={styles.gridContainer}>
//               {loading ? (
//                 <FlatList
//                   data={Array.from({length: 16})}
//                   renderItem={renderItem}
//                   keyExtractor={(item, index) => index.toString()}
//                   numColumns={4}
//                   pinchGestureEnabled
//                   scrollEnabled={false}
//                   contentContainerStyle={styles.flatlistContainer}
//                 />
//               ) : (
//                 <FlatList
//                   data={data}
//                   renderItem={renderItem}
//                   keyExtractor={(item, index) => index.toString()}
//                   numColumns={4}
//                   pinchGestureEnabled
//                   scrollEnabled={false}
//                   contentContainerStyle={styles.flatlistContainer}
//                 />
//               )}
//             </View>
//           </Animated.View>
//         </ImageBackground>
//       </GestureDetector>
//     </GestureHandlerRootView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     alignItems: 'center',
//   },
//   gridContainer: {
//     width: screenWidth * 5,
//     height: screenHeight * 2.9,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   flatlistContainer: {
//     paddingVertical: 20,
//     alignSelf: 'center',
//     justifyContent: 'flex-start',
//     alignItems: 'flex-start',
//   },
// });

// export default GlobalFeed;

import React, { useEffect, useState } from 'react';
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
import { fetchFeedReel } from '../../redux/actions/reelAction';
import { fetchUserByUsername } from '../../redux/actions/userAction';
import { navigate } from '../../utils/NavigationUtil';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';

const normalizeWidth = (size: number) => PixelRatio.roundToNearestPixel(scale(size));
const normalizeHeight = (size: number) => PixelRatio.roundToNearestPixel(verticalScale(size));

const categories = ['For You', 'Latest', 'Business', 'Sports', 'Education'];

const GlobalFeed = () => {
  const dispatch = useAppDispatch();
  const [newsData, setNewsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const activeCategory = categories[activeCategoryIndex];

  const { user } = useAppSelector(state => state.user);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      const result = await dispatch(fetchFeedReel(0, 16));
      if (result) setNewsData(result);
      setLoading(false);
    };
    fetchNews();
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchUserByUsername());
  }, [dispatch]);

  async function moveToFirst(arr: any[], index: number) {
    await arr.unshift(arr.splice(index, 1)[0]);
    return arr;
  }

  const handleSwipe = (direction: 'left' | 'right') => {
    let newIndex = activeCategoryIndex;
    if (direction === 'left' && activeCategoryIndex < categories.length - 1) {
      newIndex++;
    } else if (direction === 'right' && activeCategoryIndex > 0) {
      newIndex--;
    }
    setActiveCategoryIndex(newIndex);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > 50) {
        handleSwipe('right'); // Swipe Right
      } else if (gestureState.dx < -50) {
        handleSwipe('left'); // Swipe Left
      }
    },
  });

  const handleNewsPress = async (item: any, index: number) => {
    const copyArray = Array.from(newsData);
    const result = await moveToFirst(copyArray, index);
    
    navigate('FeedReelScrollScreen', {
      data: result,
    });
  };
  
  const renderBreakingNewsItem = ({ item, index }: { item: any, index: number }) => (
    <TouchableOpacity style={styles.breakingNewsCard} onPress={() => handleNewsPress(item, index)}>
      <Image source={{ uri: item?.thumbUri }} style={styles.breakingNewsImage} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradientOverlay} />
      <View style={styles.newsContent}>
        <View style={styles.tagsContainer1}>
          <Text style={styles.trendingTag1}>Trending #{index + 1}</Text>
          <Text style={styles.categoryTag1}>{item?.category || "Sports"}</Text>
        </View>
        <Text style={styles.newsTitle1} numberOfLines={2}>{item?.caption}</Text>
        <View style={styles.metaRow1}>
          <View style={styles.metaItem1}>
            <Image source={require('../../assets/icons/views.png')} style={styles.viewIcon1} />
            <Text style={styles.metaText1}>{item?.views || '451.8K'}</Text>
          </View>
          <View style={styles.metaItem1}>
            <Image source={require('../../assets/icons/comments.png')} style={styles.commentIcon1} />
            <Text style={styles.metaText1}>{item?.comments || '22.6K'}</Text>
          </View>
          <View style={styles.metaItem1}>
            <Image source={require('../../assets/icons/shares.png')} style={styles.shareIcon1} />
            <Text style={styles.metaText1}>{item?.shares || '10.2K'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning!';
    if (hour < 16) return 'Good Afternoon!';
    return 'Good Evening!';
  }
  // Render loading placeholder for Breaking News
  const renderBreakingNewsPlaceholder = () => (
    <View style={styles.breakingNewsCard}>
      <View style={styles.placeholderImage} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradientOverlay} />
      <View style={styles.newsContent}>
        <View style={styles.placeholderText} />
        <View style={styles.placeholderMeta}>
          <View style={styles.placeholderMetaItem} />
          <View style={styles.placeholderMetaItem} />
          <View style={styles.placeholderMetaItem} />
        </View>
      </View>
    </View>
  );

  // Render loading placeholder for categories
  const renderCategoriesPlaceholder = () => (
    <View style={styles.categoryItem}>
      <View style={styles.placeholderCategory} />
    </View>
  );

  const renderNewsItem = ({ item, index }: { item: any, index: number }) => {
    const isLastItem = index === newsData.length - 1 && newsData.length % 2 !== 0;
  
    return (
      <TouchableOpacity 
        style={[styles.newsCard, isLastItem && styles.lastNewsCard]} 
        onPress={() => handleNewsPress(item, index)} 
        {...panResponder.panHandlers}
      >
        <Image source={{ uri: item?.thumbUri }} style={styles.newsImage} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradientOverlay} />
        <View style={styles.newsContent}>
          <Text style={styles.newsTitle} numberOfLines={2}>{item?.caption || item?.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Image source={require('../../assets/icons/views.png')} style={styles.viewIcon} />
              <Text style={styles.metaText}>{item?.views || '451.8K'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Image source={require('../../assets/icons/comments.png')} style={styles.commentIcon} />
              <Text style={styles.metaText}>{item?.comments || '22.6K'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Image source={require('../../assets/icons/shares.png')} style={styles.shareIcon} />
              <Text style={styles.metaText}>{item?.shares || '10.2K'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />
      <FlatList
        data={loading ? Array.from({ length: 16 }) : newsData} // Show placeholders when loading
        renderItem={loading ? renderNewsItem : renderNewsItem} // Conditional rendering
        keyExtractor={(item, index) => index.toString()}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContainer}
        ListHeaderComponent={
          <View>
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>NewsAI.</Text>
            </View>
            <View style={styles.profileContainer}>
              <Image 
                source={{ uri: user?.userImage || 'https://via.placeholder.com/60' }} 
                style={styles.avatar} 
              />
              <View style={styles.userInfo}>
                <Text style={styles.greeting}>{getGreeting()}</Text>
                <Text style={styles.userName}>{user?.name || 'Loading...'}</Text>
              </View>
              <View style={styles.rightIconContainer}>
                <View style={styles.iconBackground}>
                  <Image 
                    source={require('../../assets/icons/notification.png')} 
                    style={styles.bellIcon} 
                  />
                </View>
              </View>
            </View>
            <Text style={styles.searchTitle}>Discover the latest News Updates</Text>
            <View style={styles.searchRow}>
              <View style={styles.searchContainer}>
                <Image 
                  source={require('../../assets/icons/search.png')} 
                  style={styles.micIcon} 
                />
                <TextInput 
                  placeholder="Search" 
                  placeholderTextColor="#888" 
                  style={styles.searchInput} 
                />
              </View>
              <View style={styles.voiceContainer}>
                <Image 
                  source={require('../../assets/icons/ai_audio.png')} 
                  style={styles.micIcon} 
                />
              </View>
            </View>
            <Text style={styles.sectionTitle}>Breaking News 🔥</Text>
            <FlatList
              horizontal
              data={loading ? Array.from({ length: 5 }) : newsData.slice(0, 5)}
              renderItem={loading ? renderBreakingNewsPlaceholder : renderBreakingNewsItem} // Render placeholders for breaking news
              keyExtractor={(item, index) => index.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.breakingNewsContainer}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
              {loading 
                ? categories.map((_, index) => renderCategoriesPlaceholder())
                : categories.map((category, index) => (
                    <TouchableOpacity 
                      key={category} 
                      onPress={() => setActiveCategoryIndex(index)} 
                      style={styles.categoryItem}
                    >
                      <Text style={[styles.categoryText, activeCategory === category && styles.activeCategory]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))
              }
            </ScrollView>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  breakingNewsCard: {
    width: normalizeWidth(230),
    height: normalizeHeight(350),
    marginRight: normalizeWidth(15),
    borderRadius: 20,
    overflow: 'hidden',
  },
  placeholderImage: {
    width: '100%',
    height: '70%',
    backgroundColor: '#444', // Placeholder background
  },
  placeholderText: {
    width: '80%',
    height: 20,
    backgroundColor: '#444', // Placeholder background
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
    backgroundColor: '#444', // Placeholder background
    borderRadius: 5,
  },
  categoryItem: {
    paddingVertical: normalizeHeight(10),
    paddingHorizontal: normalizeWidth(15),
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
  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: normalizeWidth(10),
    marginTop: normalizeHeight(10),
  },
  categoryText: {
    fontSize: normalizeWidth(14),
    color: '#aaa',
    fontWeight: 'bold',
  },
  activeCategory: {
    color: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
    paddingBottom: 5,
  },
  gridContainer: {
    paddingHorizontal: normalizeWidth(10),
    paddingTop: normalizeHeight(10),
    paddingBottom: normalizeHeight(20),
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
    paddingHorizontal: normalizeWidth(10),
    paddingVertical: normalizeHeight(10),
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
    flex: 1,
    margin: 5,
    backgroundColor: '#222',
    borderRadius: 10,
    overflow: 'hidden',
    maxWidth: '48%',
  },
  lastNewsCard: {
    alignSelf: 'flex-start',
  },
  newsImage: {
    width: '100%',
    height: normalizeHeight(250),
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
});

export default GlobalFeed;