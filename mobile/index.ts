import { registerRootComponent } from 'expo';

import App from './App';
import WatchApp from './wear/App.watch';

// Opt-in watch preview: set EXPO_PUBLIC_WATCH=1 to render the Wear MVP.
// Default (unset) renders the phone app unchanged.
const Root = process.env.EXPO_PUBLIC_WATCH === '1' ? WatchApp : App;

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
