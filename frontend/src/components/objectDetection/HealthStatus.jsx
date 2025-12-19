/**
 * Health Status Component
 * Displays CV service health status
 */
export default function HealthStatus({ healthStatus }) {
  const getHealthStatusColor = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return 'bg-green-500';
      case 'unhealthy':
        return 'bg-red-500';
      case 'checking':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getHealthStatusText = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return 'CV Service Online';
      case 'unhealthy':
        return 'CV Service Offline';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
      <div className={`w-2 h-2 rounded-full ${getHealthStatusColor()} animate-pulse`}></div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-700">{getHealthStatusText()}</span>
        {healthStatus.error && healthStatus.status === 'unhealthy' && (
          <span className="text-xs text-red-600" title={healthStatus.error}>
            {healthStatus.error.length > 50 ? healthStatus.error.substring(0, 50) + '...' : healthStatus.error}
          </span>
        )}
      </div>
      {healthStatus.lastCheck && (
        <span className="text-xs text-gray-500">
          {new Date(healthStatus.lastCheck).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
