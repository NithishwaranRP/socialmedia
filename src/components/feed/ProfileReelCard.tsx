import React, {FC, memo, useState, useEffect} from 'react';
import {View, StyleSheet, ViewStyle, TouchableOpacity, ActivityIndicator, Alert} from 'react-native';
import {screenHeight, screenWidth} from '../../utils/Scaling';
import ReelCardLoader from '../loader/ReelCardLoader';
import FastImage from 'react-native-fast-image';
import CustomText from '../global/CustomText';
import {FONTS} from '../../constants/Fonts';
import Icon from 'react-native-vector-icons/Ionicons';
import {RFValue} from 'react-native-responsive-fontsize';
import {Colors} from '../../constants/Colors';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {useAppDispatch, useAppSelector} from '../../redux/reduxHook';
import {selectUser} from '../../redux/reducers/userSlice';
import {deleteReel} from '../../redux/actions/reelAction';
import {useAdminStatus} from '../../hooks/useAdminStatus';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface ProfileReelCardProps {
  style?: ViewStyle;
  loading: boolean;
  item: any;
  onPressReel: () => void;
  onDeleteSuccess?: () => void;
}

const ProfileReelCard: FC<ProfileReelCardProps> = memo(({
  style,
  onPressReel,
  item,
  loading,
  onDeleteSuccess,
}) => {
  const dispatch = useAppDispatch();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showDeleteOverlay, setShowDeleteOverlay] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Get current user
  const currentUser = useAppSelector(selectUser);
  
  // Get admin status
  const {isAdmin} = useAdminStatus();
  
  // Check if user is owner of this reel
  const isOwner = currentUser?.id === item?.user?._id;
  
  // Determine if user can delete this reel
  const canDelete = isAdmin || isOwner;

  const handleImageError = () => {
    console.error('Error loading thumbnail for item', item?._id);
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };
  
  // Handle delete action
  const handleDeleteReel = () => {
    if (isDeleting) return;
    
    Alert.alert(
      'Delete Reel',
      'Are you sure you want to delete this reel?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await dispatch(deleteReel(item._id));
              setIsDeleting(false);
              setShowDeleteOverlay(false);
              
              // Call callback if provided, but it's now optional
              // as the Redux store will handle UI updates
              if (onDeleteSuccess) {
                onDeleteSuccess();
              }
            } catch (error) {
              console.error('Error deleting reel:', error);
              setIsDeleting(false);
              Alert.alert('Error', 'Failed to delete reel. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  // Define long press gesture
  const longPress = Gesture.LongPress()
    .minDuration(2000) // 2 seconds
    .onStart(() => {
      if (canDelete) {
        setShowDeleteOverlay(true);
      }
    })
    .runOnJS(true);
  
  // Single tap gesture for normal reel press
  const tap = Gesture.Tap()
    .onStart(() => {
      onPressReel();
    })
    .runOnJS(true);
  
  // Combine gestures
  const gestures = Gesture.Exclusive(longPress, tap);

  if (loading) {
    return <ReelCardLoader style={styles.skeletonLoader} />;
  }

  // Check if item is valid
  if (!item || !item._id) {
    return <ReelCardLoader style={styles.skeletonLoader} />;
  }

  // Prepare thumbnail URI with a default if missing
  const thumbnailUri = item?.thumbUri || '';

  return (
    <View style={[styles.card, style]}>
      <GestureHandlerRootView style={{flex: 1, width: '100%', height: '100%'}}>
        <GestureDetector gesture={gestures}>
          <View style={styles.cardContent}>
            {/* Show loader until image is loaded */}
            {!imageLoaded && !imageError && (
              <View style={styles.imageLoader}>
                <ReelCardLoader style={styles.miniLoader} />
              </View>
            )}

            {/* Fast Image with caching */}
            <FastImage
              source={{
                uri: thumbnailUri,
                priority: FastImage.priority.normal,
                cache: FastImage.cacheControl.immutable,
              }}
              style={styles.img}
              resizeMode={FastImage.resizeMode.cover}
              onError={handleImageError}
              onLoad={handleImageLoad}
              defaultSource={require('../../assets/images/placeholder.png')}
            />

            {/* View count badge */}
            <View style={styles.views}>
              <Icon name="play" size={RFValue(10)} color={Colors.white} />
              <CustomText variant="h8" fontFamily={FONTS.SemiBold}>
                {item?.viewCount || 0}
              </CustomText>
            </View>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
      
      {/* Delete overlay */}
      {showDeleteOverlay && (
        <TouchableOpacity 
          style={styles.deleteOverlay}
          onPress={() => setShowDeleteOverlay(false)}
          activeOpacity={0.9}
        >
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteReel}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialIcon name="delete" size={RFValue(16)} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          <CustomText style={styles.deleteText} variant="h8" fontFamily={FONTS.SemiBold}>
            Delete
          </CustomText>
        </TouchableOpacity>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the item ID changes or loading state changes
  return (
    prevProps.item?._id === nextProps.item?._id &&
    prevProps.loading === nextProps.loading
  );
});

const styles = StyleSheet.create({
  img: {
    width: screenWidth * 0.28,
    height: screenHeight * 0.25,
    backgroundColor: 'rgba(0,0,0,0.2)', // Placeholder color before load
  },
  views: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.3)',
    bottom: 3,
    right: 3,
    padding: 2,
    borderRadius: 8,
    gap: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    width: screenWidth * 0.28,
    height: screenHeight * 0.25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardContent: {
    width: '100%',
    height: '100%',
  },
  skeletonLoader: {
    width: '100%',
    height: '100%',
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  miniLoader: {
    width: '50%',
    height: '50%',
  },
  deleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    borderRadius: 20,
    width: RFValue(36),
    height: RFValue(36),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteText: {
    color: Colors.white,
    textAlign: 'center',
  },
});

export default ProfileReelCard;