'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Target, Mail, Settings } from 'lucide-react';

const navLinks = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/campaigns', label: 'Campaigns', icon: Target },
  { href: '/dashboard/templates', label: 'Templates', icon: Mail },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-screen">
      <aside className="w-[220px] flex-shrink-0 bg-neutral-900 text-white flex flex-col">
        <div className="p-5 border-b border-white/[0.08]">
          <div className="text-[15px] font-semibold text-white">Leapfour</div>
          <div className="text-[11px] uppercase tracking-widest text-white/40 mt-0.5">
            Pipeline
          </div>
        </div>

        <nav className="p-2 flex-1 flex flex-col gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] ${
                isActive(href)
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/[0.08] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-[11px] font-semibold">
            S
          </div>
          <div>
            <div className="text-xs font-medium">Siddharth</div>
            <button
              onClick={handleLogout}
              className="text-[10px] text-white/35 hover:text-white/50 cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-[#FAFAFA] overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
