import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { API_URL } from '@/constants';

// On iOS this presents SFSafariViewController, keeping account pages in the app
// with Safari's visible domain and security controls.
export async function openAccountPage(path: 'register/' | 'forgot-password/') {
  try {
    await WebBrowser.openBrowserAsync(`${API_URL}${path}`, {
      dismissButtonStyle: 'done',
      controlsColor: '#006b2c',
    });
  } catch {
    Alert.alert('Unable to open account page', 'Please try again.');
  }
}
