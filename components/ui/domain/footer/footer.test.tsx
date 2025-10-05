import React from 'react';
import { render } from '@testing-library/react';
import footer from './index';

describe('footer', () => {
  test('renders without crashing', () => {
    render(<footer />);
  });
});
