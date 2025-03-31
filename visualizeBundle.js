const path = require('path');
const visualizerPath = path.join(__dirname, 'node_modules', 'react-native-bundle-visualizer');
const { bundleVisualizer } = require(visualizerPath);

bundleVisualizer({
  entry: './index.js', // Path to your entry file
  platform: 'android',  // or 'ios'
  output: './bundle-visualizer-output', // Where to save the output files
  dev: false,           // Set to true for development builds
  minify: true,        // Set to true to minify the bundle
});