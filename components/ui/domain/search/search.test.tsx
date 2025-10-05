import React from 'react';
import { render } from '@testing-library/react';
import search from './index';

describe('search', () => {
  test('renders without crashing', () => {
    render(<search />);
  });
});
