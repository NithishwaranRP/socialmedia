import {View, Text, StyleSheet, Platform, Share} from 'react-native';
import React, {useRef,
  FC,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {screenHeight, screenWidth} from '../../utils/Scaling';
import {useAppDispatch, useAppSelector} from '../../redux/reduxHook';
import {useIsFocused} from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
const Loader = require('../../assets/images/loader.jpg');
import Video from 'react-native-video';
import convertToProxyURL from 'react-native-video-cache';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LottieView from 'lottie-react-native';
import DoubleTapAnim from '../../assets/animations/heart.json';
import ReelItem from './ReelItem';
import {toggleLikeReel} from '../../redux/actions/likeAction';
import {selectLikedReel} from '../../redux/reducers/likeSlice';
import {SheetManager} from 'react-native-actions-sheet';
import {selectComments} from '../../redux/reducers/commentSlice';
import Slider from '@react-native-community/slider';
import { navigate } from '../../utils/NavigationUtil';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { markReelAsWatched } from '../../redux/actions/reelAction';

interface VideoItemProps {
  item: any;
  isVisible: boolean;
  preload: boolean;
}

const VideoItem: FC<VideoItemProps> = ({item, isVisible, preload}) => {
  const dispatch = useAppDispatch();
  const likedReels = useAppSelector(selectLikedReel);
  const commentsCounts = useAppSelector(selectComments);
  const [paused, setPaused] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [videoLoaded, setVideoLoaded] = useState<boolean>(false);
  const [showLikeAnim, setShowLikeAnim] = useState<boolean>(false);
  const isFocused = useIsFocused();
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const [watchTimeout, setWatchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [cachedVideoUri, setCachedVideoUri] = useState('');
  const userId = useAppSelector((state) => state.user?.user?.id);
  const videoRef = useRef<any>(null);
  
  // Early return for invalid item
  if (!item || !item._id || !item.videoUri) {
    return (
      <View style={styles.container}>
        <View style={styles.videoContainer}>
          <FastImage
            source={Loader}
            style={styles.videoContainer}
            resizeMode="cover"
          />
        </View>
      </View>
    );
  }

  // Cache the video URI using convertToProxyURL when component mounts or item changes
  useEffect(() => {
    if (item && item.videoUri) {
      const proxiedUri = convertToProxyURL(item.videoUri);
      setCachedVideoUri(proxiedUri);
    }
  }, [item]);

  const reelMeta = useMemo(() => {
    return {
      isLiked:
        likedReels?.find((ritem: any) => ritem.id === item._id)?.isLiked ??
        item?.isLiked,
      likesCount:
        likedReels?.find((ritem: any) => ritem.id === item._id)?.likesCount ??
        item?.likesCount,
    };
  }, [likedReels, item?._id]);

  const commentMeta = useMemo(() => {
    return (
      commentsCounts?.find((ritem: any) => ritem.reelId === item._id)
        ?.commentsCount ?? item?.commentsCount
    );
  }, [commentsCounts, item?._id]);

  const handleLikeReel = async () => {
    await dispatch(
      toggleLikeReel(item._id, reelMeta?.likesCount, reelMeta?.isLiked),
    );
  };

  const handleShareReel = () => {
    const reelUrl = `${
      // Platform.OS == 'android' ? 'https://reelzzzserverworking.vercel.app' : 'reelzzz:/'
      Platform.OS == 'android' ? 'https://recaps-backend-277610981315.asia-south1.run.app' : 'reelzzz:/'
      // Platform.OS == 'android' ? 'https://192.168.170.133:8080' : 'reelzzz:/'
      // Platform.OS == 'android' ? 'https://192.168.108.133:8080' : 'reelzzz:/'
    }/share/reel/${item._id}`;
    const message = `Hey, Checkout this reel: ${reelUrl}`;
    Share.share({
      message: message,
    })
      .then(res => {
        console.log('Share Result', res);
      })
      .catch(error => {
        console.log('Share Error', error);
      });
  };
  const handleReactReel = async () => {
     // Clear existing reel URI from AsyncStorage
    //  await AsyncStorage.removeItem('currentReelUri'); 
    
    //  // Store the new reel URI
    //  await AsyncStorage.setItem('currentReelUri', JSON.stringify(item));
   navigate('RemixScreen', { reelUri: item});
  };

  const handleVideoProgress = useCallback(
    ({ currentTime }: { currentTime: number }) => {
      setCurrentTime(currentTime); // Update the current time
      setSliderValue(currentTime); // Update the slider value
  
      // If the video is visible and has been played for 3 seconds, mark it as watched
      if (isVisible && currentTime >= 3 && item && item._id && !item.isRead && userId) {
        if (watchTimeout) {
          clearTimeout(watchTimeout); // Clear any existing timeout
        }
  
        const timeout = setTimeout(() => {
          console.log("Marking reel as watched:", item._id); // Debug log
          dispatch(markReelAsWatched(item._id, userId)); // Dispatch the action to mark as watched
          item.isRead = true; // Update the local item state
        }, 0); // Trigger immediately after 3 seconds
  
        setWatchTimeout(timeout);
      }
    },
    [isVisible, item, dispatch, userId, watchTimeout]
  );
  
  const handleTogglePlay = useCallback(() => {
    let currentState = !paused ? 'paused' : 'play';
    setIsPaused(!isPaused);
    setPaused(currentState);
    setTimeout(() => {
      if (currentState === 'play') setPaused(null);
    }, 700);
  }, [paused, isPaused]);

  const handleDoubleTapLike = useCallback(() => {
    setShowLikeAnim(true);
    if (!reelMeta?.isLiked) {
      handleLikeReel();
    }
    setTimeout(() => {
      setShowLikeAnim(false);
    }, 1200);
  }, [reelMeta]);

  const singleTap = Gesture.Tap()
    .maxDuration(250)
    .onStart(() => {
      handleTogglePlay();
    })
    .runOnJS(true);

  const doubleTap = Gesture.Tap()
    .maxDuration(250)
    .numberOfTaps(2)
    .onStart(() => {
      handleDoubleTapLike();
    })
    .runOnJS(true);

  // Add this to optimize resource usage
  useEffect(() => {
    // Cleanup function to release resources when component unmounts or visibility changes
    return () => {
      if (watchTimeout) {
        clearTimeout(watchTimeout);
      }
      if (videoRef.current) {
        videoRef.current.seek(0);
      }
    };
  }, [watchTimeout]);

  useEffect(() => {
    setIsPaused(!isVisible);
    if (!isVisible) {
      setPaused(null);
      setVideoLoaded(false);
      if (watchTimeout) {
        clearTimeout(watchTimeout);
      }
    }
  }, [isVisible, watchTimeout]);

  useEffect(() => {
    if (!isFocused) {
      setIsPaused(true);
    }
    if (isFocused && isVisible) {
      setIsPaused(false);
    }
  }, [isFocused]);

  const handleVideoLoad = ({ duration }: { duration: number }) => {
    try {
      setVideoLoaded(true);
      setVideoDuration(duration);
      setSliderValue(0);
      console.log(`Video loaded successfully, duration: ${duration}`);
    } catch (error) {
      console.error('Error in handleVideoLoad:', error);
    }
  };

  const handleSliderValueChange = (value: number) => {
    setSliderValue(value);
    // seeking the video to slider position
    if (videoLoaded) {
      videoRef.current?.seek(value);
    }
  };

  useEffect(() => {
    console.log("Video Duration:", videoDuration);
  }, [videoDuration]);

  
  return (
    <View style={styles.container}>
      <GestureHandlerRootView style={{flex: 1}}>
        <GestureDetector gesture={Gesture.Exclusive(doubleTap, singleTap)}>
          <View style={styles.videoContainer}>
            {!videoLoaded && (
              <FastImage
                source={{
                  uri: item.thumbUri || '', 
                  priority: FastImage.priority.high
                }}
                style={styles.videoContainer}
                defaultSource={Loader}
                resizeMode="cover"
              />
            )}

            {(isVisible || preload) && cachedVideoUri ? (
              <Video
                ref={videoRef}
                poster={item.thumbUri || ''}
                posterResizeMode="cover"
                source={{ uri: cachedVideoUri }}
                bufferConfig={{
                  minBufferMs: 1500,
                  maxBufferMs: 15000,
                  bufferForPlaybackMs: 1000,
                  bufferForPlaybackAfterRebufferMs: 1500,
                }}
                ignoreSilentSwitch={"ignore"}
                playWhenInactive={false}
                playInBackground={false}
                useTextureView={true}
                controls={false}
                disableFocus={true}
                style={styles.videoContainer}
                paused={isPaused}
                repeat={true}
                onProgress={handleVideoProgress}
                onLoad={handleVideoLoad}
                onError={(error) => console.error('Video error:', error)}
                hideShutterView
                minLoadRetryCount={5}
                resizeMode="cover"
                onReadyForDisplay={() => setVideoLoaded(true)}
                priorityHint="high"
                maxBitRate={1500000}
                shouldPlay={isVisible}
                progressUpdateInterval={250}
                shutterColor="transparent"
              />
            ) : null}
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
      <Slider
        style={styles.progressBar}
        minimumValue={0}
        maximumValue={videoDuration}
        value={sliderValue}
        onValueChange={handleSliderValueChange}
        onSlidingComplete={(value) => {
          // Seek video when sliding completed
          if (videoRef.current) {
            videoRef.current.seek(value);
          }
        }}
        minimumTrackTintColor="#FFFFFF"
        maximumTrackTintColor="#000000"
  // thumbStyle={{ height: 20, width: 20, borderRadius: 10, backgroundColor: '#FFFFFF' }}
  />
  {showLikeAnim && (
        <View style={styles.lottieContainer}>
          <LottieView
            style={styles.lottie}
            source={DoubleTapAnim}
            autoPlay
            loop={false}
          />
        </View>
      )}

      {paused !== null && (
        <View style={styles.playPauseButton}>
          <View style={styles.shadow} pointerEvents="none">
            <Icon
              name={paused === 'paused' ? 'pause' : 'play-arrow'}
              size={50}
              color="white"
            />
          </View>
        </View>
      )}

      <ReelItem
        user={item?.user}
        description={item.caption}
        likes={reelMeta?.likesCount || 0}
        comments={commentMeta}
        onLike={() => {
          handleLikeReel();
        } }
        onComment={() => {
          SheetManager.show('comment-sheet', {
            payload: {
              id: item?._id,
              user: item?.user,
              commentsCount: item.commentsCount,
            },
          });
        } }
        onLongPressLike={() => {
          SheetManager.show('like-sheet', {
            payload: {
              entityId: item?._id,
              type: 'reel',
            },
          });
        } }
        onReact={handleReactReel}
        onShare={handleShareReel}
        isLiked={reelMeta?.isLiked} react={''}      />
    </View>
  );
};

const areEqual = (prevProps: VideoItemProps, nextProps: VideoItemProps) => {
  return (
    prevProps?.item?._id === nextProps?.item?._id &&
    prevProps?.isVisible === nextProps?.isVisible
  );
};

export default memo(VideoItem, areEqual);

const styles = StyleSheet.create({
  container: {
    height: screenHeight,
    width: screenWidth,
    flexGrow: 1,
    flex: 1,
  },
  playPauseButton: {
    position: 'absolute',
    top: '47%',
    bottom: 0,
    left: '44%',
    opacity: 0.7,
  },
  shadow: {
    zIndex: -1,
  },
  progressBar: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  lottieContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    height: screenHeight,
    aspectRatio: 9 / 16,
    flex: 1,
    zIndex: -1,
  },
});
