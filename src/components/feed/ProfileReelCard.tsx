import React, {FC, memo, useState} from 'react';
import {View, StyleSheet, ViewStyle, TouchableOpacity} from 'react-native';
import {screenHeight, screenWidth} from '../../utils/Scaling';
import ReelCardLoader from '../loader/ReelCardLoader';
import FastImage from 'react-native-fast-image';
import CustomText from '../global/CustomText';
import {FONTS} from '../../constants/Fonts';
import Icon from 'react-native-vector-icons/Ionicons';
import {RFValue} from 'react-native-responsive-fontsize';
import {Colors} from '../../constants/Colors';

interface ProfileReelCardProps {
  style?: ViewStyle;
  loading: boolean;
  item: any;
  onPressReel: () => void;
}

const ProfileReelCard: FC<ProfileReelCardProps> = memo(({
  style,
  onPressReel,
  item,
  loading,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = () => {
    console.error('Error loading thumbnail for item', item?._id);
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

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
      <TouchableOpacity 
        style={styles.cardContent} 
        onPress={onPressReel}
        activeOpacity={0.8} // Less aggressive highlight on press
      >
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
            priority: FastImage.priority.normal, // Use normal priority to avoid overloading
            cache: FastImage.cacheControl.immutable, // Cache aggressively
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
      </TouchableOpacity>
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
});

export default ProfileReelCard;