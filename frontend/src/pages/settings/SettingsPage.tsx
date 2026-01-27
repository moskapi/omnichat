import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Key, User } from 'lucide-react';

const settingsNav = [
  { title: 'API Keys', href: '/settings/api-keys', icon: Key },
  { title: 'Minha Conta', href: '/settings/account', icon: User },
];

export default function SettingsPage() {
  const location = useLocation();

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <nav className="w-48 flex-shrink-0">
        <h2 className="text-lg font-semibold mb-4">Configurações</h2>
        <div className="space-y-1">
          {settingsNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.title}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 max-w-2xl">
        <Outlet />
      </div>
    </div>
  );
}
