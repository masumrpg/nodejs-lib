import {
  Badge,
  Box,
  Pagination,
  Text,
} from "@masumdev/rn-ui";
import { useState } from "react";
import {
  DemoCard,
  DemoReadout,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function PaginationSection({ ctx }: { ctx: RnUiSectionContext }) {
  void ctx;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 8;
  const itemsPerPage = 5;

  const mockItems = [
    "Button Component (100% Tested)",
    "DatePicker & Wheel Roller",
    "Tabs with Flush Solid Capsule",
    "SegmentedControl with Haptics",
    "Switch with Inward Press Stretch",
  ];

  return (
    <Section title="Pagination">
      <Box gap="lg">
        {/* 1. Interactive Paged List Preview */}
        <DemoCard
          title="Interactive Pagination Control"
          badge={`Page ${currentPage} of ${totalPages}`}
          badgeTone="primary"
          description="Accessible page number navigation controls with previous/next action buttons."
        >
          {/* Mock Current Page Items */}
          <DemoSurface tone="muted" style={{ gap: 8, padding: 14 }}>
            <Box row center style={{ justifyContent: "space-between" }}>
              <Text variant="caption" weight="600" color="textMuted">
                Displaying Items {(currentPage - 1) * itemsPerPage + 1} -{" "}
                {currentPage * itemsPerPage} of {totalPages * itemsPerPage}
              </Text>
              <Badge tone="secondary" variant="soft" size="xs">
                Slice View
              </Badge>
            </Box>

            {mockItems.map((item, idx) => (
              <DemoSurface
                key={idx}
                tone="raised"
                radius="sm"
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text variant="bodySmall" weight="500">
                  {item}
                </Text>
                <Text variant="caption" color="textMuted">
                  #{(currentPage - 1) * itemsPerPage + idx + 1}
                </Text>
              </DemoSurface>
            ))}
          </DemoSurface>

          {/* Pagination Component */}
          <Box center style={{ paddingVertical: 6 }}>
            <Pagination
              page={currentPage}
              pageCount={totalPages}
              onPageChange={setCurrentPage}
            />
          </Box>

          <DemoReadout label="Selected Page Index" value={`Page ${currentPage}`} />
        </DemoCard>
      </Box>
    </Section>
  );
}
