import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] caught error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div style={{
          padding: 24,
          borderRadius: 8,
          background: '#1a1f23',
          border: '1px solid #3a4147',
          color: '#f3f5f7',
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          <h3 style={{ margin: '0 0 12px', color: '#ff6b6b', fontSize: 15 }}>组件渲染出错</h3>
          <p style={{ margin: '0 0 8px', color: '#8c96a1' }}>该面板发生错误，已自动隔离。您可以尝试刷新页面恢复。</p>
          <pre style={{
            margin: 0,
            padding: 12,
            borderRadius: 4,
            background: '#101112',
            fontSize: 11,
            color: '#8c96a1',
            overflow: 'auto',
            maxHeight: 200,
          }}>
            {this.state.error?.message}
          </pre>
          <button
            style={{
              marginTop: 12,
              padding: '6px 16px',
              borderRadius: 4,
              border: 'none',
              background: '#3a4147',
              color: '#f3f5f7',
              fontSize: 12,
              cursor: 'pointer',
            }}
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
