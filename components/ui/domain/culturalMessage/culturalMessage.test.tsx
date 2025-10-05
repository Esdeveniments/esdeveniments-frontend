import React from 'react';
import { render } from '@testing-library/react';
import culturalMessage from './index';

describe('culturalMessage', () => {
  test('renders without crashing', () => {
    render(<culturalMessage />);
  });
});
