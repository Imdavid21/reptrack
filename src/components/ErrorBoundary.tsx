import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Catches render-time errors so one broken screen can't take down the whole
 * app with a blank white page. Offers the user a way to recover.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('Render error caught by ErrorBoundary:', error);
  }

  private handleReload = () => {
    // Clear the error and force a fresh mount.
    this.setState({ hasError: false, error: undefined });
    window.location.assign('/app');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6">
          <div className="text-center max-w-sm">
            <div className="text-lg font-bold mb-2">Something went wrong</div>
            <p className="text-sm text-muted-foreground mb-6">
              This screen hit an unexpected error. Your saved data is safe - let's get you back.
            </p>
            <button
              onClick={this.handleReload}
              className="btn-brutalist btn-primary px-6 py-3 text-sm font-bold"
            >
              Back to home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
