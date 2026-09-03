import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent llama a AppRegistry.registerComponent('main', () => App);
// También asegura que el entorno esté configurado correctamente para Expo Go y Web.
registerRootComponent(App);
