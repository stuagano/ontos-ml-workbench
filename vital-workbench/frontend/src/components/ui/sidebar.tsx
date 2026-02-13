/**
 * Sidebar UI Components (APX-style)
 *
 * Collapsible sidebar layout with header, content, and footer sections.
 * Based on shadcn/ui sidebar pattern.
 */

import * as React from "react";
import { clsx } from "clsx";
import { PanelLeft } from "lucide-react";

// ============================================================================
// Context
// ============================================================================

type SidebarState = "expanded" | "collapsed";

interface SidebarContextValue {
  state: SidebarState;
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

const SIDEBAR_STORAGE_KEY = "databits-sidebar-state";

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function SidebarProvider({
  children,
  defaultOpen = true,
}: SidebarProviderProps) {
  const [open, setOpenState] = React.useState(() => {
    if (typeof window === "undefined") return defaultOpen;
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored ? stored === "true" : defaultOpen;
  });

  const setOpen = React.useCallback((value: boolean) => {
    setOpenState(value);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
  }, []);

  const toggleSidebar = React.useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  const state: SidebarState = open ? "expanded" : "collapsed";

  return (
    <SidebarContext.Provider value={{ state, open, setOpen, toggleSidebar }}>
      <div
        className="group/sidebar-wrapper flex min-h-screen w-full"
        data-sidebar-state={state}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

// ============================================================================
// Sidebar
// ============================================================================

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Sidebar({ children, className, ...props }: SidebarProps) {
  const { open } = useSidebar();

  return (
    <aside
      className={clsx(
        "flex flex-col bg-db-gray-50 dark:bg-gray-900 border-r border-db-gray-200 dark:border-gray-700",
        "transition-all duration-300 ease-in-out",
        open ? "w-64" : "w-16",
        className
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

// ============================================================================
// Sidebar Header
// ============================================================================

interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SidebarHeader({
  children,
  className,
  ...props
}: SidebarHeaderProps) {
  return (
    <div
      className={clsx(
        "flex items-center h-16 px-4 border-b border-db-gray-200 dark:border-gray-700",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Sidebar Content
// ============================================================================

interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SidebarContent({
  children,
  className,
  ...props
}: SidebarContentProps) {
  return (
    <div className={clsx("flex-1 overflow-y-auto py-4", className)} {...props}>
      {children}
    </div>
  );
}

// ============================================================================
// Sidebar Footer
// ============================================================================

interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SidebarFooter({
  children,
  className,
  ...props
}: SidebarFooterProps) {
  return (
    <div
      className={clsx(
        "flex items-center px-4 py-3 border-t border-db-gray-200 dark:border-gray-700",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Sidebar Group
// ============================================================================

interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SidebarGroup({
  children,
  className,
  ...props
}: SidebarGroupProps) {
  return (
    <div className={clsx("px-3 py-2", className)} {...props}>
      {children}
    </div>
  );
}

// ============================================================================
// Sidebar Group Label
// ============================================================================

interface SidebarGroupLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SidebarGroupLabel({
  children,
  className,
  ...props
}: SidebarGroupLabelProps) {
  const { open } = useSidebar();

  if (!open) return null;

  return (
    <div
      className={clsx(
        "px-2 mb-2 text-xs font-semibold text-db-gray-500 dark:text-gray-400 uppercase tracking-wider",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Sidebar Menu
// ============================================================================

interface SidebarMenuProps extends React.HTMLAttributes<HTMLUListElement> {
  children: React.ReactNode;
}

export function SidebarMenu({
  children,
  className,
  ...props
}: SidebarMenuProps) {
  return (
    <ul className={clsx("space-y-1", className)} {...props}>
      {children}
    </ul>
  );
}

// ============================================================================
// Sidebar Menu Item
// ============================================================================

interface SidebarMenuItemProps extends React.HTMLAttributes<HTMLLIElement> {
  children: React.ReactNode;
}

export function SidebarMenuItem({
  children,
  className,
  ...props
}: SidebarMenuItemProps) {
  return (
    <li className={clsx(className)} {...props}>
      {children}
    </li>
  );
}

// ============================================================================
// Sidebar Menu Button
// ============================================================================

interface SidebarMenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  tooltip?: string;
  children: React.ReactNode;
}

export function SidebarMenuButton({
  isActive,
  tooltip,
  children,
  className,
  ...props
}: SidebarMenuButtonProps) {
  const { open } = useSidebar();

  return (
    <button
      className={clsx(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium",
        "transition-colors duration-150",
        isActive
          ? "bg-db-orange/10 text-db-orange dark:bg-orange-900/30"
          : "text-db-gray-700 dark:text-gray-300 hover:bg-db-gray-100 dark:hover:bg-gray-800",
        !open && "justify-center",
        className
      )}
      title={!open ? tooltip : undefined}
      {...props}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Sidebar Inset (Main Content Area)
// ============================================================================

interface SidebarInsetProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SidebarInset({
  children,
  className,
  ...props
}: SidebarInsetProps) {
  return (
    <div className={clsx("flex-1 flex flex-col min-w-0", className)} {...props}>
      {children}
    </div>
  );
}

// ============================================================================
// Sidebar Trigger
// ============================================================================

interface SidebarTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function SidebarTrigger({ className, ...props }: SidebarTriggerProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      onClick={toggleSidebar}
      className={clsx(
        "p-2 rounded-lg text-db-gray-600 dark:text-gray-400",
        "hover:bg-db-gray-100 dark:hover:bg-gray-800 transition-colors",
        className
      )}
      title="Toggle sidebar"
      {...props}
    >
      <PanelLeft className="w-5 h-5" />
    </button>
  );
}
