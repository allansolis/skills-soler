"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Lightbulb,
  BarChart3,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportDetailProps {
  report: {
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
  };
  onClose: () => void;
}

export function ReportDetail({ report, onClose }: ReportDetailProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Reporte: {report.reportDate}</h3>
          <p className="text-sm text-muted-foreground">
            {report.activeCampaigns} campanas activas | {report.totalContacts} contactos
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricBox label="Gasto" value={`${(report.metaSpend || 0).toLocaleString("es-CR")} CRC`} />
        <MetricBox label="Mensajes" value={String(report.metaMessages || 0)} />
        <MetricBox label="Costo/Msg" value={report.metaCostPerMsg ? `${report.metaCostPerMsg} CRC` : "N/A"} />
        <MetricBox label="CTR" value={report.metaCtr ? `${report.metaCtr}%` : "N/A"} />
        <MetricBox label="Impresiones" value={(report.metaImpressions || 0).toLocaleString("es-CR")} />
        <MetricBox label="Alcance" value={(report.metaReach || 0).toLocaleString("es-CR")} />
        <MetricBox label="Clicks" value={(report.metaClicks || 0).toLocaleString("es-CR")} />
        <MetricBox label="CPC" value={report.metaCpc ? `${report.metaCpc} CRC` : "N/A"} />
      </div>

      {/* AI Summary */}
      {report.aiSummary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Resumen IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {report.aiSummary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {report.alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Alertas ({report.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.alerts.map((alert, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                  <span className="text-muted-foreground">{String(alert)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Recomendaciones ({report.recommendations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-muted-foreground">{String(rec)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Campaign Details */}
      {report.campaignDetails.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              Detalle de Campanas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.campaignDetails.map((campaign, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                >
                  <span className="font-medium truncate max-w-[60%]">
                    {String((campaign as Record<string, unknown>).name || `Campana ${i + 1}`)}
                  </span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    {(campaign as Record<string, unknown>).messages !== undefined && (
                      <span>{String((campaign as Record<string, unknown>).messages)} msgs</span>
                    )}
                    {(campaign as Record<string, unknown>).costPerMsg !== undefined && (
                      <Badge variant="outline">
                        {String((campaign as Record<string, unknown>).costPerMsg)} CRC/msg
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-bold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}
