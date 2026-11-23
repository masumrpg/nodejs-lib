import {
  Badge,
  Box,
  Table,
  TableCell,
  TableHead,
  TableRow,
  Text,
} from "@masumdev/rn-ui";
import { DemoCard, Section, type RnUiSectionContext } from "../shared";

export function TableSection({ ctx }: { ctx: RnUiSectionContext }) {
  void ctx;
  const invoices = [
    { id: "INV-2026-081", client: "Acme Corp", amount: "$1,250.00", status: "Paid", tone: "success" as const },
    { id: "INV-2026-082", client: "Starlight Labs", amount: "$840.00", status: "Pending", tone: "warning" as const },
    { id: "INV-2026-083", client: "Nexus Design", amount: "$420.00", status: "Refunded", tone: "danger" as const },
    { id: "INV-2026-084", client: "Solo Dev", amount: "$99.00", status: "Paid", tone: "success" as const },
  ];

  const packages = [
    { name: "@masumdev/rn-ui", version: "v0.7.0", primitives: "61 components", status: "Active" },
    { name: "@masumdev/tscheck", version: "v0.3.2", primitives: "AST auditor", status: "Active" },
    { name: "@masumdev/markforge", version: "v0.4.1", primitives: "Doc publishing", status: "Active" },
  ];

  return (
    <Section title="Table">
      <Box gap="lg">
        {/* 1. Recent Invoices Table */}
        <DemoCard
          title="Recent Invoices Table"
          badge="Tabular Data"
          badgeTone="primary"
          description="Structured data table with theme-styled header cells, borders, and status badges."
        >
          <Table>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <Text variant="caption" weight="600">
                    {inv.id}
                  </Text>
                </TableCell>
                <TableCell>{inv.client}</TableCell>
                <TableCell>
                  <Text variant="bodySmall" weight="600" style={{ fontVariant: ["tabular-nums"] }}>
                    {inv.amount}
                  </Text>
                </TableCell>
                <TableCell>
                  <Badge tone={inv.tone} variant="soft" size="xs">
                    {inv.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </DemoCard>

        {/* 2. Package Registry Table */}
        <DemoCard
          title="Monorepo Packages"
          badge="Registry"
          badgeTone="secondary"
          description="Open source packages under the Masum Dev workspace."
        >
          <Table>
            <TableRow>
              <TableHead>Package</TableHead>
              <TableHead>Release</TableHead>
              <TableHead>Scope</TableHead>
            </TableRow>
            {packages.map((pkg) => (
              <TableRow key={pkg.name}>
                <TableCell>
                  <Text variant="bodySmall" weight="600">
                    {pkg.name}
                  </Text>
                </TableCell>
                <TableCell>
                  <Badge tone="primary" variant="outline" size="xs">
                    {pkg.version}
                  </Badge>
                </TableCell>
                <TableCell>{pkg.primitives}</TableCell>
              </TableRow>
            ))}
          </Table>
        </DemoCard>
      </Box>
    </Section>
  );
}
