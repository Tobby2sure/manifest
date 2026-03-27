"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, MessageCircle, Mail } from "lucide-react";
import { getContactDetails } from "@/app/actions/connections";

interface ViewContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string | null;
  userId: string;
}

export function ViewContactDialog({
  open,
  onOpenChange,
  connectionId,
  userId,
}: ViewContactDialogProps) {
  const [contact, setContact] = useState<{
    telegram_handle: string | null;
    email: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (open && connectionId) {
      setLoading(true);
      getContactDetails(connectionId, userId)
        .then(setContact)
        .finally(() => setLoading(false));
    }
  }, [open, connectionId, userId]);

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-[#0e0e14] border-white/[0.08]">
        <DialogHeader>
          <DialogTitle>Contact Details</DialogTitle>
          <DialogDescription>
            Connection accepted. Here are their contact details.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : contact ? (
          <div className="space-y-3 mt-2">
            {contact.telegram_handle && (
              <div className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-4 text-blue-400" />
                  <div>
                    <p className="text-xs text-zinc-400">Telegram</p>
                    <p className="text-sm text-white/90">
                      @{contact.telegram_handle}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() =>
                    copyToClipboard(contact.telegram_handle!, "telegram")
                  }
                >
                  {copiedField === "telegram" ? (
                    <Check className="size-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-emerald-400" />
                  <div>
                    <p className="text-xs text-zinc-400">Email</p>
                    <p className="text-sm text-white/90">{contact.email}</p>
                  </div>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(contact.email!, "email")}
                >
                  {copiedField === "email" ? (
                    <Check className="size-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </div>
            )}
            {!contact.telegram_handle && !contact.email && (
              <p className="text-sm text-zinc-400 text-center py-4">
                No contact details available.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-400 text-center py-4">
            Unable to load contact details.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
