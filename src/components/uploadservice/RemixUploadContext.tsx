import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from 'react';
import {
  Animated,
  Easing,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppDispatch } from '../../redux/reduxHook';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { navigate } from '../../utils/NavigationUtil';

interface RemixUploadContextType {
  isUpload: boolean;
  loadingMessage: string | null;
  uploading: boolean;
  uploadProgress: number;
  startUpload: (file_uri: string, caption: string) => void;
  uploadAnimation: Animated.Value;
  showUpload: (value: boolean) => void;
}

const defaultContext: RemixUploadContextType = {
  isUpload: false,
  loadingMessage: null,
  uploadProgress: 0,
  startUpload: () => {},
  uploading: false,
  showUpload: () => {},
  uploadAnimation: new Animated.Value(0),
};

const RemixUploadContext = createContext<RemixUploadContextType>(defaultContext);

export const RemixUploadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isUpload, showUpload] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [uploadAnimation] = useState<Animated.Value>(new Animated.Value(0));
  const [uploading, setUploading] = useState<boolean>(false);
  const dispatch = useAppDispatch();

  const startUpload = async (file_uri: string, caption: string) => {
    try {
      showUpload(true);
      setUploadProgress(0);
      setUploading(true);
      setLoadingMessage('Uploading Video...🎞️');
      Animated.timing(uploadAnimation, {
        toValue: 1,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();

      // Replace with your API call logic
      const videoResponse = await uploadFileAPI(file_uri);
      if (!videoResponse) throw new Error('There was an upload error');
      setUploadProgress(70);
      setLoadingMessage('Finishing Upload...✨');

      await createReelAPI({ videoUri: videoResponse, caption });
      setUploading(false);
      setUploadProgress(100);

      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
      Animated.timing(uploadAnimation, {
        toValue: 0,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => showUpload(false));
    } catch (error) {
      console.log(error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during upload.';
      Alert.alert('Upload Error', errorMessage);
      showUpload(false);
    }
  };

  return (
    <RemixUploadContext.Provider value={{
      isUpload,
      loadingMessage,
      startUpload,
      uploadAnimation,
      uploadProgress,
      uploading,
      showUpload,
    }}>
      {children}
      <UploadProgress />
    </RemixUploadContext.Provider>
  );
};

export const useRemixUpload = () => {
  return useContext(RemixUploadContext);
};

const UploadProgress: React.FC = () => {
  const {
    isUpload,
    uploading,
    loadingMessage,
    uploadAnimation,
    uploadProgress,
    showUpload,
  } = useRemixUpload();

  useEffect(() => {
    if (!isUpload) {
      Animated.timing(uploadAnimation, {
        toValue: 0,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [isUpload]);

  const translateY = uploadAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  if (!isUpload) {
    return null;
  }

  return (
    <Animated.View style={[styles.toast, { transform: [{ translateY }] }]}>
      <TouchableOpacity style={styles.content} disabled={uploading}>
        <View style={styles.textContainer}>
          <Text style={styles.toastText}>
            {uploading ? `${loadingMessage}` : 'Upload Completed'}
          </Text>
          {!uploading && (
            <TouchableOpacity onPress={() => navigate('Profile')}>
              <Text style={styles.viewText}>View</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
      {uploading && (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
        </View>
      )}
    </Animated.View>
  );
};


const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 10,
    left: 0,
    right: 0,
    marginHorizontal: 10,
    backgroundColor: '#0f141c',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 0.6,
    borderColor: Colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  toastText: {
    color: 'white',
    fontSize: 16,
  },
  viewText: {
    color: 'white',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  progressBarContainer: {
    height: 4,
    width: '100%',
    backgroundColor: '#555',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.theme,
  },
});