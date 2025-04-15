import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {RFValue} from 'react-native-responsive-fontsize';
import {Colors} from '../../constants/Colors';
import CustomText from '../global/CustomText';
import {FONTS} from '../../constants/Fonts';

interface InteractionButtonProps {
  likes: number;
  comments: number;
  react: string;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onReact: () => void;
  onAIAvatar?: () => void;
  onLongPressLike: () => void;
  isLiked: boolean;
}

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
  onAIAvatar,
}) => {
  // const colors = useThemeColors();
  
  return (
    <View>
      <TouchableOpacity
        style={styles.button}
        onPress={onLike}
        onLongPress={onLongPressLike}>
        <Icon
          name={isLiked ? 'heart' : 'heart-outline'}
          size={RFValue(22)}
          color={isLiked ? Colors.like : Colors.text}
        />
        <CustomText variant="h9" fontFamily={FONTS.Medium}>
          {likes}
        </CustomText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onComment}>
        <Icon name={'comment-text'} size={RFValue(22)} color={Colors.text} />
        <CustomText variant="h9" fontFamily={FONTS.Medium}>
          {comments}
        </CustomText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onReact}>
        <Image 
          source={require('../../assets/icons/react.png')} 
          style={[styles.iconImage, {tintColor: Colors.text}]} 
        />
        <CustomText variant="h9" fontFamily={FONTS.Medium}>
          React
        </CustomText>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={onShare}>
        <Icon name={'share'} size={RFValue(22)} color={Colors.text} />
        <CustomText variant="h9" fontFamily={FONTS.Medium}>
          Share
        </CustomText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onAIAvatar}>
        <MaterialIcon name={'smart-toy'} size={RFValue(22)} color={Colors.text} />
        <CustomText variant="h9" fontFamily={FONTS.Medium}>
          AI Chat
        </CustomText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    marginVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconImage: {
    width: RFValue(22),
    height: RFValue(22),
    resizeMode: 'contain',
  },
});

export default InteractionButtons;
