import { Component } from 'react';

// Wraps the whole app at the root (see index.js). Without this, any
// uncaught render error in any component whitescreens the entire app with
// no way back except a manual URL edit — there's no route-level recovery
// once React unmounts everything above the crash. Styled with inline
// styles (not a CSS file) since this must render correctly even if a
// stylesheet failed to load — that's exactly the kind of failure this
// component exists to catch.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Uncaught render error:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
        padding: '24px', textAlign: 'center',
        background: '#0b0b0f', color: '#f2f2f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <div style={{ fontSize: '2rem' }}>Something went wrong</div>
        <p style={{ color: '#9a9aa5', maxWidth: '360px', fontSize: '0.95rem' }}>
          DoitHere hit an unexpected error. Try going back to the home screen —
          if it keeps happening, let us know.
        </p>
        <button
          onClick={this.handleReload}
          style={{
            padding: '12px 28px', borderRadius: '999px', border: 'none',
            background: '#4f7cff', color: '#fff', fontSize: '0.95rem',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          Back to home
        </button>
      </div>
    );
  }
}
