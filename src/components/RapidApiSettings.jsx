import React from 'react';

const RapidApiSettings = () => {

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">RapidAPI</h3>
          <p className="text-sm text-gray-400">Image enhancement for products without images (secure backend)</p>
        </div>
      </div>

      <div className="space-y-4">

        {/* Security Information */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-2">🔒 Secure Backend Integration</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• API key is stored securely on the backend server</li>
            <li>• All RapidAPI requests go through our secure proxy</li>
            <li>• No sensitive data is exposed to the frontend</li>
          </ul>
        </div>

        {/* Information */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-2">About RapidAPI</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Provides image enhancement for products without images</li>
            <li>• Uses TCGPlayer API to find better product images</li>
            <li>• Only enhances images - pricing is handled by PriceCharting</li>
            <li>• Automatically skips products that already have good images</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RapidApiSettings;
