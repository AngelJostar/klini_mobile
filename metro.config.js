const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const defaultBlockList = config.resolver.blockList;

// Gradle creates Windows sockets in this temporary build folder, not app sources.
config.resolver.blockList = [
  ...(Array.isArray(defaultBlockList) ? defaultBlockList : defaultBlockList ? [defaultBlockList] : []),
  /[/\\]\.build-tmp(?:[/\\]|$)/,
];

module.exports = config;
