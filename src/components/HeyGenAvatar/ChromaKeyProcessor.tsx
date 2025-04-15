import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { FFmpegKit } from 'ffmpeg-kit-react-native';
import Video from 'react-native-video';
import RNFS from 'react-native-fs';
import { FONTS } from '../../constants/Fonts';

interface ChromaKeyProcessorProps {
  sourceUri: string;
  onProcessed?: (outputUri: string) => void;
  chromaColor?: string; // Default is green "#00FF00"
  similarity?: number; // 0.0-1.0, default 0.3
  blend?: number; // 0.0-1.0, default 0.1
  width?: number;
  height?: number;
}

const ChromaKeyProcessor: React.FC<ChromaKeyProcessorProps> = ({
  sourceUri,
  onProcessed,
  chromaColor = "#00FF00",
  similarity = 0.3,
  blend = 0.1,
  width = 480,
  height = 640,
}) => {
  const [processing, setProcessing] = useState(false);
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (sourceUri) {
      processVideo();
    }
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
      
      // Convert hex color to RGB values for FFmpeg
      const hexToRgb = (hex: string) => {
        const cleanHex = hex.replace('#', '');
        return {
          r: parseInt(cleanHex.substring(0, 2), 16) / 255,
          g: parseInt(cleanHex.substring(2, 4), 16) / 255,
          b: parseInt(cleanHex.substring(4, 6), 16) / 255
        };
      };
      
      const rgb = hexToRgb(chromaColor);
      
      // Build FFmpeg command for chromakey
      const command = `-i ${sourceUri} -filter_complex "[0:v]chromakey=color=${rgb.r}:${rgb.g}:${rgb.b}:similarity=${similarity}:blend=${blend}[ckout];[ckout]scale=${width}:${height}[out]" -map "[out]" -preset ultrafast -c:v mpeg4 -q:v 3 ${outputPath}`;
      
      console.log("Running FFmpeg command:", command);
      
      // Execute FFmpeg command
      const session = await FFmpegKit.execute(command);
      const returnCode = await session.getReturnCode();
      
      if (returnCode.isValueSuccess()) {
        console.log("ChromaKey processing completed successfully");
        setProcessedUri(outputPath);
        if (onProcessed) {
          onProcessed(outputPath);
        }
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
  
  if (processing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.processingText}>Processing Green Screen...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  
  if (processedUri) {
    return (
      <Video
        source={{ uri: processedUri }}
        style={styles.video}
        resizeMode="cover"
        repeat
        muted={false}
      />
    );
  }
  
  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  processingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: FONTS.Medium,
    color: '#FFF',
  },
  errorText: {
    color: '#FF5252',
    textAlign: 'center',
    padding: 12,
    fontFamily: FONTS.Regular,
  }
});

export default ChromaKeyProcessor; 