import {View, StyleSheet, TouchableOpacity, Dimensions} from 'react-native';
import React from 'react';
import {useAppDispatch} from '../../redux/reduxHook';
import {Colors} from '../../constants/Colors';
import {RFValue} from 'react-native-responsive-fontsize';
import FastImage from 'react-native-fast-image';
import CustomText from '../global/CustomText';
import {FONTS} from '../../constants/Fonts';
import {navigate, push} from '../../utils/NavigationUtil';
import GradientButton from '../global/GradientButton';
import {Logout} from '../../redux/actions/userAction';
import ProfileButton from './ProfileButton';
import LinearGradient from 'react-native-linear-gradient';

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
          source={{uri: uri, priority: FastImage.priority.high}}
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

const ProfileDetails: React.FC<{user: User}> = ({user}) => {
  const dispatch = useAppDispatch();

  const handleEditProfile = () => {
    //handle edit profile continue
  };

  const handleLogout = () => {
    dispatch(Logout());
    navigate('LoginScreen');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <AvatarComponent uri={user?.userImage} />
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <StatsComponent
              count={user?.followersCount}
              onPress={() => {
                push('FollowingScreen', {
                  userId: user?.id,
                  type: 'Followers',
                });
              }}
              label="Followers"
            />
            <StatsComponent count={user?.reelsCount} label="Reels" />
            <StatsComponent
              count={user?.followingCount}
              onPress={() => {
                push('FollowingScreen', {
                  userId: user?.id,
                  type: 'Following',
                });
              }}
              label="Following"
            />
          </View>

          <GradientButton
            text="Reedem"
            onPress={() =>
              navigate('ReedemScreen', {
                user: user,
              })
            }
          />
        </View>
      </View>
      
      <View style={styles.bioContainer}>
        <CustomText variant="h7" fontFamily={FONTS.Medium} style={styles.username}>
          {user.name}
        </CustomText>
        <CustomText
          variant="h8"
          style={styles.bio}
          fontFamily={FONTS.Medium}
          numberOfLines={5}>
          {user?.bio}
        </CustomText>
      </View>

      <ProfileButton
        firstText="Edit Profile"
        secondText="Logout"
        onPressFirst={handleEditProfile}
        onPressSecond={handleLogout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.black,
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginBottom: 12,
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

export default ProfileDetails;
