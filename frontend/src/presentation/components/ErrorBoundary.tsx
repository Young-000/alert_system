import type { ReactNode } from 'react';
import { Component } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="page">
          <section className="error-page">
            <div className="error-content">
              <div className="error-code" style={{ fontSize: '4rem' }}>!</div>
              <h1>문제가 발생했습니다</h1>
              <p className="muted">
                예상치 못한 오류가 발생했습니다.
                <br />
                잠시 후 다시 시도해주세요.
              </p>
              <div className="error-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={this.handleRetry}
                >
                  다시 시도
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => window.location.href = '/'}
                >
                  홈으로
                </button>
              </div>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
