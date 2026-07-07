// Temporary web stub for native-only modules (react-native-maps, stripe)
// so the app can be bundled and previewed in a browser.
const React = require('react');
const { View, Text } = require('react-native');

const MapStub = ({ children, style }) =>
  React.createElement(
    View,
    { style: [{ backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' }, style] },
    React.createElement(Text, { style: { color: '#2563EB' } }, 'Map (native only)'),
    children
  );

const Null = () => null;

module.exports = {
  __esModule: true,
  default: MapStub,
  Marker: Null,
  Polyline: Null,
  Callout: Null,
  Circle: Null,
  PROVIDER_GOOGLE: 'google',
  PROVIDER_DEFAULT: 'default',
  StripeProvider: ({ children }) => children ?? null,
  useStripe: () => ({}),
  useConfirmPayment: () => ({ confirmPayment: async () => ({ error: { message: 'stub' } }) }),
  initStripe: async () => {},
};
