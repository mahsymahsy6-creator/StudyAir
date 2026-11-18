const fs = require('fs');
const path = require('path');

const targetBuild = path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'build', 'TopicSubscriptionModule.android.js');
const targetSrc = path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'src', 'TopicSubscriptionModule.android.ts');

const safeCode = `import { requireOptionalNativeModule } from 'expo';
const nativeModule = requireOptionalNativeModule('ExpoTopicSubscriptionModule');
export default nativeModule ?? {
  addListener: () => {},
  removeListeners: () => {},
  subscribeToTopicAsync: () => Promise.resolve(null),
  unsubscribeFromTopicAsync: () => Promise.resolve(null),
};
`;

try {
  if (fs.existsSync(targetBuild)) {
    fs.writeFileSync(targetBuild, safeCode, 'utf8');
    console.log('[patch] Successfully patched TopicSubscriptionModule.android.js');
  }
  if (fs.existsSync(targetSrc)) {
    fs.writeFileSync(targetSrc, safeCode, 'utf8');
    console.log('[patch] Successfully patched TopicSubscriptionModule.android.ts');
  }
} catch (err) {
  console.warn('[patch] Failed to patch expo-notifications:', err.message);
}
