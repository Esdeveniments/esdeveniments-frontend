import React from 'react';
import { render } from '@testing-library/react';
import serverEventsCategorized from './index';

describe('serverEventsCategorized', () => {
  test('renders without crashing', () => {
    render(<serverEventsCategorized />);
  });
});
