import {View, Text, StyleSheet, Platform, Share, TouchableOpacity, Alert, ActivityIndicator, Image, Dimensions} from 'react-native';
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
import {useIsFocused, useNavigation} from '@react-navigation/native';
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
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import LottieView from 'lottie-react-native';
import DoubleTapAnim from '../../assets/animations/heart.json';
import ReelItem from './ReelItem';
import {toggleLikeReel} from '../../redux/actions/likeAction';
import {selectLikedReel} from '../../redux/reducers/likeSlice';
import {SheetManager} from 'react-native-actions-sheet';
import {selectComments} from '../../redux/reducers/commentSlice';
import Slider from '@react-native-community/slider';
import { navigate, openWebView } from '../../utils/NavigationUtil';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { markReelAsWatched } from '../../redux/actions/reelAction';
import { useAvatarPopup } from '../../context/AvatarPopupContext';
import { selectIsAdmin } from '../../redux/reducers/userSlice';
import { deleteReel } from '../../redux/actions/reelAction';
import CustomText from '../global/CustomText';
import { useAdminStatus } from '../../hooks/useAdminStatus';
import {RFValue} from 'react-native-responsive-fontsize';
import {Colors} from '../../constants/Colors';
import {FONTS} from '../../constants/Fonts';
import { useThemeColors } from '../../constants/Colors';

interface VideoItemProps {
  item: any;
  isVisible: boolean;
  preload: boolean;
  index: number;
  currentIndex: number;
  onVideoEnd?: () => void;
  forceStop?: boolean;
}

