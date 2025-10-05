import React from 'react';
import { render } from '@testing-library/react';
import noEventFound from './index';

describe('noEventFound', () => {
  test('renders without crashing', () => {
    render(<noEventFound />);
  });
});
