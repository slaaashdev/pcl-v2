import Head from 'next/head'
import Link from 'next/link'
import CompressionInterface from '@/components/CompressionInterface'

export default function Home() {
  return (
    <>
      <Head>
        <title>PCL Compressor - Two-Pass Text Compression</title>
        <meta
          name="description"
          content="Advanced text compression with two-pass processing, manual curation, and zero external API costs."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-xl font-bold text-gray-900">PCL Compressor</h1>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link
                    href="/"
                    className="border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Compressor
                  </Link>
                  <Link
                    href="/admin"
                    className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    ⚙️
                    Admin
                  </Link>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>System Online</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="py-8">
          <CompressionInterface />
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-16">
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">System Features</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Two-pass compression (phrases first, then words)</li>
                  <li>• Manual curation for quality control</li>
                  <li>• Confidence scoring with user feedback</li>
                  <li>• Zero external API costs</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Performance</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Cache hits: 5-15ms response</li>
                  <li>• Two-pass processing: 70-250ms</li>
                  <li>• Target compression: 30-50%</li>
                  <li>• Miss tracking for improvement</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Technology</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Next.js + TypeScript</li>
                  <li>• Supabase PostgreSQL</li>
                  <li>• Manual quality control</li>
                  <li>• Real-time feedback system</li>
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
              <p>PCL Compressor v1.0 - Built for efficiency, powered by manual curation</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}