"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavBarProps {
  user: {
    name?: string | null;
    role: string;
  };
}

export function NavBar({ user }: NavBarProps) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/tournaments", label: "Tournaments" },
    ...(user.role === "ADMIN"
      ? [
          { href: "/admin/players", label: "Players" },
          { href: "/admin/tournaments", label: "Admin" },
        ]
      : []),
  ];

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-bold text-lg flex items-center gap-2">
            🏎️ <span>Mar10</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm transition-colors",
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {user.name}
            {user.role === "ADMIN" && (
              <span className="ml-1 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                Admin
              </span>
            )}
          </span>
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
