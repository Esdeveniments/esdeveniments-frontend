import React from 'react';
import { render } from '@testing-library/react';
import filtersModal from './index';

describe('filtersModal', () => {
  test('renders without crashing', () => {
    render(<filtersModal />);
  });
});
