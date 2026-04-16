"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reportUser } from "@/app/actions/moderation";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

const REASONS = [
  "Spam",
  "Harassment",
  "Impersonation",
  "Inappropriate content",
  "Other",
] as const;

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId?: string;
  reportedIntentId?: string;
  reportedConnectionId?: string;
}

export function ReportDialog({
  open,
  onOpenChange,
  reportedUserId,
  reportedIntentId,
  reportedConnectionId,
}: ReportDialogProps) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reason) return;
    setSubmitting(true);
    try {
      await reportUser({
        reportedUserId,
        reportedIntentId,
        reportedConnectionId,
        reason,
        details: details.trim() || undefined,
      });
      toast.success("Report submitted. We'll review it shortly.");
      onOpenChange(false);
      setReason("");
      setDetails("");
    } catch {
      toast.error("Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-surface-secondary border-white/8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-heading">
            <AlertTriangle className="size-5 text-amber-400" />
            Report
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Help us keep Manifest safe. Select a reason below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="space-y-1.5">
            {REASONS.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-2.5 cursor-pointer rounded-lg px-3 py-2 transition-all duration-200 ${
                  reason === r
                    ? "bg-white/6 border border-violet-500/30"
                    : "border border-transparent hover:bg-white/3"
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="premium-checkbox"
                />
                <span className="text-sm text-text-heading">{r}</span>
              </label>
            ))}
          </div>

          <Textarea
            placeholder="Additional details (optional)"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="bg-white/5 border-white/8 focus:border-violet-500/50 text-sm"
            rows={3}
          />

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reason || submitting}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white border-0 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Submit Report"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
