import React from 'react';
import { render } from '@testing-library/react';
import newsHeroEvent from './index';

describe('newsHeroEvent', () => {
  test('renders without crashing', () => {
    render(<newsHeroEvent />);
  });
});
