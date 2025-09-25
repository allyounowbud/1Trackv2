import { useTheme } from '../contexts/ThemeContext';

const ThemeSettings = () => {
  const { theme, changeTheme } = useTheme();

  const themes = [
    {
      id: 'light',
      name: 'Light Mode',
      description: 'Clean and bright interface',
      icon: '☀️',
      preview: 'bg-white text-gray-900'
    },
    {
      id: 'dark',
      name: 'Dark Mode',
      description: 'Easy on the eyes (default)',
      icon: '🌙',
      preview: 'bg-gray-900 text-white'
    },
    {
      id: 'darker',
      name: 'Darker Mode',
      description: 'Ultra dark for low light',
      icon: '🌑',
      preview: 'bg-black text-gray-100'
    }
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-white font-medium text-sm">Appearance</h4>
      <div className="flex items-center justify-between gap-2">
        {themes.map((themeOption) => (
          <button
            key={themeOption.id}
            onClick={() => changeTheme(themeOption.id)}
            className={`flex flex-col items-center space-y-2 p-3 rounded-lg transition-all duration-200 flex-1 min-h-[80px] border ${
              theme === themeOption.id
                ? 'bg-indigo-600/20 border-indigo-500/30'
                : 'bg-gray-700/50 border-gray-600/30 hover:bg-gray-700'
            }`}
            title={`${themeOption.name} - ${themeOption.description}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              theme === themeOption.id 
                ? 'bg-indigo-500/20' 
                : 'bg-gray-600/20'
            }`}>
              <span className="text-2xl">{themeOption.icon}</span>
            </div>
            <div className="text-center">
              <div className={`text-xs font-medium ${
                theme === themeOption.id ? 'text-indigo-400' : 'text-white'
              }`}>
                {themeOption.name}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSettings;
