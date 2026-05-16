/**
 * @jest-environment jsdom
 */
import { render, cleanup } from '@testing-library/react';
import { IsoflowErrorBoundary } from '../IsoflowErrorBoundary';

afterEach(() => {
  cleanup();
});

const Bomb = () => {
  throw new Error('boom');
};

describe('IsoflowErrorBoundary', () => {
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
      <IsoflowErrorBoundary>
        <span>safe</span>
      </IsoflowErrorBoundary>
    );
    expect(getByText('safe')).toBeTruthy();
  });

  test('renders default fallback on render error', () => {
    const { getByRole } = render(
      <IsoflowErrorBoundary>
        <Bomb />
      </IsoflowErrorBoundary>
    );
    expect(getByRole('alert').textContent).toContain('Editor failed to load');
  });

  test('renders custom fallback when provided', () => {
    const { getByText } = render(
      <IsoflowErrorBoundary fallback={<span>custom-fallback</span>}>
        <Bomb />
      </IsoflowErrorBoundary>
    );
    expect(getByText('custom-fallback')).toBeTruthy();
  });

  test('invokes onError callback', () => {
    const onError = jest.fn();
    render(
      <IsoflowErrorBoundary onError={onError}>
        <Bomb />
      </IsoflowErrorBoundary>
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((onError.mock.calls[0][0] as Error).message).toBe('boom');
  });
});
