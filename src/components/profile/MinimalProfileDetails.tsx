import React, {useState, useEffect} from 'react';
import {View, StyleSheet, TouchableOpacity, Modal, ToastAndroid} from 'react-native';
import FastImage from 'react-native-fast-image';
import {RFValue} from 'react-native-responsive-fontsize';
import {FONTS} from '../../constants/Fonts';
import {Colors, useThemeColors} from '../../constants/Colors';
import CustomText from '../global/CustomText';
import MinimalButton from '../global/MinimalButton';
import {navigate, push, resetAndNavigate} from '../../utils/NavigationUtil';
import {useAppDispatch} from '../../redux/reduxHook';
import {Logout, updateUserLanguage} from '../../redux/actions/userAction';
import Icon from 'react-native-vector-icons/Ionicons';
import ThemeToggle from '../ThemeToggle';
import {useSelector} from 'react-redux';
import {RootState} from '../../redux/store';
import {LANGUAGES} from '../../constants/Languages';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {fetchFeedReel} from '../../redux/actions/reelAction';

interface StatItemProps {
  label: string;
  count: string | number;
  onPress?: () => void;
}

const StatItem: React.FC<StatItemProps> = ({label, count, onPress}) => {
  const colors = useThemeColors();
  
  return (
    <TouchableOpacity style={styles.statItem} onPress={onPress} disabled={!onPress}>
      <CustomText 
        variant="h6" 
        fontFamily={FONTS.SemiBold} 
        style={[styles.statCount, { color: colors.text }]}
      >
        {count}
      </CustomText>
      <CustomText 
        variant="h8" 
        fontFamily={FONTS.Medium} 
        style={[styles.statLabel, { color: colors.lightText }]}
      >
        {label}
      </CustomText>
    </TouchableOpacity>
  );
};

interface MenuOptionProps {
  icon: string;
  text: string;
  onPress: () => void;
}

const MenuOption: React.FC<MenuOptionProps> = ({ icon, text, onPress }) => {
  const colors = useThemeColors();
  
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Icon name={icon} size={RFValue(18)} color={colors.text} style={styles.menuIcon} />
      <CustomText 
        variant="h8" 
        fontFamily={FONTS.Medium} 
        style={[styles.menuText, {color: colors.text}]}
      >
        {text}
      </CustomText>
    </TouchableOpacity>
  );
};

interface MinimalProfileDetailsProps {
  user: User;
}

