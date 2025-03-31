import {View, Text, StyleSheet, Platform} from 'react-native';
import React from 'react';
import CustomText from '../global/CustomText';
import UserDetails from './UserDetails';
import InteractionButtons from './InteractionButtons';

interface ReelItemProps {
  user: any;
  description: string;
  likes: number;
  react: string;
  comments: number;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onReact: () => void;
  onLongPressLike: () => void;
  isLiked: boolean;
}

const ReelItem: React.FC<ReelItemProps> = ({
  user,
  description,
  likes,
  comments,
  onLike,
  onComment,
  onShare,
  react,
  onReact,
  isLiked,
  onLongPressLike,
}) => {
  return (
    <View style={styles.interactionContainer}>
      <View style={styles.userContainer}>
        <UserDetails user={user} />
        <CustomText variant="h8" numberOfLines={2}>
          {description}
        </CustomText>
      </View>

      <InteractionButtons
        likes={likes}
        react={react}
        onLongPressLike={onLongPressLike}
        comments={comments}
        onLike={onLike}
        onComment={onComment}
        onShare={onShare}
        onReact={onReact}
        isLiked={isLiked}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  interactionContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 10,
    width: '100%',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userContainer: {
    width: '70%',
    justifyContent: 'flex-end',
  },
});

export default ReelItem;
