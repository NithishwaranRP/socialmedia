import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useThemeColors } from '../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../redux/reduxHook';
import { selectIsAdmin } from '../../redux/reducers/userSlice';
import { deleteReel } from '../../redux/actions/reelAction';
import { navigate } from '../../utils/NavigationUtil';

interface ReelCardProps {
  item: any;
  onPressReel: () => void;
  isOwner: boolean;
}

const ReelCard: React.FC<ReelCardProps> = ({ item, onPressReel, isOwner }) => {
  const colors = useThemeColors();
  const dispatch = useAppDispatch();
  const isAdmin = useAppSelector(selectIsAdmin);
  const [isDeleting, setIsDeleting] = useState(false);

  // Show delete button if user is admin or the owner of the post
  const showDeleteButton = isAdmin || isOwner;

  const handleDelete = () => {
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

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onPressReel}>
        <FastImage
          source={{
            uri: item?.thumbUri,
            priority: FastImage.priority.high,
          }}
          style={styles.image}
          resizeMode={FastImage.resizeMode.cover}
        />
      </TouchableOpacity>
      
      {showDeleteButton && (
        <TouchableOpacity 
          style={[styles.deleteButton, { backgroundColor: colors.error }]} 
          onPress={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Icon name="delete" size={RFValue(16)} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    overflow: 'hidden',
    margin: 5,
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 9/16,
    borderRadius: 10,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 20,
    width: RFValue(32),
    height: RFValue(32),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  }
});

export default ReelCard; 