const MinimalProfileDetails: React.FC<MinimalProfileDetailsProps> = ({user}) => {
  const colors = useThemeColors();
  const [menuVisible, setMenuVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  const reduxUser = useSelector((state: RootState) => state.user.user);

  // Load selected language on component mount or when user changes
  useEffect(() => {
    const loadSelectedLanguage = async () => {
      try {
        console.log('LOADING LANGUAGE - Starting language selection process...');
        console.log('LOADING LANGUAGE - Redux user state:', reduxUser?.preferredLanguage);
        console.log('LOADING LANGUAGE - Prop user state:', 
          user ? (user as any).preferredLanguage : undefined);
        
        // First priority: Get language from Redux state (most up-to-date)
        if (reduxUser && 'preferredLanguage' in reduxUser && reduxUser.preferredLanguage) {
          console.log('LOADING LANGUAGE - Using Redux language:', reduxUser.preferredLanguage);
          setSelectedLanguage(reduxUser.preferredLanguage);
          console.log('LOADING LANGUAGE - Set language from Redux state:', reduxUser.preferredLanguage);
          // Also sync to AsyncStorage
          await AsyncStorage.setItem('selectedLanguage', reduxUser.preferredLanguage);
          return;
        }
        
        // Second priority: Get from prop user object
        if (user && 'preferredLanguage' in user && user.preferredLanguage) {
          console.log('LOADING LANGUAGE - Using user prop language:', user.preferredLanguage);
          setSelectedLanguage(user.preferredLanguage as string);
          console.log('LOADING LANGUAGE - Set language from user prop:', user.preferredLanguage);
          // Sync to AsyncStorage
          await AsyncStorage.setItem('selectedLanguage', user.preferredLanguage as string);
          return;
        }
        
        // Third priority: Get from AsyncStorage
        const storedLanguage = await AsyncStorage.getItem('selectedLanguage');
        if (storedLanguage) {
          console.log('LOADING LANGUAGE - Using AsyncStorage language:', storedLanguage);
          setSelectedLanguage(storedLanguage);
          console.log('LOADING LANGUAGE - Set language from AsyncStorage:', storedLanguage);
          return;
        }
        
        // Fallback: Default to English
        console.log('LOADING LANGUAGE - No language preference found anywhere, defaulting to English');
        setSelectedLanguage('en');
        await AsyncStorage.setItem('selectedLanguage', 'en');
      } catch (error) {
        console.error('Error loading selected language:', error);
        // Default to English on error
        setSelectedLanguage('en');
      }
    };
    
    loadSelectedLanguage();
  }, [user, reduxUser]); // Re-run when user or reduxUser changes

  const handleEditProfile = () => {
    setMenuVisible(false);
    // handle edit profile
  };

  const handleLogout = () => {
    setMenuVisible(false);
    dispatch(Logout());
    navigate('LoginScreen');
  };

  const navigateToPickReelScreen = () => {
    navigate('PickReelScreen');
  };
  
  const navigateToRedeemScreen = () => {
    setMenuVisible(false);
    navigate('ReedemScreen', {
      user: user,
    });
  };

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };
  
  const handleLanguageSelect = async (langCode: string) => {
    // If language is changing (not just setting the same value)
    const isChangingLanguage = selectedLanguage !== langCode;
    
    if (!isChangingLanguage) {
      setLanguageModalVisible(false);
      return; // No change needed
    }
    
    // Immediately update local state for instant UI feedback
    setSelectedLanguage(langCode);
    setLanguageModalVisible(false);
    
    // Get language display name
    const selectedLang = LANGUAGES.find(lang => lang.value === langCode)?.label || langCode;
    
    try {
      // Show immediate feedback
      ToastAndroid.show(`Changing language to ${selectedLang}...`, ToastAndroid.SHORT);
      
      // First update language on the server and in Redux
      const serverUpdateSuccess = await dispatch(updateUserLanguage(langCode));
      
      // Refresh the feed with the new language
      try {
        dispatch(fetchFeedReel(0, 25)); // Fire and forget - no need to await
        
        // Navigate back to home screen to show the refreshed feed
        setTimeout(() => {
          resetAndNavigate('BottomTab');
        }, 500);
      } catch (error) {
        console.error('Error refreshing feed after language change:', error);
      }
    } catch (error) {
      console.error('Error saving language preference:', error);
      ToastAndroid.show('Failed to change language', ToastAndroid.SHORT);
    }
  };
  
  const openLanguageModal = () => {
    setMenuVisible(false);
    setLanguageModalVisible(true);
  };

  // Find the display name of the selected language
  const selectedLanguageLabel = LANGUAGES.find(
    (lang) => lang.value === selectedLanguage
  )?.label || 'English';

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      {/* Header with 3-dot menu */}
      <View style={styles.header}>
        <View style={{flex: 1}} />
        <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
          <Icon name="ellipsis-vertical" size={RFValue(20)} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        {/* Avatar on left */}
        <View style={styles.avatarContainer}>
          <FastImage
            source={{uri: user?.userImage, priority: FastImage.priority.high}}
            style={styles.avatar}
          />
        </View>
        
        {/* Right Side - Stats and Redeem Button */}
        <View style={styles.rightContainer}>
          {/* Stats in a row */}
          <View style={styles.statsContainer}>
            <StatItem 
              count={user?.followersCount} 
              label="Followers"
              onPress={() => {
                push('FollowingScreen', {
                  userId: user?.id,
                  type: 'Followers',
                });
              }}
            />
            
            <StatItem 
              count={user?.reelsCount} 
              label="Reels"
            />
            
            <StatItem 
              count={user?.followingCount} 
              label="Following"
              onPress={() => {
                push('FollowingScreen', {
                  userId: user?.id,
                  type: 'Following',
                });
              }}
            />
          </View>
          
          {/* Pick Reel button below stats (replaced Redeem) */}
          <View style={styles.redeemButtonContainer}>
            <MinimalButton
              text="Pick Reel"
              // iconName="video-library"
              variant="default"
              size="sm"
              onPress={navigateToPickReelScreen}
              fullWidth={true}
            />
          </View>
        </View>
      </View>
      
      {/* User Info Section */}
      <View style={styles.userInfoContainer}>
        <CustomText variant="h6" fontFamily={FONTS.SemiBold} style={[styles.userName, {color: colors.text}]}>
          {user.name}
        </CustomText>
        
        {user?.bio && (
          <CustomText
            variant="h8"
            style={[styles.bio, {color: colors.lightText}]}
            fontFamily={FONTS.Regular}
            numberOfLines={3}>
            {user.bio}
          </CustomText>
        )}
      </View>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.menuContainer, {backgroundColor: colors.card}]}>
            <MenuOption 
              icon="create-outline" 
              text="Edit Profile" 
              onPress={handleEditProfile} 
            />
            <View style={[styles.menuDivider, {backgroundColor: colors.border}]} />
            
            {/* Redeem Option (moved from button) */}
            <MenuOption 
              icon="wallet-outline" 
              text="Redeem" 
              onPress={navigateToRedeemScreen} 
            />
            <View style={[styles.menuDivider, {backgroundColor: colors.border}]} />
            
            {/* Language Selection Option */}
            <MenuOption 
              icon="language-outline" 
              text={`Language: ${selectedLanguageLabel}`} 
              onPress={openLanguageModal} 
            />
            <View style={[styles.menuDivider, {backgroundColor: colors.border}]} />
            
            <View style={styles.themeToggleMenuItem}>
              <Icon 
                name={isDarkMode ? "moon-outline" : "sunny-outline"} 
                size={RFValue(18)} 
                color={colors.text} 
                style={styles.menuIcon} 
              />
              <CustomText 
                variant="h8" 
                fontFamily={FONTS.Medium} 
                style={[styles.menuText, {flex: 1, color: colors.text}]}
              >
                Theme
              </CustomText>
              <ThemeToggle />
            </View>
            
            <View style={[styles.menuDivider, {backgroundColor: colors.border}]} />
            <MenuOption 
              icon="log-out-outline" 
              text="Logout" 
              onPress={handleLogout} 
            />
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setLanguageModalVisible(false)}
        >
          <View style={[styles.languageMenuContainer, {backgroundColor: colors.card}]}>
            <View style={styles.languageHeader}>
              <CustomText 
                variant="h7" 
                fontFamily={FONTS.SemiBold} 
                style={{color: colors.text}}
              >
                Select Language
              </CustomText>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <Icon name="close" size={RFValue(20)} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.menuDivider, {backgroundColor: colors.border}]} />
            
            {LANGUAGES.map((language) => (
              <TouchableOpacity
                key={language.value}
                style={styles.languageOption}
                onPress={() => handleLanguageSelect(language.value)}
              >
                <CustomText 
                  variant="h8" 
                  fontFamily={FONTS.Medium} 
                  style={{
                    color: colors.text,
                    fontWeight: selectedLanguage === language.value ? 'bold' : 'normal'
                  }}
                >
                  {language.label}
                </CustomText>
                
                {selectedLanguage === language.value && (
                  <Icon name="checkmark" size={RFValue(16)} color={colors.theme} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  menuButton: {
    padding: 8,
  },
  profileSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginRight: 20,
  },
  avatar: {
    width: RFValue(80),
    height: RFValue(80),
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#333',
  },
  rightContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statCount: {
    marginBottom: 2,
  },
  statLabel: {
  },
  redeemButtonContainer: {
    width: '100%',
  },
  userInfoContainer: {
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
  },
  userName: {
    marginBottom: 4,
  },
  bio: {
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    borderRadius: 8,
    marginTop: 60,
    marginRight: 16,
    width: 180,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 8,
  },
  themeToggleMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  languageMenuContainer: {
    width: '80%',
    borderRadius: 12,
    overflow: 'hidden',
    paddingBottom: 16,
    elevation: 5,
    maxHeight: '70%',
  },
  languageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});

export default MinimalProfileDetails; 