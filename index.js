/**
 * @format
 */
// import 'react-native-get-random-values';

// Inject node globals into React Native global scope.
import { AppRegistry } from 'react-native'
import App from './src/App'
import { name as appName } from './app.json'

global.Buffer = require('buffer').Buffer
// global.process = require('process');
global.process.env.NODE_ENV = __DEV__ ? 'development' : 'production'

// Needed so that 'stream-http' chooses the right default protocol.
global.location = {
  protocol: 'file:'
}
// global.__DEV__ = false // For cleaner debugging with react-native-tcp

AppRegistry.registerComponent(appName, () => App)
