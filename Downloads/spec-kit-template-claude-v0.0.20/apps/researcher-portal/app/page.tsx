'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Users, FileText, Shield, BarChart, Clock } from 'lucide-react';
import { api } from '@/lib/api';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.login({ email, password });
      console.log('Login successful:', response);
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-900 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mount Sinai Health System</h1>
                <p className="text-xs text-gray-600">Research Study Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <Link href="#features" className="text-gray-600 hover:text-gray-900">Features</Link>
              <Link href="#about" className="text-gray-600 hover:text-gray-900">About</Link>
              <Link href="#contact" className="text-gray-600 hover:text-gray-900">Contact</Link>
              <button className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800">
                Researcher Portal
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Advancing Medicine Through Research
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Streamline your clinical research with our comprehensive IRB submission tracking,
              participant enrollment, and clinical trial management platform.
            </p>
            <div className="flex space-x-4">
              <button className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 text-lg font-semibold">
                Get Started
              </button>
              <button className="border-2 border-blue-900 text-blue-900 px-6 py-3 rounded-lg hover:bg-blue-50 text-lg font-semibold">
                View Demo
              </button>
            </div>
            <div className="mt-8 flex items-center space-x-8">
              <div>
                <p className="text-3xl font-bold text-blue-900">250+</p>
                <p className="text-sm text-gray-600">Active Studies</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-900">10,000+</p>
                <p className="text-sm text-gray-600">Participants</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-900">50+</p>
                <p className="text-sm text-gray-600">Research Teams</p>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Researcher Login</h3>
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  placeholder="researcher@mountsinai.org"
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  placeholder="Enter your password"
                />
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-900 text-white py-3 rounded-lg hover:bg-blue-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
              <div className="mt-4 text-center">
                <Link href="/forgot-password" className="text-blue-900 hover:underline text-sm">
                  Forgot your password?
                </Link>
              </div>
            </form>
            <div className="mt-6 pt-6 border-t">
              <p className="text-xs text-gray-600 text-center">
                Test credentials: sarah.chen@mountsinai.org / Test123!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-gray-50 py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Comprehensive Research Management
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to manage clinical trials and research studies
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <FileText className="h-12 w-12 text-blue-900 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">IRB Submission Tracking</h3>
              <p className="text-gray-600">
                Streamline IRB submissions with automated workflows and real-time status tracking.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <Users className="h-12 w-12 text-blue-900 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Participant Enrollment</h3>
              <p className="text-gray-600">
                Electronic consent and enrollment tracking with HIPAA-compliant data management.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <Activity className="h-12 w-12 text-blue-900 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Clinical Trial Management</h3>
              <p className="text-gray-600">
                Multi-site trial coordination with budget tracking and team management tools.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <Shield className="h-12 w-12 text-blue-900 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">HIPAA Compliant</h3>
              <p className="text-gray-600">
                Enterprise-grade security with PHI encryption and comprehensive audit trails.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <BarChart className="h-12 w-12 text-blue-900 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Analytics & Reporting</h3>
              <p className="text-gray-600">
                Real-time dashboards and customizable reports for study performance metrics.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <Clock className="h-12 w-12 text-blue-900 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Automated Workflows</h3>
              <p className="text-gray-600">
                Protocol-driven task generation with automated reminders and notifications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-900 text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Research Management?
          </h2>
          <p className="text-xl mb-8">
            Join Mount Sinai researchers already using our platform
          </p>
          <button className="bg-white text-blue-900 px-8 py-3 rounded-lg hover:bg-gray-100 text-lg font-semibold">
            Request a Demo
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-bold mb-4">Mount Sinai Health System</h4>
              <p className="text-sm text-gray-400">
                Advancing Medicine Through Research
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/studies" className="hover:text-white">Studies</Link></li>
                <li><Link href="/participants" className="hover:text-white">Participants</Link></li>
                <li><Link href="/teams" className="hover:text-white">Research Teams</Link></li>
                <li><Link href="/irb" className="hover:text-white">IRB Portal</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link href="/docs" className="hover:text-white">Documentation</Link></li>
                <li><Link href="/training" className="hover:text-white">Training</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact IT</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <p className="text-sm text-gray-400">
                Research IT Department<br />
                research-it@mountsinai.org<br />
                New York, NY
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
            © 2025 Mount Sinai Health System. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}