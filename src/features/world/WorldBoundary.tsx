import { Component, type ReactNode } from 'react'
export class WorldBoundary extends Component<{ children: ReactNode; onError: () => void; fallback?:ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? this.props.fallback??null : this.props.children }
}
