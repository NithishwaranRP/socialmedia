import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import NewsCard from './NewsCard';
import { fetchFeedReel } from '../../redux/actions/reelAction';
import { useAppDispatch } from '../../redux/reduxHook';

const categories = ['For You', 'Local', 'Business', 'Sports', 'Education'];

const NewsList = () => {
  const dispatch = useAppDispatch();
  const [selectedCategory, setSelectedCategory] = useState('For You');
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); // Handle loading state

  useEffect(() => {
    async function getReels() {
      setLoading(true); // Start loading
      try {
        const fetchedReels = await dispatch(fetchFeedReel(0, 10));
        if (Array.isArray(fetchedReels)) {
          setReels(fetchedReels);
        } else {
          setReels([]); // Ensure it remains an array
        }
      } catch (error) {
        console.error('Error fetching reels:', error);
        setReels([]);
      }
      setLoading(false); // Stop loading
    }
    getReels();
  }, [selectedCategory]); // Fetch reels when category changes

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        data={categories}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setSelectedCategory(item)}>
            <Text style={[styles.category, selectedCategory === item && styles.activeCategory]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
      />

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <FlatList
        data={reels}
        renderItem={({ item }) => (
          <NewsCard reelUrl={item.videoUrl} thumbnailUrl={item.thumbnailUrl} />
        )}
        keyExtractor={(item, index) => index.toString()}
      />
      
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  category: {
    marginRight: 10,
    color: 'gray',
  },
  activeCategory: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingText: {
    color: 'white',
    textAlign: 'center',
    marginVertical: 10,
  },
});

export default NewsList;
