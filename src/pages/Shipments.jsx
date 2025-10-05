import React from 'react';

const Shipments = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Coming Soon Content */}
      <div className="px-4 md:px-6 lg:px-8 py-12">
        <div className="text-center">
          {/* Blurred Truck Icon */}
          <div className="mb-8">
            <div className="inline-block filter blur-sm">
              <svg className="w-24 h-24 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </div>
          </div>

          {/* Coming Soon Text */}
          <h2 className="text-[18px] font-bold text-white mb-4">
            Shipments
          </h2>
          
          <p className="text-[14px] text-gray-400 mb-8 max-w-md mx-auto">
            Track your incoming and outgoing shipments, manage delivery status, and stay updated on your orders.
          </p>

          {/* Coming Soon Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-full">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
            <span className="text-blue-400 font-medium">Coming Soon</span>
          </div>
        </div>

        {/* Blurred Content Placeholder */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Incoming Shipments Card */}
            <div className="bg-gray-800 rounded-xl p-6 filter blur-sm opacity-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Incoming</h3>
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-2">--</div>
              <div className="text-sm text-gray-400">Active shipments</div>
            </div>

            {/* Outgoing Shipments Card */}
            <div className="bg-gray-800 rounded-xl p-6 filter blur-sm opacity-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Outgoing</h3>
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-2">--</div>
              <div className="text-sm text-gray-400">Pending shipments</div>
            </div>

            {/* Delivered Shipments Card */}
            <div className="bg-gray-800 rounded-xl p-6 filter blur-sm opacity-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Delivered</h3>
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-2">--</div>
              <div className="text-sm text-gray-400">Completed this month</div>
            </div>
          </div>

          {/* Recent Shipments Table Placeholder */}
          <div className="mt-12">
            <div className="bg-gray-800 rounded-xl p-6 filter blur-sm opacity-50">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Shipments</h3>
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-700 rounded-lg"></div>
                      <div>
                        <div className="w-24 h-4 bg-gray-700 rounded mb-2"></div>
                        <div className="w-16 h-3 bg-gray-700 rounded"></div>
                      </div>
                    </div>
                    <div className="w-20 h-6 bg-gray-700 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shipments;
