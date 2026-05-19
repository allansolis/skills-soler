"use client";

import { useState, useEffect } from "react";
import { useBusiness } from "@/context/BusinessContext";
import { ReportKPIs } from "@/components/reports/ReportKPIs";
import { ReportTable } from "@/components/reports/ReportTable";
import { ReportDetail } from "@/components/reports/ReportDetail";
import { RetroPanel } from "@/components/reports/RetroPanel";
import { Button } from "@/components/ui/button";
import {
  FileBarChart,
  Download,
  RefreshCw,
  CalendarDays,
} from "lucide-react";

interface Report {
  id: string;
  reportDate: string;
  metaSpend: number | null;
  metaImpressions: number | null;
  metaReach: number | null;
  metaClicks: number | null;
  metaCtr: string | null;
  metaCpc: string | null;
  metaMessages: number | null;
  metaCostPerMsg: string | null;
  totalContacts: number | null;
  totalConversations: number | null;
  activeCampaigns: number | null;
  campaignDetails: Array<Record<string, unknown>>;
  recommendations: string[];
  alerts: string[];
  aiSummary: string | null;
  createdAt: string;
}

interface Retrospective {
  period: {
    days: number;
    from: string;
    to: string;
    reportsCount: number;
  };
  performance: {
    totalSpend_CRC: number;
    totalMessages: number;
    totalImpressions: number;
    totalReach: number;
    totalClicks: number;
    avgCtr: string;
    avgCostPerMsg: number | string;
    avgDailySpend: number;
  };
  trends: {
    spendTrend: string;
    messageTrend: string;
    direction: string;
  };
  knowledgeBase: {
    totalInsights: number;
    faqs: number;
    objections: number;
    trends: number;
    improvements: number;
  };
  inventory: {
    totalProducts: number;
    inStock: number;
    outOfStock: number;
    topProducts: Array<{ name: string; mentions: number | null; category: string }>;
  };
  recommendations: string[];
  alerts: string[];
}

type ActiveTab = "reportes" | "retrospectiva";

export default function ReportsPage() {
  const { businessConfig } = useBusiness();
  const [reports, setReports] = useState<Report[]>([]);
  const [retro, setRetro] = useState<Retrospective | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("reportes");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportsRes, retroRes] = await Promise.all([
        fetch("/api/reports/executive?limit=30"),
        fetch("/api/reports/retrospective?days=7"),
      ]);
      const reportsData = await reportsRes.json();
      const retroData = await retroRes.json();
      setReports(reportsData.reports || []);
      setRetro(retroData.retrospective || null);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    window.open("/api/reports/retrospective?days=30&format=csv", "_blank");
  };

  const downloadJSON = () => {
    const data = JSON.stringify(reports, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reportes_ejecutivos_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Aggregate KPI totals
  const totalSpend = reports.reduce((s, r) => s + (r.metaSpend || 0), 0);
  const totalMessages = reports.reduce((s, r) => s + (r.metaMessages || 0), 0);
  const totalImpressions = reports.reduce((s, r) => s + (r.metaImpressions || 0), 0);
  const totalReach = reports.reduce((s, r) => s + (r.metaReach || 0), 0);
  const avgCtr = reports.length > 0
    ? (reports.reduce((s, r) => s + parseFloat(r.metaCtr || "0"), 0) / reports.length).toFixed(2) + "%"
    : "0%";
  const avgCostPerMsg = totalMessages > 0 ? Math.round(totalSpend / totalMessages) : "N/A";

  // Simple trend from first/second half
  const mid = Math.ceil(reports.length / 2);
  const firstHalfSpend = reports.slice(mid).reduce((s, r) => s + (r.metaSpend || 0), 0);
  const secondHalfSpend = reports.slice(0, mid).reduce((s, r) => s + (r.metaSpend || 0), 0);
  const spendTrend = firstHalfSpend > 0
    ? ((secondHalfSpend - firstHalfSpend) / firstHalfSpend * 100).toFixed(1) + "%"
    : "N/A%";
  const firstHalfMsgs = reports.slice(mid).reduce((s, r) => s + (r.metaMessages || 0), 0);
  const secondHalfMsgs = reports.slice(0, mid).reduce((s, r) => s + (r.metaMessages || 0), 0);
  const msgTrend = firstHalfMsgs > 0
    ? ((secondHalfMsgs - firstHalfMsgs) / firstHalfMsgs * 100).toFixed(1) + "%"
    : "N/A%";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-purple-500" />
            Reportes y Retrospectivas{" "}
            <span style={{ color: businessConfig.color }}>
              {businessConfig.emoji} {businessConfig.name}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Reportes ejecutivos diarios con análisis de mejora continua · vista de esta marca
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadCSV}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={downloadJSON}>
            <Download className="h-4 w-4 mr-1" />
            JSON
          </Button>
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex rounded-lg border overflow-hidden w-fit">
        <button
          onClick={() => setActiveTab("reportes")}
          className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === "reportes"
              ? "bg-primary text-primary-foreground"
              : "bg-card hover:bg-muted text-muted-foreground"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          Reportes Diarios ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab("retrospectiva")}
          className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === "retrospectiva"
              ? "bg-primary text-primary-foreground"
              : "bg-card hover:bg-muted text-muted-foreground"
          }`}
        >
          <FileBarChart className="h-4 w-4" />
          Retrospectiva IA
        </button>
      </div>

      {activeTab === "reportes" && (
        <>
          {/* KPI Summary */}
          {reports.length > 0 && (
            <ReportKPIs
              totalSpend={totalSpend}
              totalMessages={totalMessages}
              totalImpressions={totalImpressions}
              totalReach={totalReach}
              avgCtr={avgCtr}
              avgCostPerMsg={avgCostPerMsg}
              reportsCount={reports.length}
              spendTrend={spendTrend}
              msgTrend={msgTrend}
            />
          )}

          {/* Reports Table + Detail */}
          <div className={`grid gap-6 ${selectedReport ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
            <ReportTable
              reports={reports}
              onSelectReport={(r) => setSelectedReport(r as Report)}
              selectedId={selectedReport?.id || null}
            />
            {selectedReport && (
              <ReportDetail
                report={selectedReport}
                onClose={() => setSelectedReport(null)}
              />
            )}
          </div>
        </>
      )}

      {activeTab === "retrospectiva" && (
        <RetroPanel initialData={retro} />
      )}
    </div>
  );
}
