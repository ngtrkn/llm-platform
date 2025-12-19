import { Fragment } from 'react';

function ProviderSelector({
  llmProviders,
  dbProviders,
  selectedLLMProvider,
  selectedDBProvider,
  onLLMProviderChange,
  onDBProviderChange,
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            LLM Provider
          </label>
          <select
            value={selectedLLMProvider}
            onChange={(e) => onLLMProviderChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {llmProviders.length === 0 ? (
              <option value="">No providers available</option>
            ) : (
              llmProviders.map((provider) => (
                <option key={provider} value={provider}>
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Database Provider
          </label>
          <select
            value={selectedDBProvider}
            onChange={(e) => onDBProviderChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {dbProviders.length === 0 ? (
              <option value="">No databases available</option>
            ) : (
              dbProviders.map((provider) => (
                <option key={provider} value={provider}>
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </option>
              ))
            )}
          </select>
        </div>
      </div>
    </div>
  );
}

export default ProviderSelector;