const VideoItem: FC<VideoItemProps> = ({
  item,
  isVisible,
  preload,
  index,
  currentIndex,
  onVideoEnd,
  forceStop = false,
}) => {
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
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  // Add a retry mechanism for video loading
  const [loadRetries, setLoadRetries] = useState(0);
  // Track if video has initialized for better preloading
  const [videoInitialized, setVideoInitialized] = useState(false);
  // Add state to track if thumbnail is loaded
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  
  // Get Avatar popup context
  const { setShowAIAvatar, setIsLoading, setDirectInitSession, showAIAvatar } = useAvatarPopup();

  // Get admin status from Redux
  const reduxIsAdmin = useAppSelector(selectIsAdmin);
  
  // Get enhanced admin status from our custom hook
  const { isAdmin } = useAdminStatus();
  
  // Check if the current user is the owner of this reel
  const currentUser = useAppSelector((state) => state.user?.user);
  const isOwner = currentUser?.id === item?.user?._id;
  
  // Force admin status for specific user IDs
  const forceAdminIds = ['67f8cff4e06283e516e56b12']; // Add your ID here
  const isForceAdmin = forceAdminIds.includes(currentUser?.id);
  
  // Determine if user can delete (admin or owner or forced admin)
  const canDelete = isAdmin || isOwner || isForceAdmin;
  
  // Handle delete
  const [isDeleting, setIsDeleting] = useState(false);
  
  const navigation = useNavigation();
  
  // Add a flag to track if we've manually requested a video to restart
  const [isRestarting, setIsRestarting] = useState(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add a state to track when AI Avatar is open
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  
  // Early return for invalid item
  if (!item || !item._id || !item.videoUri) {
    console.error('Invalid video item received:', item);
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
      try {
        console.log(`Proxying video URI for ${item._id}`);
        // Start loading the thumbnail right away
        if (item.thumbUri) {
          Image.prefetch(item.thumbUri).catch(() => {});
        }
        
        const proxiedUri = convertToProxyURL(item.videoUri);
        setCachedVideoUri(proxiedUri);
        
        // Prefetch video data to warm up the cache
        fetch(proxiedUri, { method: 'HEAD', headers: { 'Priority': 'high' } })
          .then(() => {
            console.log(`Prefetch for ${item._id} completed`);
          })
          .catch(err => {
            console.warn(`Prefetch for ${item._id} failed:`, err);
          });
          
        console.log(`Video proxied successfully for ${item._id}`);
      } catch (error) {
        console.error('Error proxying video URI:', error);
        // Fallback to original URI if proxying fails
        setCachedVideoUri(item.videoUri);
      }
    }
    
    // Reset states when item changes
    setVideoLoaded(false);
    setVideoInitialized(false);
    setThumbnailLoaded(false);
    setLoadRetries(0);
  }, [item]);

  // Add a separate useEffect for preloading when preload prop changes
  useEffect(() => {
    // If this is a preload item and not visible yet, start warming up the cache
    if (preload && !isVisible && item && item.videoUri && !videoInitialized) {
      console.log(`Starting early preload for video ${item._id}`);
      try {
        const videoUri = cachedVideoUri || convertToProxyURL(item.videoUri);
        
        // Use a HEAD request to prime the cache
        fetch(videoUri, { 
          method: 'HEAD',
          headers: { 'Cache-Control': 'max-age=3600' }
        }).catch(() => {});
        
        // Mark as initialized so we don't repeat unnecessarily
        setVideoInitialized(true);
      } catch (err) {
        console.warn(`Error in preload for ${item._id}:`, err);
      }
    }
  }, [preload, isVisible, item, cachedVideoUri, videoInitialized]);

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
      Platform.OS == 'android' ? 'https://recaps-backend-277610981315.asia-south1.run.app' : 'reelzzz:/'
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
   navigate('RemixScreen', { reelUri: item});
  };

  // Add WebView handler for URL links
  const handleOpenWebView = () => {
    if (item && item.url) {
      navigate('WebViewScreen', { 
        url: item.url,
        title: item.caption || 'Reel Content'
      });
    }
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
      
      // Add intelligent buffer monitoring to prevent stalling
      if (currentTime > 0 && videoDuration > 0) {
        // If we're 80% through the video, make sure the next video is ready
        if (currentTime >= videoDuration * 0.8) {
          // This would be a good time to ensure next video is preloading
          console.log(`Video ${item._id} at 80% - next video should be preloading`);
        }
        
        // Handle end of video approach
        if (currentTime >= videoDuration - 0.5) {
          // Video is about to end
          console.log(`Video ${item._id} reaching end`);
        }
      }
    },
    [isVisible, item, dispatch, userId, watchTimeout, videoDuration]
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
    console.log(`VideoItem visibility changed: ${item._id}, visible: ${isVisible}`);
    
    // If becoming visible, ensure video is ready to play
    if (isVisible && !videoLoaded && cachedVideoUri) {
      // Warm up the video when becoming visible
      console.log(`Video ${item._id} becoming visible - ensuring it's ready`);
    }
    
    // Cleanup function to release resources when component unmounts or visibility changes
    return () => {
      if (watchTimeout) {
        clearTimeout(watchTimeout);
      }
    };
  }, [watchTimeout, isVisible, item._id, videoLoaded, cachedVideoUri]);

  // Update the video end handler to avoid excessive restarting
  const handleVideoEnd = useCallback(() => {
    // Reset video state
    setVideoLoaded(false);
    setVideoInitialized(false);
    
    // Call the parent's onVideoEnd handler if provided
    if (onVideoEnd) {
      onVideoEnd();
    }
    
    // If video should loop, seek to beginning
    if (videoRef.current) {
      videoRef.current.seek(0);
    }
  }, [onVideoEnd]);

  // Cleanup timeouts on unmount or visibility change
  useEffect(() => {
    return () => {
      if (watchTimeout) {
        clearTimeout(watchTimeout);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [watchTimeout]);

  useEffect(() => {
    // Only adjust pause state when visibility changes
    if (isVisible) {
      setIsPaused(false);
      console.log(`Playing video: ${item._id}`);
    } else {
      setIsPaused(true);
      setPaused(null);
      
      // Clear timeouts
      if (watchTimeout) {
        clearTimeout(watchTimeout);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    }
    
    // Reset restarting flag when visibility changes
    setIsRestarting(false);
  }, [isVisible, watchTimeout, item._id]);

  useEffect(() => {
    if (!isFocused) {
      setIsPaused(true);
    }
    if (isFocused && isVisible) {
      setIsPaused(false);
    }
  }, [isFocused, isVisible]);

  const handleVideoLoad = ({ duration }: { duration: number }) => {
    try {
      setVideoLoaded(true);
      setVideoDuration(duration);
      // Don't reset slider value on load - this prevents restarting
      console.log(`Video loaded successfully, ID: ${item._id}, duration: ${duration}`);
      
      // Reset retry count once loaded successfully
      setLoadRetries(0);
    } catch (error) {
      console.error('Error in handleVideoLoad:', error);
    }
  };

  // Add error handler for videos
  const handleVideoError = useCallback((error: any) => {
    console.error(`Video error for ${item._id}:`, error);
    
    // Implement retry mechanism
    if (loadRetries < 3 && cachedVideoUri) {
      console.log(`Attempting to recover video ${item._id}, retry ${loadRetries + 1}/3`);
      setLoadRetries(prev => prev + 1);
      
      // Try to reload the video
      setTimeout(() => {
        if (videoRef.current) {
          // Force reload by seeking to 0
          videoRef.current.seek(0);
        }
      }, 1000 * loadRetries); // Exponential backoff
    }
  }, [item._id, cachedVideoUri, loadRetries]);

  const handleSliderValueChange = (value: number) => {
    setSliderValue(value);
    // seeking the video to slider position
    if (videoLoaded && videoRef.current) {
      videoRef.current.seek(value);
    }
  };

  // Handle thumbnail load
  const handleThumbnailLoad = useCallback(() => {
    setThumbnailLoaded(true);
  }, []);

  // Handle AI Avatar button press
  const handleAIAvatar = () => {
    console.log("Opening AI Avatar for reel:", item._id);
    // Pause the video
    setIsPaused(true);
    // Set avatar open state to true
    setIsAvatarOpen(true);
    // Open the AI Avatar popup and initialize session
    setIsLoading(true);
    setDirectInitSession(true);
    setShowAIAvatar(true);
  };

  // Add effect to listen for avatar popup closing
  useEffect(() => {
    const checkAvatarStatus = () => {
      try {
        // If avatar state changed, update our local state
        if (isAvatarOpen !== showAIAvatar) {
          setIsAvatarOpen(showAIAvatar);
          
          // If avatar closed, resume video playback if visible
          if (!showAIAvatar && isVisible) {
            setIsPaused(false);
          }
        }
      } catch (error) {
        console.error('Error checking avatar status:', error);
      }
    };

    // Run check on every render to detect changes
    checkAvatarStatus();
  }, [isAvatarOpen, isVisible, showAIAvatar]);

  // Handle delete
  const handleDeleteReel = () => {
    if (isDeleting) return;
    
    // Pause the video
    setIsPaused(true);
    
    Alert.alert(
      'Delete Reel',
      'Are you sure you want to delete this reel?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setIsPaused(false) },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await dispatch(deleteReel(item._id));
              setIsDeleting(false);
              
              // Go back to previous screen
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting reel:', error);
              setIsDeleting(false);
              setIsPaused(false);
              Alert.alert('Error', 'Failed to delete reel. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Add long press gesture for delete button
  const longPress = Gesture.LongPress()
    .minDuration(2000) // 2 seconds
    .onStart(() => {
      // Only show delete button if user has permission to delete
      if (canDelete) {
        setShowDeleteButton(true);
      }
    })
    .runOnJS(true);

  // Combine all gestures
  const gestures = Gesture.Exclusive(
    longPress,
    Gesture.Exclusive(doubleTap, singleTap)
  );

  // Handle video playback based on visibility
  useEffect(() => {
    if (isVisible && !forceStop) {
      // Video is visible and not forced to stop
      setPaused(null);
      setIsPaused(false);
    } else {
      // Video is not visible or forced to stop
      setPaused('paused');
      setIsPaused(true);
    }
  }, [isVisible, forceStop]);
  
  // Effect to force stop videos
  useEffect(() => {
    if (forceStop) {
      // If force stop is activated, use 'paused' string
      setPaused('paused');
      setIsPaused(true);
      
      // Additional cleanup when force stopping
      if (videoRef.current) {
        try {
          // Try to seek to beginning to fully reset video state
          videoRef.current.seek(0);
          
          // Some players support additional methods
          if (typeof videoRef.current.stop === 'function') {
            videoRef.current.stop();
          }
        } catch (error) {
          console.log('Error resetting video:', error);
        }
      }
      
      // Reset all timers
      if (watchTimeout) {
        clearTimeout(watchTimeout);
        setWatchTimeout(null);
      }
      
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      
      // Reset playback state
      setCurrentTime(0);
      setSliderValue(0);
      console.log(`Force stopped video ${item._id}`);
    }
  }, [forceStop, item._id, watchTimeout]);

  // Add effect to completely reset video when visibility changes
  useEffect(() => {
    if (!isVisible) {
      // When video becomes invisible, do a complete reset
      // Use 'paused' string instead of true boolean
      setPaused('paused');
      setIsPaused(true);
      
      // Reset video player
      if (videoRef.current) {
        try {
          videoRef.current.seek(0);
        } catch (error) {
          console.log('Error resetting invisible video:', error);
        }
      }
      
      // Reset timers
      if (watchTimeout) {
        clearTimeout(watchTimeout);
        setWatchTimeout(null);
      }
      
      // Reset state for when video becomes visible again
      setCurrentTime(0);
      setSliderValue(0);
      console.log(`Reset invisible video ${item._id}`);
    } else if (isVisible && videoRef.current) {
      // When video becomes visible again
      console.log(`Video ${item._id} now visible`);
      setIsPaused(false);
      // Use null for paused state instead of false
      setPaused(null);
      
      // Make sure we're at the beginning of the video
      try {
        videoRef.current.seek(0);
      } catch (error) {
        console.log('Error seeking to beginning of video:', error);
      }
    }
  }, [isVisible, item._id, watchTimeout]);

  return (
    <View style={styles.container}>
      <GestureHandlerRootView style={{flex: 1}}>
        <GestureDetector gesture={gestures}>
          <View style={styles.videoContainer}>
            {(!videoLoaded || !isVisible) && (
              <FastImage
                source={{
                  uri: item.thumbUri || '', 
                  priority: FastImage.priority.high
                }}
                style={styles.videoContainer}
                defaultSource={Loader}
                resizeMode="cover"
                onLoad={handleThumbnailLoad}
                onError={() => console.error(`Failed to load thumbnail for ${item._id}`)}
              />
            )}

            {(isVisible || preload) && cachedVideoUri ? (
              <Video
                ref={videoRef}
                poster={item.thumbUri || ''}
                posterResizeMode="cover"
                source={{ uri: cachedVideoUri }}
                bufferConfig={{
                  minBufferMs: 15000,
                  maxBufferMs: 50000,
                  bufferForPlaybackMs: 2500,
                  bufferForPlaybackAfterRebufferMs: 5000
                }}
                ignoreSilentSwitch={"ignore"}
                playWhenInactive={true}
                playInBackground={false}
                useTextureView={Platform.OS === 'android'}
                controls={false}
                disableFocus={true}
                style={styles.videoContainer}
                paused={!isVisible || isPaused || isRestarting}
                repeat={false}
                onProgress={handleVideoProgress}
                onLoad={handleVideoLoad}
                onEnd={handleVideoEnd}
                onError={handleVideoError}
                hideShutterView
                minLoadRetryCount={5}
                resizeMode="cover"
                onReadyForDisplay={() => {
                  setVideoLoaded(true);
                  setVideoInitialized(true);
                }}
                maxBitRate={2000000}
                progressUpdateInterval={250}
                shutterColor="transparent"
                muted={isAvatarOpen}
                volume={isAvatarOpen ? 0 : 1.0}
                rate={1.0}
                pictureInPicture={false}
                preventsDisplaySleepDuringVideoPlayback
                allowsExternalPlayback={false}
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
        }}
        onComment={() => {
          SheetManager.show('comment-sheet', {
            payload: {
              id: item?._id,
              user: item?.user,
              commentsCount: item.commentsCount,
            },
          });
        }}
        onLongPressLike={() => {
          SheetManager.show('like-sheet', {
            payload: {
              entityId: item?._id,
              type: 'reel',
            },
          });
        }}
        onReact={handleReactReel}
        onShare={handleShareReel}
        onAIAvatar={handleAIAvatar}
        onDelete={handleDeleteReel}
        canDelete={canDelete}
        isLiked={reelMeta?.isLiked} 
        react={''}
        hasUrl={!!item?.url}
        onWebPress={handleOpenWebView}
      />

      {/* Delete button overlay only shows after long press - keep for profile thumbnails */}
      {showDeleteButton && canDelete && (
        <TouchableOpacity
          style={styles.deleteOverlay}
          onPress={() => setShowDeleteButton(false)}
        >
          <View style={styles.deleteButtonContainer}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteReel}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon name="delete" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
            <CustomText style={styles.deleteText}>Delete Reel</CustomText>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const areEqual = (prevProps: VideoItemProps, nextProps: VideoItemProps) => {
  return (
    prevProps?.item?._id === nextProps?.item?._id &&
    prevProps?.isVisible === nextProps?.isVisible &&
    prevProps?.preload === nextProps?.preload &&
    prevProps?.forceStop === nextProps?.forceStop
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
  deleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  deleteButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    // backgroundColor: 'rgba(255, 0, 0, 0.7)',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  pausedContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

