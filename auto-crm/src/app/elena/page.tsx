"use client";

import { useState, useEffect } from "react";
import { useBusiness } from "@/context/BusinessContext";
import { toast } from "sonner";
import { Bot, Save, RefreshCw, Send, Loader2, Database, Sparkles } from "lucide-react";

export default function ElenaPage() {
  const { business, businessConfig } = useBusiness();
  const [kb, setKb] = useState("");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Test playground
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState<{
    text: string;
    hotLead: boolean;
    shouldEscalate: boolean;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  async function loadKb() {
    setLoading(true);
    try {
      const res = await fetch(`/api/elena/kb?business=${business}`);
      const data = await res.json();
      setKb(data.content || "");
      setDirty(false);
    } catch (e) {
      toast.error("Error al cargar KB");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKb();
    setTestResponse(null);
    setTestMessage("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  async function saveKb() {
    setSaving(true);
    try {
      const res = await fetch("/api/elena/kb", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business, content: kb }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Knowledge base actualizado (${data.length} chars)`);
        setDirty(false);
      } else {
        toast.error(data.error || "Error al guardar");
      }
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function testElena() {
    if (!testMessage.trim()) return;
    setTesting(true);
    setTestResponse(null);
    try {
      const res = await fetch("/api/elena/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business, message: testMessage }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setTestResponse(data);
      }
    } catch (e) {
      toast.error("Error al testear");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-purple-500" />
            Elena{" "}
            <span style={{ color: businessConfig.color }}>
              {businessConfig.emoji} {businessConfig.name}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Knowledge base + persona del bot conversacional. Solo de esta marca.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadKb}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted/40 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Recargar
          </button>
          <button
            onClick={saveKb}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KB editor */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Database className="h-4 w-4 text-muted-foreground" />
            Knowledge Base ({businessConfig.name})
            {dirty && <span className="text-xs text-amber-500">· cambios sin guardar</span>}
          </div>
          {loading ? (
            <div className="h-[600px] bg-muted rounded-lg animate-pulse" />
          ) : (
            <textarea
              value={kb}
              onChange={(e) => {
                setKb(e.target.value);
                setDirty(true);
              }}
              className="w-full h-[600px] font-mono text-xs p-4 rounded-lg border bg-card resize-y"
              placeholder="# Markdown knowledge base para Elena..."
              spellCheck={false}
            />
          )}
          <p className="text-xs text-muted-foreground">
            Editá este markdown para enseñarle a Elena lo que tu negocio vende, los precios, el tono. Se aplica
            automáticamente a las respuestas de los próximos 5 minutos (cache TTL).
          </p>
        </div>

        {/* Test playground */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Test playground
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-3">
            <label className="text-xs text-muted-foreground block">
              Simulá un mensaje de cliente (Elena responde como si fuera real):
            </label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={3}
              placeholder="Ej: Hola, busco un polarizado para mi Honda Civic 2019..."
              className="w-full text-sm p-2 rounded border bg-background resize-none"
            />
            <button
              onClick={testElena}
              disabled={testing || !testMessage.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {testing ? "Pensando..." : "Probar Elena"}
            </button>
          </div>

          {testResponse && (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Bot className="h-3 w-3" />
                Elena {businessConfig.emoji} responde:
              </div>
              <p className="text-sm whitespace-pre-wrap">{testResponse.text}</p>
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {testResponse.hotLead && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300">
                    🔥 hot lead detectado
                  </span>
                )}
                {testResponse.shouldEscalate && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-700 dark:text-red-300">
                    ⚠️ escalar a humano
                  </span>
                )}
                {!testResponse.hotLead && !testResponse.shouldEscalate && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-700 dark:text-green-300">
                    ✓ respuesta normal
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
