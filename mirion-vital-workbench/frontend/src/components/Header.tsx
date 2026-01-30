/**
 * Header component with app title, user info, and theme toggle
 */

import { Database, ExternalLink, User, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface HeaderProps {
  appName: string;
  currentUser: string;
  workspaceUrl: string;
}

export function Header({ appName, currentUser, workspaceUrl }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <header className="bg-db-dark text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-db-orange" />
        <h1 className="text-lg font-semibold">{appName}</h1>
      </div>

      <div className="flex items-center gap-4">
        {workspaceUrl && (
          <button
            onClick={() => window.open(workspaceUrl, '_blank')}
            className="flex items-center gap-1 text-sm text-db-gray-300 hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Workspace</span>
          </button>
        )}

        <button
          onClick={toggleTheme}
          className="p-2 text-db-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title={`Theme: ${theme}`}
        >
          <ThemeIcon className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-sm text-db-gray-300">
          <User className="w-4 h-4" />
          <span>{currentUser}</span>
        </div>
      </div>
    </header>
  );
}
