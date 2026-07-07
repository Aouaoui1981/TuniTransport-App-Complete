// Temporary config for web preview: stub native-only modules on web.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const stubPath = path.resolve(__dirname, 'web-native-stub.js');
const nativeOnly = ['@stripe/stripe-react-native', 'react-native-maps'];

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && nativeOnly.some((m) => moduleName === m || moduleName.startsWith(m + '/'))) {
    return { type: 'sourceFile', filePath: stubPath };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
