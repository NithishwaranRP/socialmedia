import React, {useMemo} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
  Dimensions,
} from 'react-native';
import {RFValue} from 'react-native-responsive-fontsize';
import CustomText from '../global/CustomText';
import {FONTS} from '../../constants/Fonts';
import {Colors} from '../../constants/Colors';
import {selectUser} from '../../redux/reducers/userSlice';
import {useAppDispatch, useAppSelector} from '../../redux/reduxHook';
import {toggleFollow} from '../../redux/actions/userAction';
import {selectFollowings} from '../../redux/reducers/followingSlice';
import {navigate, push} from '../../utils/NavigationUtil';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

const {width} = Dimensions.get('window');

const AvatarComponent: React.FC<{uri: string}> = ({uri}) => {
  return (
    <View style={styles.avatarContainer}>
      <LinearGradient
        colors={['#a9c2eb', '#7f8cff', '#f7404f']}
        style={styles.avatarBorder}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}>
        <FastImage
          source={{uri}}
          style={styles.avatar}
          resizeMode={FastImage.resizeMode.cover}
        />
      </LinearGradient>
    </View>
  );
};

const StatsComponent: React.FC<{
  count: string | number;
  label: string;
  onPress?: () => void;
}> = ({count, label, onPress}) => {
  return (
    <TouchableOpacity 
      style={styles.statsItem} 
      onPress={onPress}
      activeOpacity={0.7}>
      <CustomText variant="h7" fontFamily={FONTS.Medium} style={styles.statsCount}>
        {count}
      </CustomText>
      <CustomText variant="h9" style={styles.statsLabel}>{label}</CustomText>
    </TouchableOpacity>
  );
};

const UserProfileDetails: React.FC<{
  user: any;
  refetchLoginUser: () => void;
}> = ({user, refetchLoginUser}) => {
  const loggedInUser = useAppSelector(selectUser);
  const followingUsers = useAppSelector(selectFollowings);
  const dispatch = useAppDispatch();
  const handleFollow = async () => {
    const data = await dispatch(toggleFollow(user.id));
    refetchLoginUser();
  };
  const isFollowing = useMemo(() => {
    return (
      followingUsers?.find((item: any) => item.id === user.id)?.isFollowing ??
      user.isFollowing
    );
  }, [followingUsers, user.id, user.isFollowing]);

  const handleShareProfile = () => {
    const profileUrl = `${
      Platform.OS == 'android' ? 'https://recaps-backend-277610981315.asia-south1.run.app' : 'reelzzz:/'
    }/share/user/${user.username}`;
    
    const message = `Hey, Checkout this profile: ${profileUrl}`;

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

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <AvatarComponent uri={user?.userImage} />
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <StatsComponent
              onPress={() =>
                push('FollowingScreen', {
                  userId: user?.id,
                  type: 'Followers',
                })
              }
              count={user?.followersCount}
              label="Followers"
            />
            <StatsComponent count={user?.reelsCount} label="Reels" />
            <StatsComponent
              onPress={() =>
                push('FollowingScreen', {
                  userId: user?.id,
                  type: 'Following',
                })
              }
              count={user?.followingCount}
              label="Following"
            />
          </View>
        </View>
      </View>
      
      <View style={styles.bioContainer}>
        <CustomText variant="h7" fontFamily={FONTS.Medium} style={styles.username}>
          {user?.name}
        </CustomText>
        <CustomText
          variant="h8"
          style={styles.bio}
          fontFamily={FONTS.Medium}
          numberOfLines={5}>
          {user?.bio}
        </CustomText>
      </View>
      
      <View style={styles.btnContainer}>
        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={
            loggedInUser?.id == user?.id
              ? () => {
                  //go to edit profile screen
                }
              : () => handleFollow()
          }
          activeOpacity={0.8}>
          <LinearGradient
            colors={
              loggedInUser?.id == user?.id || isFollowing
                ? ['#2c2c2c', '#1c1b1b']
                : ['#1560e6', '#1877F2']
            }
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.gradientBtn}>
            <Icon 
              name={
                loggedInUser?.id == user?.id
                  ? "pencil"
                  : isFollowing
                  ? "person-remove"
                  : "person-add"
              } 
              size={16} 
              color={Colors.white} 
              style={styles.buttonIcon} 
            />
            <CustomText variant="h9" fontFamily={FONTS.Medium}>
              {loggedInUser?.id == user?.id
                ? 'Edit Profile'
                : isFollowing
                ? 'Unfollow'
                : 'Follow'}
            </CustomText>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.buttonContainer} 
          onPress={handleShareProfile}
          activeOpacity={0.8}>
          <LinearGradient
            colors={['#162640', '#223a5e']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.gradientBtn}>
            <Icon name="share-social" size={16} color={Colors.white} style={styles.buttonIcon} />
            <CustomText variant="h9" fontFamily={FONTS.Medium}>
              Share Profile
            </CustomText>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.black,
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
    paddingHorizontal: 2,
  },
  buttonContainer: {
    width: '48%',
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  gradientBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  buttonIcon: {
    marginRight: 6,
  },
  avatarContainer: {
    width: RFValue(90),
    height: RFValue(90),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBorder: {
    width: RFValue(88),
    height: RFValue(88),
    borderRadius: RFValue(44),
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: RFValue(42),
    borderWidth: 2,
    borderColor: Colors.black,
  },
  statsContainer: {
    width: width * 0.65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  statsItem: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  statsCount: {
    color: Colors.white,
    marginBottom: 2,
  },
  statsLabel: {
    color: Colors.lightText,
  },
  bioContainer: {
    marginVertical: 15,
    width: '100%',
  },
  username: {
    color: Colors.white,
    marginBottom: 5,
  },
  bio: {
    color: Colors.lightText,
    lineHeight: 18,
  },
});

export default UserProfileDetails;
