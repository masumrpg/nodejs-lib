import {
  Box,
  Button,
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  Text,
} from "@masumdev/rn-ui";
import { RotateCcw } from "lucide-react-native";
import { useState } from "react";
import { DemoCard, DemoReadout, Section, type RnUiSectionContext } from "../shared";

export function InputOTPSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { otpValue, setOtpValue, icon } = ctx;
  const [pinValue, setPinValue] = useState("4209");

  return (
    <Section title="InputOTP">
      <Box gap="lg">
        {/* Card 1: 6-Digit 2FA Verification */}
        <DemoCard
          title="Two-Factor Authentication"
          badge="6-Digit Code"
          badgeTone="primary"
          description="Verification PIN slots with animated caret, numeric keypad focus, and centered slot layout."
        >
          <Box gap="md" style={{ alignItems: "center" }}>
            <Text variant="bodySmall" color="textMuted" align="center">
              Enter the 6-digit verification code sent to masum@example.com
            </Text>

            <InputOTP value={otpValue} onChangeText={setOtpValue} maxLength={6}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSeparator />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            <Box row gap="sm" style={{ alignItems: "center", marginTop: 4 }}>
              <Button
                variant="ghost"
                tone="secondary"
                size="xs"
                leftIcon={icon(RotateCcw)}
                onPress={() => setOtpValue("")}
              >
                Resend Code
              </Button>
            </Box>

            <DemoReadout
              label="OTP Status"
              value={otpValue.length === 6 ? `Verified (${otpValue})` : `${otpValue.length}/6 digits`}
              tone={otpValue.length === 6 ? "success" : "muted"}
            />
          </Box>
        </DemoCard>

        {/* Card 2: 4-Digit Security PIN & Invalid State */}
        <DemoCard
          title="Security PIN & Validation"
          badge="4-Digit PIN"
          badgeTone="secondary"
          description="Compact 4-digit security PIN alongside danger border validation feedback."
        >
          <Box gap="lg" style={{ alignItems: "center" }}>
            <Box gap="xs" style={{ alignItems: "center" }}>
              <Text variant="caption" weight="600" color="textMuted">
                Card Access PIN
              </Text>
              <InputOTP value={pinValue} onChangeText={setPinValue} maxLength={4}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </Box>

            <Box gap="xs" style={{ alignItems: "center" }}>
              <Text variant="caption" weight="600" color="danger">
                Invalid / Expired Passcode
              </Text>
              <InputOTP value="9999" maxLength={4} invalid>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </Box>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
