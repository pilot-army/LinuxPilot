import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { Button } from './button';
import styles from './error-boundary.module.css';

type ErrorBoundaryProps = {
  children: ReactNode;
  title: string;
  body: string;
  retryLabel: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
  resetKey: number;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, resetKey: 0 };

  static getDerivedStateFromError(): Pick<ErrorBoundaryState, 'hasError'> {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('LinuxPilot UI crashed', error, info.componentStack);
  }

  private retry = () => {
    this.setState((current) => ({ hasError: false, resetKey: current.resetKey + 1 }));
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className={styles.wrap} role="alert">
          <div className={styles.card}>
            <h1 className={styles.title}>{this.props.title}</h1>
            <p className={styles.body}>{this.props.body}</p>
            <Button variant="secondary" onClick={this.retry}>
              {this.props.retryLabel}
            </Button>
          </div>
        </div>
      );
    }

    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>;
  }
}

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  const { messages } = useI18n();
  return (
    <ErrorBoundary
      title={messages.common.crash.title}
      body={messages.common.crash.body}
      retryLabel={messages.common.crash.retry}
    >
      {children}
    </ErrorBoundary>
  );
}
