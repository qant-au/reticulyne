import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box } from '@mui/material';

interface Props {
  children: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ReticulyneErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, info);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        '[reticulyne] Render error caught by ErrorBoundary:',
        error
      );
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      return (
        <Box
          role="alert"
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
            fontFamily: 'sans-serif',
            fontSize: 14,
            p: 2,
            textAlign: 'center'
          }}
        >
          Editor failed to load. Reload the page to retry.
        </Box>
      );
    }
    return this.props.children;
  }
}
