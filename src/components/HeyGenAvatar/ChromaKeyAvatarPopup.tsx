import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video';
import { FFmpegKit } from 'ffmpeg-kit-react-native';
import RNFS from 'react-native-fs';
import { FONTS } from '../../constants/Fonts';
import { useThemeColors } from '../../constants/Colors';
import LinearGradient from 'react-native-linear-gradient';

interface ChromaKeyAvatarPopupProps {
  sourceUri: string;
  onDismiss?: () => void;
}

const ChromaKeyAvatarPopup: React.FC<ChromaKeyAvatarPopupProps> = ({
  sourceUri,
  onDismiss,
}) => {
  const colors = useThemeColors();
  const [minimized, setMinimized] = useState(false);
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (sourceUri) {
      processVideo();
    }
    
    return () => {
      // Cleanup processed video file when component unmounts
      if (processedUri) {
        RNFS.unlink(processedUri).catch(err => 
          console.log('Error deleting temp file:', err)
        );
      }
    };
  }, [sourceUri]);
  
  const processVideo = async () => {
    if (!sourceUri) return;
    
    setProcessing(true);
    setError(null);
    
    try {
      // Generate output file path
      const outputDir = `${RNFS.CachesDirectoryPath}/chromakey`;
      const outputFileName = `processed_${Date.now()}.mp4`;
      const outputPath = `${outputDir}/${outputFileName}`;
      
      // Ensure output directory exists
      await RNFS.mkdir(outputDir, { NSURLIsExcludedFromBackupKey: true });
      
      // Build FFmpeg command for chromakey effect
      const command = `-i ${sourceUri} -filter_complex "[0:v]chromakey=color=0.0:1.0:0.0:similarity=0.3:blend=0.1[ckout]" -map "[ckout]" -preset ultrafast -c:v mpeg4 -q:v 3 ${outputPath}`;
      
      console.log("Running FFmpeg command:", command);
      
      // Execute FFmpeg command
      const session = await FFmpegKit.execute(command);
      const returnCode = await session.getReturnCode();
      
      if (returnCode.isValueSuccess()) {
        console.log("ChromaKey processing completed successfully");
        setProcessedUri(outputPath);
      } else {
        const log = await session.getOutput();
        console.error("FFmpeg processing failed:", log);
        setError("Failed to process video. Check logs for details.");
      }
    } catch (err) {
      console.error("Error in ChromaKey processing:", err);
      setError(`Processing error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setProcessing(false);
    }
  };
  
  // If minimized, show only a small floating button
  if (minimized) {
    return (
      <TouchableOpacity 
        style={styles.minimizedButton}
        onPress={() => setMinimized(false)}
        onLongPress={onDismiss}
      >
        <Icon name="face" size={28} color="#FFF" />
      </TouchableOpacity>
    );
  }
  
  return (
    <View style={styles.popupContainer}>
      <View style={styles.videoContainer}>
        {/* Background gradient that will show behind the avatar */}
        <LinearGradient
          colors={['#121212', '#232323', '#121212']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.avatarBackground}
        />
        
        {processing && (
          <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.theme} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Processing video...
            </Text>
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <Icon name="error-outline" size={24} color="#FF5252" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {!processing && processedUri && (
          <Video
            source={{ uri: processedUri }}
            style={styles.videoPlayer}
            resizeMode="contain"
            repeat
            muted={false}
          />
        )}
      </View>
      
      <View style={styles.headerButtons}>
        <TouchableOpacity
          style={styles.minimizeButton}
          onPress={() => setMinimized(true)}
        >
          <Icon name="minimize" size={20} color="#FFF" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.minimizeButton}
          onPress={onDismiss}
        >
          <Icon name="close" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  popupContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 300,
    height: 400,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#121212',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  minimizedButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4a4a4a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  headerButtons: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    zIndex: 10,
  },
  minimizeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  avatarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: FONTS.Medium,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    color: '#FF5252',
    textAlign: 'center',
    fontFamily: FONTS.Regular,
    fontSize: 14,
  },
  videoPlayer: {
    flex: 1,
    width: '100%',
    height: '100%',
  }
});

export default ChromaKeyAvatarPopup; 