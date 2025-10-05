import React from 'react';
import { render } from '@testing-library/react';
import viewCounter from './index';

describe('viewCounter', () => {
  test('renders without crashing', () => {
    render(<viewCounter />);
  });
});
