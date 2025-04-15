import LanguageReelsScreen from '../screens/reel/LanguageReelsScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="LanguageReelsScreen" component={LanguageReelsScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator; 