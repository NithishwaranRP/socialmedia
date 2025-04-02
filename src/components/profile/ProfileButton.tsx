import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import CustomText from '../global/CustomText';
import {FONTS} from '../../constants/Fonts';
import LinearGradient from 'react-native-linear-gradient';
import {Colors} from '../../constants/Colors';
import Icon from 'react-native-vector-icons/Ionicons';

interface ButtonsProps {
  firstText: string;
  secondText: string;
  onPressFirst: () => void;
  onPressSecond: () => void;
}

const ProfileButton: React.FC<ButtonsProps> = ({
  onPressFirst,
  onPressSecond,
  firstText,
  secondText,
}) => (
  <View style={styles.container}>
    <TouchableOpacity 
      style={styles.buttonContainer} 
      onPress={onPressFirst}
      activeOpacity={0.8}>
      <LinearGradient
        colors={['#162640', '#223a5e']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.gradientBtn}>
        <Icon name="pencil" size={16} color={Colors.white} style={styles.buttonIcon} />
        <CustomText variant="h9" fontFamily={FONTS.Medium}>
          {firstText}
        </CustomText>
      </LinearGradient>
    </TouchableOpacity>
    
    <TouchableOpacity 
      style={styles.buttonContainer} 
      onPress={onPressSecond}
      activeOpacity={0.8}>
      <LinearGradient
        colors={['#2c2c2c', '#1c1b1b']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.gradientBtn}>
        <Icon name="log-out-outline" size={16} color={Colors.white} style={styles.buttonIcon} />
        <CustomText variant="h9" fontFamily={FONTS.Medium}>
          {secondText}
        </CustomText>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
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
  }
});

export default ProfileButton;
