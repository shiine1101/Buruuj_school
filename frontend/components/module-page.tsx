import { Download, FilePlus, Search, Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ModulePageProps = {
  title: string;
  description: string;
  rows: Record<string, string | number>[];
  actions?: string[];
};

export function ModulePage({ title, description, rows, actions = ["Create", "Import Excel", "Export Excel"] }: ModulePageProps) {
  return (
    <AppShell>
      <Card>
        <CardHeader className="flex-col items-start sm:flex-row sm:items-center">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button key={action} variant={action.includes("Export") || action.includes("Import") ? "outline" : "default"} size="sm">
                {action.includes("Import") ? <Upload className="h-4 w-4" /> : action.includes("Export") ? <Download className="h-4 w-4" /> : <FilePlus className="h-4 w-4" />}
                {action}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex max-w-md items-center gap-2 rounded-md border bg-white px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <Input className="border-0 shadow-none focus:ring-0" placeholder={`Search ${title.toLowerCase()}...`} />
          </div>
          <DataTable rows={rows} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
