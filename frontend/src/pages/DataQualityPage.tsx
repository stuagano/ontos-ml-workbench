/**
 * DataQualityPage — Full-page DQX UI embedded via iframe.
 *
 * Rendered in the main content area when "Data Quality" is selected
 * in the Tools sidebar. DQX's own React app handles navigation
 * internally at /dqx-ui/.
 */

interface DataQualityPageProps {
  onClose: () => void;
}

export function DataQualityPage({ onClose }: DataQualityPageProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-white dark:bg-gray-900 border-b border-db-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-db-gray-800 dark:text-white">
            Data Quality (DQX)
          </h1>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-db-gray-600 hover:text-db-gray-800 dark:text-gray-400 dark:hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
      <iframe
        src="/dqx-ui/"
        className="flex-1 w-full border-0"
        title="DQX Data Quality"
      />
    </div>
  );
}
