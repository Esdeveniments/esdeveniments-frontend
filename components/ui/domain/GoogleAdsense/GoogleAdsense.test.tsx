import React from 'react';
import { render } from '@testing-library/react';
import GoogleAdsense from './index';

describe('GoogleAdsense', () => {
  test('renders without crashing', () => {
    render(<GoogleAdsense />);
  });
});
