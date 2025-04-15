import React, {FC} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {mergedStacks} from './ScreenCollections';
import {UploadProvider} from '../components/uploadservice/UploadContext';
import {SheetProvider} from 'react-native-actions-sheet';
import { AvatarPopupProvider } from '../context/AvatarPopupContext';
import AppContainer from '../components/AppContainer';

const Stack = createNativeStackNavigator();
const MainNavigator: FC = () => {
  return (
    <SheetProvider>
      <UploadProvider>
        <AvatarPopupProvider>
          <AppContainer>
            <Stack.Navigator
              initialRouteName="SplashScreen"
              screenOptions={() => ({
                headerShown: false,
              })}>
              {mergedStacks.map((item, index) => {
                return (
                  <Stack.Screen
                    key={index}
                    name={item.name}
                    component={item.component}
                  />
                );
              })}
            </Stack.Navigator>
          </AppContainer>
        </AvatarPopupProvider>
      </UploadProvider>
    </SheetProvider>
  );
};

export default MainNavigator;
