import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary elkapott egy kezeletlen renderelési hibát:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 sm:p-8 max-w-xl mx-auto my-8 glass-card border-rose-500/40 bg-gradient-to-br from-[#180e12]/95 via-[#131722]/90 to-[#1e1708]/85 text-center space-y-4 shadow-2xl rounded-2xl animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400 shadow-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-serif font-bold text-lg sm:text-xl text-white">
              Átmeneti Megjelenítési Hiba
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              A nézet renderelése során váratlan hiba lépett fel. Az adataid és a ruhatárad biztonságban vannak.
            </p>
          </div>

          {this.state.error?.message && (
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-rose-300 text-left overflow-x-auto max-h-24">
              {this.state.error.message}
            </div>
          )}

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="btn-gold py-2 px-5 text-xs flex items-center gap-1.5 shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Nézet Újratöltése</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
