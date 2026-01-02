import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const Privacy = () => {
  return (
    <div className="min-h-screen bg-[#030303] text-white p-6">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to app
        </Link>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: January 1, 2026</p>

        <div className="space-y-8 text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
            <p className="leading-relaxed">
              This Privacy Policy explains how Briefing ("we", "us", or "our") collects, uses, and protects
              your personal information when you use our sports betting tracking application ("the App").
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">Account Information</h3>
            <p className="leading-relaxed mb-2">When you sign in with Google, we receive:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Your name</li>
              <li>Email address</li>
              <li>Profile picture (if available)</li>
              <li>Google account ID (for authentication)</li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">Betting Data</h3>
            <p className="leading-relaxed mb-2">Information you voluntarily enter into the App:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Bet details (sport, teams, odds, stake, etc.)</li>
              <li>Bankroll transactions (deposits, withdrawals)</li>
              <li>Favorite teams and preferences</li>
              <li>App settings and configurations</li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">Usage Data</h3>
            <p className="leading-relaxed mb-2">We may collect:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Device information (browser type, operating system)</li>
              <li>Usage patterns and feature interactions</li>
              <li>Error logs for debugging purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <p className="leading-relaxed mb-2">We use your information to:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Provide and maintain the App's functionality</li>
              <li>Sync your data across devices</li>
              <li>Calculate betting statistics and analytics</li>
              <li>Improve and optimize the App</li>
              <li>Communicate with you about the service (if necessary)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Storage and Security</h2>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-4">
              <p className="text-emerald-400 font-medium mb-2">Secure Storage</p>
              <p className="text-gray-300 text-sm leading-relaxed">
                Your data is stored securely using Supabase, a trusted database platform with
                enterprise-grade security. All data is encrypted in transit and at rest.
              </p>
            </div>
            <p className="leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal data
              against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Sharing</h2>
            <p className="leading-relaxed mb-2">We do not sell your personal data. We may share data with:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li><strong>Service Providers:</strong> Supabase (database), Google (authentication)</li>
              <li><strong>Legal Requirements:</strong> If required by law or to protect our rights</li>
            </ul>
            <p className="leading-relaxed mt-4">
              We do not share your betting data with sportsbooks, advertisers, or any third parties for
              marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights</h2>
            <p className="leading-relaxed mb-2">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Export:</strong> Download your betting data</li>
            </ul>
            <p className="leading-relaxed mt-4">
              To exercise these rights, please contact us at{' '}
              <a href="mailto:privacy@briefingapp.com" className="text-emerald-400 hover:underline">
                privacy@briefingapp.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Data Retention</h2>
            <p className="leading-relaxed">
              We retain your data for as long as your account is active. If you delete your account,
              we will delete your personal data within 30 days, except where we are required to retain
              it for legal purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Cookies and Local Storage</h2>
            <p className="leading-relaxed">
              We use local storage to save your preferences and session information. We do not use
              tracking cookies for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Children's Privacy</h2>
            <p className="leading-relaxed">
              The App is not intended for users under 18 years of age (or the legal gambling age in
              your jurisdiction). We do not knowingly collect personal information from minors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Changes to This Policy</h2>
            <p className="leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any significant
              changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Contact Us</h2>
            <p className="leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:{' '}
              <a href="mailto:privacy@briefingapp.com" className="text-emerald-400 hover:underline">
                privacy@briefingapp.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <Link to="/terms" className="text-emerald-400 hover:underline">
            View Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
};
