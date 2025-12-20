import { useAuth } from '../../context/AuthContext';
import { BarChart3, DollarSign, Zap, TrendingUp } from 'lucide-react';

export const SignIn = () => {
  const { signInWithGoogle, loading } = useAuth();

  const features = [
    {
      icon: Zap,
      title: 'Live Scores',
      description: 'Real-time updates across all major sports'
    },
    {
      icon: TrendingUp,
      title: 'Prop Tracking',
      description: 'Automatic stat updates for your player props'
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'Track win rate, ROI, and profit over time'
    },
    {
      icon: DollarSign,
      title: 'Bankroll',
      description: 'Monitor deposits, withdrawals, and balance'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl mb-6">
            <span className="text-3xl font-bold">B</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Briefing</h1>
          <p className="text-gray-400">Your sports betting companion</p>
        </div>

        {/* Sign in card */}
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 mb-6">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white text-black font-medium transition-colors hover:bg-gray-100 disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {loading ? 'Checking session...' : 'Continue with Google'}
          </button>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-[#111111] border border-[#222222] rounded-xl p-4"
            >
              <feature.icon className="w-5 h-5 text-green-400 mb-2" />
              <h3 className="font-medium text-sm mb-1">{feature.title}</h3>
              <p className="text-xs text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-600 text-center mt-6">
          By signing in, you agree to our terms of service
        </p>
      </div>
    </div>
  );
};
