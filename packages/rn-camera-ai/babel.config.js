module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ...(function () {
      try {
        require.resolve('react-native-worklets/plugin');
        return ['react-native-worklets/plugin'];
      } catch {
        return ['react-native-reanimated/plugin'];
      }
    })(),
  ],
};
