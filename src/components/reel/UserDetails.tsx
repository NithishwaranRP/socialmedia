import React, {useMemo} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import CustomText from '../../components/global/CustomText';
import {FONTS} from '../../constants/Fonts';
import {useThemeColors} from '../../constants/Colors';
import {push} from '../../utils/NavigationUtil';
import {selectUser} from '../../redux/reducers/userSlice';
import {selectFollowings} from '../../redux/reducers/followingSlice';
import {useAppDispatch, useAppSelector} from '../../redux/reduxHook';
import {toggleFollow} from '../../redux/actions/userAction';

interface UserDetailsProps {
  user: any;
}

const UserDetails: React.FC<UserDetailsProps> = React.memo(({user}) => {
  const colors = useThemeColors();
  const loggedInUser = useAppSelector(selectUser);
  const followingUsers = useAppSelector(selectFollowings);
  const dispatch = useAppDispatch();

  const isFollowing = useMemo(() => {
    return (
      followingUsers?.find((item: any) => item.id === user._id)?.isFollowing ??
      user.isFollowing
    );
  }, [followingUsers, user._id, user.isFollowing]);

  const handleFollow = async () => {
    await dispatch(toggleFollow(user._id));
  };

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
        {loggedInUser?.id !== user._id && (
          <TouchableOpacity
            style={[
              styles.follow,
              {
                backgroundColor: isFollowing ? 'transparent' : colors.card,
                borderWidth: isFollowing ? 1 : 0,
                borderColor: isFollowing ? colors.border : colors.card,
              },
            ]}
            onPress={handleFollow}>
            <CustomText
              variant="h9"
              fontFamily={FONTS.Medium}
              style={{color: isFollowing ? colors.text : colors.text}}>
              {isFollowing ? 'Unfollow' : 'Follow'}
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
  follow: {
    padding: 5,
    paddingHorizontal: 10,
    borderRadius: 50,
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
});

export default UserDetails;