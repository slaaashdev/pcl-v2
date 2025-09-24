import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { MissStatsDashboard } from '@/components/admin/MissStatsDashboard'
import {
  Home,
  TrendingUp,
  Settings,
  MessageSquare,
  BarChart3,
  Database,
  Users,
  Activity
} from 'lucide-react'

type ActiveTab = 'misses' | 'patterns' | 'feedback' | 'analytics'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('misses')

  const tabs = [
    { id: 'misses' as const, label: 'Miss Statistics', icon: TrendingUp, description: 'Review uncached patterns' },
    { id: 'patterns' as const, label: 'Pattern Management', icon: Settings, description: 'Manage compression rules' },
    { id: 'feedback' as const, label: 'User Feedback', icon: MessageSquare, description: 'Monitor satisfaction' },
    { id: 'analytics' as const, label: 'System Analytics', icon: BarChart3, description: 'Performance metrics' }
  ]

  return (
    <>
      <Head>
        <title>Admin Dashboard - PCL Compressor</title>
        <meta name="description" content="PCL Compressor admin interface for manual curation and system management" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-xl font-bold text-gray-900">PCL Admin</h1>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link
                    href="/"
                    className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    <Home className="w-4 h-4 mr-1" />
                    Compressor
                  </Link>
                  <Link
                    href="/admin"
                    className="border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Admin
                  </Link>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Database className="w-4 h-4" />
                  <span>Supabase Connected</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Admin Content */}
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">System Administration</h1>
            <p className="mt-2 text-gray-600">
              Manual curation interface for PCL compression system
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <Activity className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">System Status</p>
                  <p className="text-lg font-semibold text-gray-900">Online</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Compression Mode</p>
                  <p className="text-lg font-semibold text-gray-900">Two-Pass</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <Database className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Database</p>
                  <p className="text-lg font-semibold text-gray-900">Supabase</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Curation</p>
                  <p className="text-lg font-semibold text-gray-900">Manual</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow border min-h-96">
            {activeTab === 'misses' && (
              <div className="p-6">
                <MissStatsDashboard />
              </div>
            )}

            {activeTab === 'patterns' && (
              <div className="p-6">
                <div className="text-center py-12">
                  <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Pattern Management</h3>
                  <p className="text-gray-600">
                    Comprehensive pattern management interface coming soon.
                    <br />
                    For now, use the "Add Rule" buttons in Miss Statistics.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'feedback' && (
              <div className="p-6">
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">User Feedback Analytics</h3>
                  <p className="text-gray-600">
                    User satisfaction tracking and feedback analysis interface.
                    <br />
                    Coming in the next phase of development.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="p-6">
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">System Analytics</h3>
                  <p className="text-gray-600">
                    Performance metrics, compression ratios, and system health monitoring.
                    <br />
                    Advanced analytics dashboard coming soon.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">🔧 Admin Instructions</h3>
            <div className="space-y-2 text-blue-800">
              <p><strong>Priority 1:</strong> Review "Miss Statistics" for high-frequency patterns</p>
              <p><strong>Manual Curation:</strong> Click "Add Rule" for patterns with 10+ occurrences</p>
              <p><strong>Quality Control:</strong> Set confidence scores based on compression quality</p>
              <p><strong>Feedback Loop:</strong> User satisfaction automatically adjusts confidence scores</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}