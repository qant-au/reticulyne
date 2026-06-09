/**
 * @jest-environment jsdom
 */
import { render, cleanup } from '@testing-library/react';
import { ReticulyneErrorBoundary } from '../ReticulyneErrorBoundary';

afterEach(() => {
  cleanup();
});

const Bomb = () => {
  throw new Error('boom');
};

describe('ReticulyneErrorBoundary', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      return undefined;
    });
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  test('renders children when no error', () => {
    const { getByText } = render(
      <ReticulyneErrorBoundary>
        <span>safe</span>
      </ReticulyneErrorBoundary>
    );
    expect(getByText('safe')).toBeTruthy();
  });

  test('renders default fallback on render error', () => {
    const { getByRole } = render(
      <ReticulyneErrorBoundary>
        <Bomb />
      </ReticulyneErrorBoundary>
    );
    expect(getByRole('alert').textContent).toContain('Editor failed to load');
  });

  test('renders custom fallback when provided', () => {
    const { getByText } = render(
      <ReticulyneErrorBoundary fallback={<span>custom-fallback</span>}>
        <Bomb />
      </ReticulyneErrorBoundary>
    );
    expect(getByText('custom-fallback')).toBeTruthy();
  });

  test('invokes onError callback', () => {
    const onError = jest.fn();
    render(
      <ReticulyneErrorBoundary onError={onError}>
        <Bomb />
      </ReticulyneErrorBoundary>
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((onError.mock.calls[0][0] as Error).message).toBe('boom');
  });
});
