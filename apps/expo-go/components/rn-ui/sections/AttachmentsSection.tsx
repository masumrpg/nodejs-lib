import { Attachment, Box } from "@masumdev/rn-ui";
import { FileCode, X } from "lucide-react-native";
import { DemoCard, Section, type RnUiSectionContext } from "../shared";

export function AttachmentsSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { styles, icon } = ctx;

  return (
    <Section title="Attachments">
      <Box gap="lg">
        {/* 1. Grid Card Previews */}
        <DemoCard
          title="Image Attachment Cards"
          badge='layout="card"'
          badgeTone="primary"
          description="Visual attachment cards with image thumbnails, filenames, and file size metadata."
        >
          <Box row gap="sm" style={styles.wrap}>
            <Attachment
              layout="card"
              name="workspace.png"
              description="PNG • 820 KB"
              thumbnail="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=200&q=80"
            />
            <Attachment
              layout="card"
              name="design-mockup.jpg"
              description="JPG • 1.1 MB"
              thumbnail="https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=200&q=80"
            />
            <Attachment
              layout="card"
              name="brand-assets.jpg"
              description="JPG • 940 KB"
              thumbnail="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=200&q=80"
            />
          </Box>
        </DemoCard>

        {/* 2. Full-Width Row Previews */}
        <DemoCard
          title="Document Attachment Rows"
          badge='layout="row"'
          badgeTone="secondary"
          description="Full-width rows with upload progress indicator, dismiss actions, and custom file icons."
        >
          <Box gap="sm">
            <Attachment
              layout="row"
              name="q3-financial-report.pdf"
              description="Uploading • 64%"
              loading={true}
              onRemove={() => undefined}
              closeIcon={icon(X)}
            />
            <Attachment
              layout="row"
              name="theme-provider.tsx"
              description="TypeScript Source • 14 KB"
              thumbnail={icon(FileCode)}
              onRemove={() => undefined}
              closeIcon={icon(X)}
            />
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
