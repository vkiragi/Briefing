import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BarChart3, DollarSign, Zap, TrendingUp, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

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

  const sports = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'MLS', 'UFC', 'Boxing', 'F1', 'Tennis', 'Golf'];

  return (
    <div className="min-h-screen bg-[#030303] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient mesh */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-emerald-900/40 via-transparent to-transparent" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-green-900/30 via-transparent to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
        </div>

        {/* Floating orbs with animation */}
        <motion.div
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-[15%] w-72 h-72 bg-emerald-500/30 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            y: [0, 40, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-20 right-[10%] w-96 h-96 bg-green-600/25 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, 20, 0],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/2 left-[5%] w-64 h-64 bg-teal-500/20 rounded-full blur-[80px]"
        />

        {/* Subtle noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Diagonal accent lines */}
        <div className="absolute inset-0 overflow-hidden opacity-[0.03]">
          <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] rotate-12">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                style={{
                  top: `${i * 10}%`,
                  left: 0,
                  right: 0,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo and Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-12"
        >
          {/* Animated logo */}
          <div className="relative inline-flex items-center justify-center mb-8">
            {/* Glow ring */}
            <div className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl blur-xl opacity-50 animate-pulse" />
            {/* Logo container */}
            <div className="relative w-20 h-20 bg-gradient-to-br from-green-400 via-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/25">
              <span className="text-4xl font-black tracking-tight">B</span>
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
            Welcome to Briefing
          </h1>
          <p className="text-gray-400 text-lg">Your intelligent sports betting companion</p>
        </motion.div>

        {/* Sign in card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative mb-8"
        >
          {/* Card glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-teal-500/20 rounded-2xl blur opacity-75" />

          <div className="relative bg-[#0c0c0c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <p className="text-sm text-gray-400 text-center mb-6">
              Sign in to sync your bets and track your performance
            </p>

            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="group w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white text-black font-semibold transition-all duration-300 hover:bg-gray-50 hover:scale-[1.02] hover:shadow-xl hover:shadow-white/10 disabled:opacity-60 disabled:hover:scale-100"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>{loading ? 'Checking session...' : 'Continue with Google'}</span>
              <ChevronRight size={18} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
            </button>
          </div>
        </motion.div>

        {/* Sports ticker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-8"
        >
          <p className="text-xs text-gray-500 text-center mb-3 uppercase tracking-wider">Supported Sports</p>
          <div className="flex flex-wrap justify-center gap-2">
            {sports.map((sport, index) => (
              <motion.span
                key={sport}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.05, duration: 0.3 }}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors cursor-default"
              >
                {sport}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* Features grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="grid grid-cols-2 gap-3"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
              className="group relative"
            >
              {/* Hover glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/0 to-green-500/0 group-hover:from-emerald-500/20 group-hover:to-green-500/20 rounded-xl blur transition-all duration-500 opacity-0 group-hover:opacity-100" />

              <div className="relative bg-[#0c0c0c]/80 backdrop-blur border border-white/5 group-hover:border-white/10 rounded-xl p-4 transition-all duration-300 group-hover:bg-[#0f0f0f]">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/10 flex items-center justify-center mb-3 group-hover:from-emerald-500/30 group-hover:to-green-500/20 transition-all duration-300">
                  <feature.icon className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="font-semibold text-sm mb-1 text-white/90">{feature.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Testimonial / Social proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-[10px] font-bold ring-2 ring-[#030303]">V</div>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-[10px] font-bold ring-2 ring-[#030303]">M</div>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-[10px] font-bold ring-2 ring-[#030303]">J</div>
            </div>
            <span className="text-xs text-gray-400">Trusted by sports bettors</span>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="text-xs text-gray-500 text-center mt-6"
        >
          By signing in, you agree to our{' '}
          <Link to="/terms" className="text-gray-400 hover:text-emerald-400 underline transition-colors">
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-gray-400 hover:text-emerald-400 underline transition-colors">
            Privacy Policy
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};
