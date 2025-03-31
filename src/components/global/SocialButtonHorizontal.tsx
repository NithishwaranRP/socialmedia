import {
  View,
  Text,
  TextStyle,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import React, {FC} from 'react';
import CustomText from './CustomText';
import {FONTS} from '../../constants/Fonts';

interface SocialButtonHorizontalProps {
  icon: React.ReactNode;
  text: string;
  textColor: string;
  backgroundColor: string;
  onPress: () => void;
  borderColor?: string;  // ✅ Added new optional prop
  borderWidth?: number;  // ✅ Added new optional prop
}

const SocialButtonHorizontal: FC<SocialButtonHorizontalProps> = ({
  icon,
  text,
  textColor,
  backgroundColor,
  onPress,
  borderColor = "transparent", // ✅ Default to no border
  borderWidth = 0, // ✅ Default to no border
}) => {
  const textStyle: TextStyle = {
    color: textColor,
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor, // ✅ Apply borderColor dynamically
          borderWidth, // ✅ Apply borderWidth dynamically
        },
      ]}
      onPress={onPress}>
      {icon}
      <CustomText
        variant="h8"
        fontFamily={FONTS.Medium}
        style={[styles.text, textStyle]}>
        {text}
      </CustomText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: Platform.OS === 'ios' ? 0.3 : 0.5,
    padding: 10,
    paddingHorizontal: 20,
    width: '100%',
    marginVertical: 10,
  },
  text: {
    width: '90%',
    alignSelf: 'center',
    textAlign: 'center',
  },
});

export default SocialButtonHorizontal;
