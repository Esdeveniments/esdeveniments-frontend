import React from 'react';
import { render } from '@testing-library/react';
import locationDiscoveryWidget from './index';

describe('locationDiscoveryWidget', () => {
  test('renders without crashing', () => {
    render(<locationDiscoveryWidget />);
  });
});
