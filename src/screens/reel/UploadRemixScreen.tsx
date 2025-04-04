import React, {useState} from 'react';
import {Image, ScrollView, View, TextInput, StyleSheet} from 'react-native';
import CustomHeader from '../../components/global/CustomHeader';
import CustomSafeAreaView from '../../components/global/CustomSafeAreaView';
import GradientButton from '../../components/global/GradientButton';
import {useRoute} from '@react-navigation/native';
import {Colors} from '../../constants/Colors';
import {FONTS} from '../../constants/Fonts';
import {goBack} from '../../utils/NavigationUtil';

interface uriData {
  file_uri: string;
}

const UploadRemixScreen: React.FC = () => {
  const data = useRoute();
  const item = data?.params as uriData;
  const [caption, setCaption] = useState<string>('');


  
  return (
    <CustomSafeAreaView>
      <CustomHeader title="Upload" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.flexDirectionRow}>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={caption}
            placeholderTextColor={Colors.border}
            onChangeText={setCaption}
            placeholder="Enter your caption here..."
            multiline={true}
            numberOfLines={8}
          />
        </View>
        <GradientButton
          text="Upload"
          iconName="upload"
          onPress={() => {
            goBack();
          }}
        />
      </ScrollView>
    </CustomSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 5,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  flexDirectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  input: {
    height: 150,
    borderColor: 'gray',
    borderWidth: 1,
    color: Colors.text,
    borderRadius: 5,
    fontFamily: FONTS.Medium,
    padding: 10,
    marginVertical: 10,
    width: '68%',
  },
  img: {
    width: '25%',
    height: 150,
    resizeMode: 'cover',
    borderRadius: 10,
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
});

export default UploadRemixScreen;