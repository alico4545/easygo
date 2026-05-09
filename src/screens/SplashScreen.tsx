import React from 'react';
import {ImageBackground, StatusBar, StyleSheet, View} from 'react-native';

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <ImageBackground
        source={require('../../assets/floorplans/splashresim.png')}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a2d67',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
