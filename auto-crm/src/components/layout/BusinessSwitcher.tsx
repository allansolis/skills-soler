"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/context/BusinessContext";
import { ChevronDown, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function BusinessSwitcher() {
  const { business, businessConfig, setBusiness, allBusinesses } = useBusiness();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  // Persistir cookie + localStorage cuando cambia business.
  // No recarga: router.refresh() preserva el estado client (modales, scroll, inputs).
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("business", business);
    // Tambien escribir cookie cliente para que reads client-side la vean inmediato.
    document.cookie = `business=${business}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, [business]);

  // Click outside cerrar
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleSelect(id: typeof business) {
    if (id === business) {
      setOpen(false);
      return;
    }

    setOpen(false);

    // 1) Optimistic: actualizar context inmediato (sidebar/header cambian de color)
    setBusiness(id);

    // 2) Setear cookie server-side antes de refresh para evitar race
    try {
      const res = await fetch("/api/set-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business: id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      toast.error("No se pudo cambiar de marca", {
        description: String((e as Error).message),
      });
      return;
    }

    // 3) Refrescar server components con la nueva cookie
    startTransition(() => {
      const target = allBusinesses.find((b) => b.id === id);
      router.refresh();
      if (target) {
        toast.success(`${target.emoji} ${target.name}`, {
          description: "Cambiando vista...",
        });
      }
    });
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted/60 transition-colors text-sm border border-transparent hover:border-border disabled:opacity-70"
        style={{ borderLeftColor: businessConfig.color, borderLeftWidth: 3 }}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <span className="text-base">{businessConfig.emoji}</span>
        )}
        <span className="font-medium hidden md:inline">{businessConfig.name}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-64 rounded-md border bg-card shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 text-xs text-muted-foreground border-b">
            Cambiar negocio
          </div>
          <div className="py-1">
            {allBusinesses.map((b) => {
              const isActive = b.id === business;
              return (
                <button
                  key={b.id}
                  onClick={() => handleSelect(b.id)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-muted/60 transition-colors ${
                    isActive ? "bg-muted/40" : ""
                  }`}
                  style={
                    isActive
                      ? { borderLeftColor: b.color, borderLeftWidth: 3 }
                      : {}
                  }
                >
                  <span className="text-xl">{b.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{b.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {b.description}
                    </div>
                  </div>
                  {isActive && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
          <div className="px-3 py-2 text-xs text-muted-foreground border-t bg-muted/30">
            Cambia la vista a través de toda la app
          </div>
        </div>
      )}
    </div>
  );
}
