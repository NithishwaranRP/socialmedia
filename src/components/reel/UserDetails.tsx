import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import CustomText from '../../components/global/CustomText';
import {FONTS} from '../../constants/Fonts';
import {useThemeColors} from '../../constants/Colors';
import {push} from '../../utils/NavigationUtil';
import {selectUser} from '../../redux/reducers/userSlice';
import {useAppSelector} from '../../redux/reduxHook';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {RFValue} from 'react-native-responsive-fontsize';

interface UserDetailsProps {
  user: any;
  hasUrl?: boolean;
  onWebPress?: () => void;
}

const UserDetails: React.FC<UserDetailsProps> = React.memo(({user, hasUrl = false, onWebPress}) => {
  const colors = useThemeColors();
  
  return (
    <View>
      <TouchableOpacity
        style={styles.flexRow}
        onPress={() => {
          push('UserProfileScreen', {
            username: user.username,
          });
        }}>
        <FastImage
          source={{
            uri: user?.userImage,
            priority: FastImage.priority.high,
          }}
          style={styles.img}
          resizeMode={FastImage.resizeMode.cover}
        />
        <CustomText fontFamily={FONTS.Medium} variant="h8">
          {user?.username}
        </CustomText>
        
        {/* Web link button */}
        {hasUrl && onWebPress && (
          <TouchableOpacity 
            style={styles.webButton}
            onPress={onWebPress}
          >
            <Icon name="public" size={RFValue(17)} color="#FFFFFF" />
            <CustomText 
              fontFamily={FONTS.Regular} 
              variant="h9" 
              style={styles.webButtonText}
            >
              Source
            </CustomText>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  img: {
    height: 35,
    width: 35,
    borderRadius: 100,
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  webButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  webButtonText: {
    color: '#FFFFFF',
    marginLeft: 5,
  },
});

export default UserDetails;