import React from 'react';
import { render } from '@testing-library/react';
import hybridEventsList from './index';

describe('hybridEventsList', () => {
  test('renders without crashing', () => {
    render(<hybridEventsList />);
  });
});
