//==============================================================================
// BACKSTAGE APP ESLINT CONFIGURATION
//==============================================================================

const config = require('@backstage/cli/config/eslint-factory')(__dirname);

config.rules = {
  ...config.rules,
  'spaced-comment': 'off',
};

module.exports = config;
