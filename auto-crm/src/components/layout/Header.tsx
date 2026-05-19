"use client";

import { useState } from "react";
import { Search, Bell, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { BusinessSwitcher } from "./BusinessSwitcher";
import { useBusiness } from "@/context/BusinessContext";

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const { businessConfig } = useBusiness();

  return (
    <header className="sticky top-0 z-30 bg-card">
      {/* Barra de color de marca persistente */}
      <div
        className="h-1 w-full transition-colors"
        style={{ backgroundColor: businessConfig.color }}
        aria-hidden
      />

      <div className="flex h-16 items-center gap-2 sm:gap-4 border-b px-3 sm:px-4 md:px-6">
        <Sheet>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" className="md:hidden cursor-pointer" />}
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <MobileNav />
          </SheetContent>
        </Sheet>

        <div className="flex-1 flex items-center gap-4">
          {/* Search: input completo en desktop, icon-button en mobile */}
          <div className="relative w-full max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contactos, deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden cursor-pointer"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Buscar"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>

        <BusinessSwitcher />
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="relative cursor-pointer" aria-label="Notificaciones">
          <Bell className="h-5 w-5" />
        </Button>
      </div>

      {/* Search mobile expandido */}
      {searchOpen && (
        <div className="sm:hidden border-b px-3 py-2 bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contactos, deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}
