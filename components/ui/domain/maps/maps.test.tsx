import React from 'react';
import { render } from '@testing-library/react';
import maps from './index';

describe('maps', () => {
  test('renders without crashing', () => {
    render(<maps />);
  });
});
