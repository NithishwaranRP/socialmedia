import React, {FC} from 'react';
import CustomView from '../../components/global/CustomView';
import CustomGradient from '../../components/global/CustomGradient';
import GlobalFeed from '../../components/feed/GlobalFeed';

const HomeScreen: FC = () => {
  return (
    <CustomView>
      {/* <CustomGradient position="top" /> */}
      <GlobalFeed />
      <CustomGradient position="bottom" />
    </CustomView>
  );
};

export default HomeScreen;

// import React from 'react';
// import { View, StyleSheet, ScrollView } from 'react-native';
// import CustomView from '../../components/global/CustomView';
// import CustomGradient from '../../components/global/CustomGradient';
// import BreakingNews from './BreakingNews';
// import NewsList from './NewsList';

// const HomeScreen = () => {
//   return (
//     <CustomView style={styles.container}>
//       <CustomGradient position="top" />
//       <ScrollView showsVerticalScrollIndicator={false}>
//         <BreakingNews/>
//         <NewsList/>
//       </ScrollView>
//       <CustomGradient position="bottom" />
//     </CustomView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#121212',
//   },
// });

// export default HomeScreen;