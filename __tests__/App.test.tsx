/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-permissions', () => ({
  RESULTS: {
    GRANTED: 'granted',
    LIMITED: 'limited',
    DENIED: 'denied',
  },
  check: jest.fn(async () => 'granted'),
  request: jest.fn(async () => 'granted'),
}));

jest.mock('react-native-sensors', () => ({
  SensorTypes: {accelerometer: 'accelerometer'},
  setUpdateIntervalForType: jest.fn(),
  accelerometer: {
    subscribe: jest.fn(() => ({unsubscribe: jest.fn()})),
  },
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
