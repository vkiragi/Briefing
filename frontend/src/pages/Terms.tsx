import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const Terms = () => {
  return (
    <div className="min-h-[100dvh] bg-[#030303] text-white px-6 pb-10 overflow-auto pt-[calc(env(safe-area-inset-top,20px)+24px)]">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to app
        </Link>

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: January 1, 2026</p>

        <div className="space-y-8 text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p className="leading-relaxed">
              By accessing or using Briefing ("the App"), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
            <p className="leading-relaxed">
              Briefing is a sports betting tracking and analytics tool. The App allows users to:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>Track sports bets and wagers</li>
              <li>View live scores and game information</li>
              <li>Analyze betting performance and statistics</li>
              <li>Manage bankroll and betting history</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Important Disclaimers</h2>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
              <p className="text-yellow-400 font-medium mb-2">Not Gambling Advice</p>
              <p className="text-gray-300 text-sm leading-relaxed">
                Briefing is a tracking and informational tool only. We do not provide gambling advice,
                betting tips, or recommendations. All betting decisions are made solely by you at your own risk.
              </p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 font-medium mb-2">Gambling Risks</p>
              <p className="text-gray-300 text-sm leading-relaxed">
                Sports betting involves financial risk. You may lose money. Never bet more than you can
                afford to lose. If you or someone you know has a gambling problem, please contact the
                National Problem Gambling Helpline at 1-800-522-4700.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. User Responsibilities</h2>
            <p className="leading-relaxed mb-2">You agree to:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Comply with all applicable laws regarding sports betting in your jurisdiction</li>
              <li>Be at least 18 years old (or the legal gambling age in your jurisdiction)</li>
              <li>Provide accurate information when using the App</li>
              <li>Keep your account credentials secure</li>
              <li>Use the App for personal, non-commercial purposes only</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Not a Sportsbook</h2>
            <p className="leading-relaxed">
              Briefing is not a sportsbook, gambling operator, or betting platform. We do not accept bets,
              process wagers, or handle any gambling transactions. The App is solely for tracking bets you
              place with third-party sportsbooks. We are not affiliated with any sportsbook or gambling operator.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Data Accuracy</h2>
            <p className="leading-relaxed">
              While we strive to provide accurate sports data and scores, we make no guarantees about the
              accuracy, completeness, or timeliness of any information displayed in the App. Live scores
              and statistics are provided by third-party sources and may be delayed or contain errors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Limitation of Liability</h2>
            <p className="leading-relaxed">
              To the maximum extent permitted by law, Briefing and its creators shall not be liable for
              any direct, indirect, incidental, special, consequential, or punitive damages arising from
              your use of the App, including but not limited to any losses from gambling activities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Modifications to Service</h2>
            <p className="leading-relaxed">
              We reserve the right to modify, suspend, or discontinue the App at any time without notice.
              We may also update these Terms of Service from time to time. Continued use of the App after
              changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Termination</h2>
            <p className="leading-relaxed">
              We reserve the right to terminate or suspend your access to the App at our sole discretion,
              without notice, for conduct that we believe violates these Terms or is harmful to other users,
              us, or third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Contact</h2>
            <p className="leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:support@briefingapp.com" className="text-emerald-400 hover:underline">
                support@briefingapp.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <Link to="/privacy" className="text-emerald-400 hover:underline">
            View Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
};
