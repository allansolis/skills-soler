"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ReportRow {
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
  activeCampaigns: number | null;
  recommendations: string[];
  alerts: string[];
}

interface ReportTableProps {
  reports: ReportRow[];
  onSelectReport: (report: ReportRow) => void;
  selectedId: string | null;
}

export function ReportTable({ reports, onSelectReport, selectedId }: ReportTableProps) {
  if (reports.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          No hay reportes ejecutivos todavia. Los agentes de n8n generan reportes diarios automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card ring-1 ring-foreground/5 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold">Fecha</TableHead>
            <TableHead className="font-semibold text-right">Gasto</TableHead>
            <TableHead className="font-semibold text-right hidden sm:table-cell">Impresiones</TableHead>
            <TableHead className="font-semibold text-right">Mensajes</TableHead>
            <TableHead className="font-semibold text-right hidden md:table-cell">CTR</TableHead>
            <TableHead className="font-semibold text-right hidden md:table-cell">CPC</TableHead>
            <TableHead className="font-semibold text-center hidden lg:table-cell">Alertas</TableHead>
            <TableHead className="font-semibold text-center hidden lg:table-cell">Campanas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => {
            const costPerMsg = report.metaCostPerMsg
              ? parseFloat(report.metaCostPerMsg)
              : null;
            const costColor =
              costPerMsg !== null
                ? costPerMsg < 50
                  ? "text-emerald-600 dark:text-emerald-400"
                  : costPerMsg < 200
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400"
                : "";

            return (
              <TableRow
                key={report.id}
                onClick={() => onSelectReport(report)}
                className={`cursor-pointer transition-colors ${
                  selectedId === report.id
                    ? "bg-primary/5 ring-1 ring-primary/20"
                    : "hover:bg-muted/50"
                }`}
              >
                <TableCell className="font-medium">{report.reportDate}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {(report.metaSpend || 0).toLocaleString("es-CR")}
                </TableCell>
                <TableCell className="text-right tabular-nums hidden sm:table-cell">
                  {(report.metaImpressions || 0).toLocaleString("es-CR")}
                </TableCell>
                <TableCell className="text-right">
                  <span className="tabular-nums">{report.metaMessages || 0}</span>
                  {costPerMsg !== null && (
                    <span className={`text-xs ml-1 ${costColor}`}>
                      ({Math.round(costPerMsg)} c/u)
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums hidden md:table-cell">
                  {report.metaCtr || "-"}%
                </TableCell>
                <TableCell className="text-right tabular-nums hidden md:table-cell">
                  {report.metaCpc || "-"}
                </TableCell>
                <TableCell className="text-center hidden lg:table-cell">
                  {report.alerts.length > 0 ? (
                    <Badge variant="destructive">{report.alerts.length}</Badge>
                  ) : (
                    <Badge variant="secondary">0</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center hidden lg:table-cell">
                  {report.activeCampaigns || 0}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
