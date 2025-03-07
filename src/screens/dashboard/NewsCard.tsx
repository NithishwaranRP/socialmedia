import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Video from 'react-native-video';

interface NewsCardProps {
  reelUrl: string;
  thumbnailUrl: string; // New prop for thumbnail image
}

const NewsCard: React.FC<NewsCardProps> = ({ reelUrl, thumbnailUrl }) => {
  const [playVideo, setPlayVideo] = useState(false);

  return (
    <TouchableOpacity onPress={() => setPlayVideo(true)} style={styles.card}>
      {playVideo ? (
        <Video
          source={{ uri: reelUrl }}
          style={styles.video}
          resizeMode="cover"
          controls
          paused={!playVideo}
        />
      ) : (
        <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
      )}
      {!playVideo && <Text style={styles.playText}>▶ Play</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 10,
    backgroundColor: '#1e1e1e',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  playText: {
    position: 'absolute',
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
});

export default NewsCard;
