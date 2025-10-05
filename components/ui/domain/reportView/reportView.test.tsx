import React from 'react';
import { render } from '@testing-library/react';
import reportView from './index';

describe('reportView', () => {
  test('renders without crashing', () => {
    render(<reportView />);
  });
});
