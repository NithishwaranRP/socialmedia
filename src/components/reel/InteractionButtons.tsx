import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import React, {useRef, useEffect} from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {RFValue} from 'react-native-responsive-fontsize';
import {Colors} from '../../constants/Colors';
import CustomText from '../global/CustomText';
import {FONTS} from '../../constants/Fonts';
import LinearGradient from 'react-native-linear-gradient';

interface InteractionButtonProps {
  likes: number;
  comments: number;
  react: string;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onReact: () => void;
  onLongPressLike: () => void;
  isLiked: boolean;
}

const GamingButton = ({
  icon,
  isCustomIcon = false,
  label,
  count,
  onPress,
  onLongPress,
  isActive = false,
  iconColor,
}) => {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  // Pulsing animation for active state
  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, glowAnim]);

  // Handle press animations
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      style={styles.buttonContainer}
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}>
      {/* Button with animation */}
      <Animated.View
        style={[
          styles.buttonWrapper,
          {
            transform: [{scale: scaleAnim}],
          },
        ]}>
        {/* Glow effect */}
        <Animated.View
          style={[
            styles.glowEffect,
            {
              opacity: glowAnim,
              backgroundColor: iconColor,
            },
          ]}>
          {/* Inner content */}
          <View style={styles.iconContainer}>
            {isCustomIcon ? (
              <Image source={icon} style={[styles.iconImage, {tintColor: iconColor}]} />
            ) : (
              <Icon name={icon} size={RFValue(24)} color={iconColor} />
            )}
          </View>
        </Animated.View>
      </Animated.View>
      
      {/* Label and count */}
      <View style={styles.labelContainer}>
        {count !== undefined && (
          <CustomText variant="h9" fontFamily={FONTS.SemiBold} style={styles.countText}>
            {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
          </CustomText>
        )}
        <CustomText variant="h9" fontFamily={FONTS.Medium} style={styles.labelText}>
          {label}
        </CustomText>
      </View>
    </TouchableOpacity>
  );
};

const InteractionButtons: React.FC<InteractionButtonProps> = ({
  isLiked,
  onComment,
  onLike,
  onLongPressLike,
  onShare,
  comments,
  likes,
  react,
  onReact,
}) => {
  return (
    <View style={styles.container}>
      <GamingButton
        icon={isLiked ? 'heart' : 'heart-outline'}
        label="Like"
        count={likes}
        onPress={onLike}
        onLongPress={onLongPressLike}
        isActive={isLiked}
        iconColor={isLiked ? Colors.like : Colors.white}
      />

      <GamingButton
        icon="comment-text"
        label="Comment"
        count={comments}
        onPress={onComment}
        iconColor={Colors.white}
      />

      <GamingButton
        icon={require('../../assets/icons/react.png')}
        isCustomIcon={true}
        label="React"
        onPress={onReact}
        iconColor={Colors.white}
      />

      <GamingButton
        icon="share"
        label="Share"
        onPress={onShare}
        iconColor={Colors.white}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  buttonContainer: {
    marginVertical: 12,
    alignItems: 'center',
  },
  buttonWrapper: {
    width: RFValue(40),
    height: RFValue(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  glowEffect: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  iconImage: {
    width: RFValue(22),
    height: RFValue(22),
    resizeMode: 'contain',
  },
  labelContainer: {
    alignItems: 'center',
  },
  countText: {
    color: Colors.white,
    marginBottom: 2,
  },
  labelText: {
    color: Colors.lightText,
    fontSize: RFValue(10),
  },
});

export default InteractionButtons;
