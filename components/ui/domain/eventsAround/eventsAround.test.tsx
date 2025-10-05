import React from 'react';
import { render } from '@testing-library/react';
import eventsAround from './index';

describe('eventsAround', () => {
  test('renders without crashing', () => {
    render(<eventsAround />);
  });
});
