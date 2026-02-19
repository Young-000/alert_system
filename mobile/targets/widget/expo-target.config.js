/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'CommuteWidget',
  bundleIdentifier: '.widget',
  deploymentTarget: '16.1',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
  entitlements: {
    'com.apple.security.application-groups': [
      'group.com.commutemate.app',
    ],
    'keychain-access-groups': [
      '$(AppIdentifierPrefix)group.com.commutemate.app',
    ],
  },
  infoPlist: {
    NSSupportsLiveActivities: true,
  },
};
