import React from 'react';
import { View, Text, FlatList, Image, StyleSheet } from 'react-native';

const breakingNews = [
  { id: '1', title: 'New Movie Release', image: require('../../assets/images/loader.jpg') },
  { id: '2', title: 'Football Star Transfers', image: require('../../assets/images/placeholder.png') },
];

const BreakingNews = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Breaking News 🔥</Text>
      <FlatList
        data={breakingNews}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={item.image} style={styles.image} />
            <Text style={styles.title}>{item.title}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  card: {
    marginRight: 10,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  title: {
    color: 'white',
    marginTop: 5,
  },
});

export default BreakingNews;