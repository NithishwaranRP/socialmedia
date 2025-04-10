import {FC, ReactNode} from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {useThemeColors} from '../../constants/Colors';

interface CustomViewProps {
  children: ReactNode;
  style?: ViewStyle;
}

const CustomView: FC<CustomViewProps> = ({children, style}) => {
  const colors = useThemeColors();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CustomView;
