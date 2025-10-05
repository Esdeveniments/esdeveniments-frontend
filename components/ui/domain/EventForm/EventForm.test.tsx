import React from 'react';
import { render } from '@testing-library/react';
import EventForm from './index';

describe('EventForm', () => {
  test('renders without crashing', () => {
    render(<EventForm />);
  });
});
