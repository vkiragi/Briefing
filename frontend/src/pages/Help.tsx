import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import {
  ArrowLeft,
  Zap,
  TrendingUp,
  BarChart3,
  Heart,
  Pin,
  Ticket,
  Trophy,
  Target,
  Clock,
  Star,
  Layers,
  MousePointer,
  Bell,
  Calendar,
  Users,
  DollarSign,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';

interface FeatureSection {
  title: string;
  icon: React.ElementType;
  description: string;
  features: {
    name: string;
    description: string;
    tip?: string;
  }[];
}

const featureSections: FeatureSection[] = [
  {
    title: 'Live Scores & Games',
    icon: Zap,
    description: 'Real-time updates across 20+ sports leagues',
    features: [
      {
        name: 'Multi-Sport Dashboard',
        description: 'View live scores from NFL, NBA, MLB, NHL, NCAAF, NCAAB, MLS, UFC, Boxing, F1, Tennis, Golf, and more.',
        tip: 'Use the sport tabs at the top of the dashboard to switch between leagues.',
      },
      {
        name: 'Game Detail Modal',
        description: 'Click any game card to see detailed box scores, player stats, quarter/period breakdowns, and play-by-play.',
        tip: 'Click on player stats to quickly add them to your bet slip!',
      },
      {
        name: 'Date Navigation',
        description: 'Browse scores from any date using the date navigator. Jump to specific dates or use arrows to move day by day.',
      },
      {
        name: 'NFL Week View',
        description: 'For NFL games, navigate by week number to see the full week\'s matchups at once.',
      },
    ],
  },
  {
    title: 'Pinned Games',
    icon: Pin,
    description: 'Keep important games front and center',
    features: [
      {
        name: 'Pin Your Games',
        description: 'Click the pin icon on any game card to add it to your pinned games section at the top of the dashboard.',
        tip: 'Pinned games show live play-by-play updates and win probability.',
      },
      {
        name: 'Live Updates',
        description: 'Pinned games automatically refresh to show the latest score, clock, and last play.',
      },
      {
        name: 'Quick Access',
        description: 'Click a pinned game to instantly open its full game detail modal.',
      },
      {
        name: 'Auto-Cleanup',
        description: 'Finished games are automatically removed from your pinned list after the game ends.',
      },
    ],
  },
  {
    title: 'Favorite Teams',
    icon: Heart,
    description: 'Track your teams across all sports',
    features: [
      {
        name: 'Add Favorites',
        description: 'Go to Settings and search for any team to add them to your favorites.',
        tip: 'Your favorite teams appear in a dedicated section on the dashboard.',
      },
      {
        name: 'Last & Next Game',
        description: 'See your favorite teams\' most recent result and upcoming game at a glance.',
      },
      {
        name: 'Cross-Device Sync',
        description: 'Your favorite teams sync across all your devices when logged in.',
      },
    ],
  },
  {
    title: 'Bet Tracking',
    icon: Ticket,
    description: 'Log and manage all your wagers',
    features: [
      {
        name: 'Multiple Bet Types',
        description: 'Track moneylines, spreads, totals, player props, period bets, futures, and custom bets.',
      },
      {
        name: 'Quick Add from Box Score',
        description: 'Click any player stat in a game\'s box score to instantly add it to your bet slip with the current value as the line.',
        tip: 'Click on a team name in the box score to add a moneyline bet!',
      },
      {
        name: 'Parlay Builder',
        description: 'Build multi-leg parlays by adding bets from different games. The floating button shows your current parlay.',
        tip: 'Add legs from multiple games to build cross-sport parlays.',
      },
      {
        name: 'Player Search',
        description: 'When adding player props, search for players by name with autocomplete suggestions.',
      },
    ],
  },
  {
    title: 'Prop Tracker',
    icon: Target,
    description: 'Live tracking for your player props',
    features: [
      {
        name: 'Automatic Stat Updates',
        description: 'Your pending player props automatically update with live stats during games.',
        tip: 'The progress bar shows how close the player is to hitting the line.',
      },
      {
        name: 'Visual Progress',
        description: 'See a progress bar showing current value vs. your bet line. Green when hitting, red when under.',
      },
      {
        name: 'Game Context',
        description: 'Each prop shows the current game clock, quarter, and game status.',
      },
      {
        name: 'Parlay Leg Tracking',
        description: 'Parlay legs with player props also show individual leg progress.',
      },
    ],
  },
  {
    title: 'Analytics & Stats',
    icon: BarChart3,
    description: 'Deep insights into your betting performance',
    features: [
      {
        name: 'Win Rate & ROI',
        description: 'Track your overall win rate, return on investment, and total profit/loss.',
      },
      {
        name: 'Sport Breakdown',
        description: 'See which sports you perform best in with per-sport win rate stats.',
      },
      {
        name: 'Bet Type Analysis',
        description: 'Compare performance across different bet types (moneyline, spread, props, etc.).',
      },
      {
        name: 'Calendar View',
        description: 'Visual calendar showing your daily betting activity and results.',
        tip: 'Click any day to see all bets placed on that date.',
      },
      {
        name: 'Cumulative Charts',
        description: 'Line charts showing your wins/losses over time to identify trends.',
      },
      {
        name: 'Biggest Win/Loss',
        description: 'Quick stats showing your best and worst bets.',
      },
    ],
  },
  {
    title: 'Bet History',
    icon: Clock,
    description: 'Complete record of all your bets',
    features: [
      {
        name: 'Filter & Search',
        description: 'Filter bets by status (pending, won, lost), sport, bet type, or date range.',
      },
      {
        name: 'Edit Bets',
        description: 'Update bet details, change status, or add notes to any bet.',
      },
      {
        name: 'Delete Bets',
        description: 'Remove bets you no longer want to track.',
      },
      {
        name: 'Parlay Details',
        description: 'Expand parlays to see all individual legs and their statuses.',
      },
    ],
  },
  {
    title: 'Standings & Results',
    icon: Trophy,
    description: 'League standings and team records',
    features: [
      {
        name: 'Team Records',
        description: 'NBA game cards show team win-loss records next to team names.',
        tip: 'More sports standings coming soon!',
      },
      {
        name: 'Division/Conference View',
        description: 'Standings organized by division and conference where applicable.',
      },
    ],
  },
];

const quickTips = [
  {
    icon: MousePointer,
    tip: 'Click player stats in box scores to quickly add prop bets',
  },
  {
    icon: Layers,
    tip: 'Build parlays by adding legs from multiple game modals',
  },
  {
    icon: Pin,
    tip: 'Pin games to see live play-by-play at the top of your dashboard',
  },
  {
    icon: Target,
    tip: 'Prop tracker shows live progress toward your betting lines',
  },
  {
    icon: Calendar,
    tip: 'Use the calendar in Analytics to review past betting days',
  },
  {
    icon: Star,
    tip: 'Add favorite teams in Settings for quick access to their games',
  },
];

export const Help = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter feature sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return featureSections;

    const query = searchQuery.toLowerCase();
    return featureSections
      .map(section => {
        // Check if section title or description matches
        const sectionMatches =
          section.title.toLowerCase().includes(query) ||
          section.description.toLowerCase().includes(query);

        // Filter features within section
        const matchingFeatures = section.features.filter(
          feature =>
            feature.name.toLowerCase().includes(query) ||
            feature.description.toLowerCase().includes(query) ||
            (feature.tip && feature.tip.toLowerCase().includes(query))
        );

        // If section title matches, return all features; otherwise return only matching features
        if (sectionMatches) {
          return section;
        } else if (matchingFeatures.length > 0) {
          return { ...section, features: matchingFeatures };
        }
        return null;
      })
      .filter((section): section is FeatureSection => section !== null);
  }, [searchQuery]);

  // Filter quick tips based on search query
  const filteredTips = useMemo(() => {
    if (!searchQuery.trim()) return quickTips;

    const query = searchQuery.toLowerCase();
    return quickTips.filter(item => item.tip.toLowerCase().includes(query));
  }, [searchQuery]);

  const hasResults = filteredSections.length > 0 || filteredTips.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-4 md:p-8"
    >
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-accent/20 to-accent/5 rounded-2xl flex items-center justify-center">
            <Bell size={28} className="text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Help & Features</h1>
            <p className="text-gray-400">Everything you can do with Briefing</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search features, tips, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-11 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={16} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* No Results Message */}
      {searchQuery && !hasResults && (
        <div className="max-w-4xl mx-auto mb-10">
          <Card className="p-8 text-center">
            <Search size={40} className="text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No results found</h3>
            <p className="text-gray-400 text-sm">
              No features or tips match "{searchQuery}". Try a different search term.
            </p>
          </Card>
        </div>
      )}

      {/* Quick Tips */}
      {filteredTips.length > 0 && (
        <div className="max-w-4xl mx-auto mb-10">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap size={20} className="text-accent" />
              Quick Tips
              {searchQuery && (
                <span className="text-xs font-normal text-gray-500 ml-2">
                  ({filteredTips.length} result{filteredTips.length !== 1 ? 's' : ''})
                </span>
              )}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTips.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 p-3 bg-white/5 rounded-lg"
                >
                  <item.icon size={18} className="text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">{item.tip}</span>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Feature Sections */}
      {filteredSections.length > 0 && (
        <div className="max-w-4xl mx-auto space-y-6">
          {searchQuery && (
            <p className="text-sm text-gray-500">
              {filteredSections.length} section{filteredSections.length !== 1 ? 's' : ''} found
            </p>
          )}
          {filteredSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.1 }}
            >
              <Card className="overflow-hidden">
                {/* Section Header */}
                <div className="p-5 border-b border-border bg-gradient-to-r from-accent/10 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                      <section.icon size={22} className="text-accent" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{section.title}</h2>
                      <p className="text-sm text-gray-400">{section.description}</p>
                    </div>
                  </div>
                </div>

                {/* Features List */}
                <div className="p-5 space-y-4">
                  {section.features.map((feature, featureIndex) => (
                    <div
                      key={feature.name}
                      className="pl-4 border-l-2 border-accent/30"
                    >
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <ChevronRight size={16} className="text-accent" />
                        {feature.name}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1 ml-6">
                        {feature.description}
                      </p>
                      {feature.tip && (
                        <div className="mt-2 ml-6 px-3 py-2 bg-accent/10 rounded-lg border border-accent/20">
                          <p className="text-xs text-accent flex items-start gap-2">
                            <Star size={12} className="flex-shrink-0 mt-0.5" />
                            <span>{feature.tip}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Supported Sports - show when no search or when searching for sport-related terms */}
      {(!searchQuery || 'sports leagues supported'.includes(searchQuery.toLowerCase()) ||
        ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'MLS', 'UFC', 'Boxing', 'F1', 'Tennis', 'Golf', 'EPL', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1']
          .some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
      ) && (
        <div className="max-w-4xl mx-auto mt-10">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users size={20} className="text-accent" />
              Supported Sports & Leagues
            </h2>
            <div className="flex flex-wrap gap-2">
              {['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'MLS', 'UFC', 'Boxing', 'F1', 'Tennis', 'Golf', 'EPL', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'].map(
                (sport) => (
                  <span
                    key={sport}
                    className={`px-3 py-1.5 border rounded-full text-sm transition-colors ${
                      searchQuery && sport.toLowerCase().includes(searchQuery.toLowerCase())
                        ? 'bg-accent/20 border-accent text-accent'
                        : 'bg-white/5 border-white/10 text-gray-300'
                    }`}
                  >
                    {sport}
                  </span>
                )
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Contact / Feedback - only show when not searching */}
      {!searchQuery && (
        <div className="max-w-4xl mx-auto mt-10 mb-8">
          <Card className="p-5 bg-gradient-to-r from-accent/10 to-transparent">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <DollarSign size={24} className="text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Questions or Feedback?</h3>
                <p className="text-sm text-gray-400 mb-3">
                  We're always looking to improve Briefing. If you have suggestions, found a bug,
                  or need help with something not covered here, reach out!
                </p>
                <a
                  href="mailto:support@briefingapp.com"
                  className="inline-flex items-center gap-2 text-accent hover:underline text-sm"
                >
                  support@briefingapp.com
                  <ChevronRight size={14} />
                </a>
              </div>
            </div>
          </Card>
        </div>
      )}
    </motion.div>
  );
};
