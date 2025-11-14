const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Resolve streamdown-rn to ../src directory
const projectRoot = __dirname;
const sourceRoot = path.resolve(projectRoot, '../src');
const parentNodeModules = path.resolve(projectRoot, '../node_modules');

// Add streamdown-rn to extraNodeModules so Metro can resolve it
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'streamdown-rn': sourceRoot,
};

// Also resolve from parent node_modules for shared dependencies
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  parentNodeModules,
];

// Add woff2 to asset extensions for font loading
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'woff2',
];

// Ensure source files are watched for hot reloading
config.watchFolders = [
  sourceRoot,
];

module.exports = config;

