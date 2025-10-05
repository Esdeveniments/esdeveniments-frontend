import React from 'react';
import { render } from '@testing-library/react';
import newsCta from './index';

describe('newsCta', () => {
  test('renders without crashing', () => {
    render(<newsCta />);
  });
});
