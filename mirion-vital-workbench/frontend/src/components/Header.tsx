/**
 * Header component with app title, user info, and theme toggle
 */

import { Database, ExternalLink, User, Sun, Moon, Monitor, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from '../hooks/useTheme';

interface HeaderProps {
  appName: string;
  currentUser: string;
  workspaceUrl: string;
  showExamples?: boolean;
  onToggleExamples?: () => void;
}

export function Header({
  appName,
  currentUser,
  workspaceUrl,
  showExamples,
  onToggleExamples,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <header className="bg-db-dark text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-db-orange" />
        <h1 className="text-lg font-semibold">{appName}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Example Store Button */}
        {onToggleExamples && (
          <button
            onClick={onToggleExamples}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
              showExamples
                ? "bg-purple-600 text-white"
                : "text-db-gray-300 hover:text-white hover:bg-white/10"
            )}
          >
            <BookOpen className="w-4 h-4" />
            <span>Examples</span>
          </button>
        )}

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
