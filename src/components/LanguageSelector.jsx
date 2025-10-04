import { useLanguage } from '../contexts/LanguageContext';

const LanguageSelector = ({ className = '', showLabel = true, compact = false }) => {
  const { preferredLanguage, setLanguage, getLanguageDisplayName, isLoading } = useLanguage();

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showLabel && <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>}
      </div>
    );
  }

  const handleLanguageChange = (event) => {
    const newLanguage = event.target.value;
    setLanguage(newLanguage);
  };

  if (compact) {
    return (
      <select
        value={preferredLanguage}
        onChange={handleLanguageChange}
        className={`px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${className}`}
        title="Select language"
      >
        <option value="en">🇺🇸 EN</option>
        <option value="ja">🇯🇵 JA</option>
      </select>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <label htmlFor="language-selector" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Language:
        </label>
      )}
      <select
        id="language-selector"
        value={preferredLanguage}
        onChange={handleLanguageChange}
        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="en">🇺🇸 English</option>
        <option value="ja">🇯🇵 日本語 (Japanese)</option>
      </select>
    </div>
  );
};

export default LanguageSelector;

