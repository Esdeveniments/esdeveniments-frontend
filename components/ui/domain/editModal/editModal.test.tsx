import React from 'react';
import { render } from '@testing-library/react';
import editModal from './index';

describe('editModal', () => {
  test('renders without crashing', () => {
    render(<editModal />);
  });
});
