import React from 'react';
import { render } from '@testing-library/react';
import navbar from './index';

describe('navbar', () => {
  test('renders without crashing', () => {
    render(<navbar />);
  });
});
