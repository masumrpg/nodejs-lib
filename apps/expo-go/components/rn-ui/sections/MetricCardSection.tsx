import { Box, MetricCard } from "@masumdev/rn-ui";
import { BarChart3, Clock, DollarSign, ShieldCheck, Users } from "lucide-react-native";
import { DemoCard, Section, type RnUiSectionContext } from "../shared";

export function MetricCardSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { icon } = ctx;

  return (
    <Section title="MetricCard">
      <Box gap="lg">
        {/* 1. Core Key Performance Indicators (2-Column Grid) */}
        <DemoCard
          title="Core Performance Metrics"
          badge="SaaS KPI Grid"
          badgeTone="primary"
          description="KPI display cards with trend deltas, icons, and theme-aware surface fills."
        >
          <Box row gap="md" style={{ flexWrap: "wrap" }}>
            <Box style={{ flex: 1, minWidth: 140 }}>
              <MetricCard
                label="Monthly Recurring"
                value="$48,250"
                delta="+18.4% this month"
                icon={icon(DollarSign)}
              />
            </Box>

            <Box style={{ flex: 1, minWidth: 140 }}>
              <MetricCard
                label="Active Developers"
                value="2,480"
                delta="+320 new accounts"
                icon={icon(Users)}
              />
            </Box>
          </Box>

          <Box row gap="md" style={{ flexWrap: "wrap" }}>
            <Box style={{ flex: 1, minWidth: 140 }}>
              <MetricCard
                label="Crash-Free Rate"
                value="99.98%"
                delta="Stable over 30d"
                icon={icon(ShieldCheck)}
              />
            </Box>

            <Box style={{ flex: 1, minWidth: 140 }}>
              <MetricCard
                label="API p95 Latency"
                value="42ms"
                delta="-8ms optimization"
                icon={icon(Clock)}
              />
            </Box>
          </Box>
        </DemoCard>

        {/* 2. Full-Width Library Analytics Metric */}
        <DemoCard
          title="Monorepo Health Analytics"
          badge="Library Metrics"
          badgeTone="success"
          description="Full-width metric overview for product dashboards and executive summaries."
        >
          <MetricCard
            label="Verified UI Primitives"
            value="61 Components"
            delta="+100% strict type-safe with zero any types"
            icon={icon(BarChart3)}
          />
        </DemoCard>
      </Box>
    </Section>
  );
}
