import React from 'react';
import { render } from '@testing-library/react';
import noEventsFound from './index';

describe('noEventsFound', () => {
  test('renders without crashing', () => {
    render(<noEventsFound />);
  });
});
