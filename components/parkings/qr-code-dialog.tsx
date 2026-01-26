"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

interface QrCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parkingId: string;
  parkingName: string;
}

export function QrCodeDialog({
  open,
  onOpenChange,
  parkingId,
  parkingName,
}: QrCodeDialogProps) {
  // Use current window.location.origin to build absolute URL, or safe fallback
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/portal?parkingId=${parkingId}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code for {parkingName}</DialogTitle>
          <DialogDescription>
            Scan this code to enter the parking portal.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 space-y-4 printable-content">
          <div className="bg-white p-4 rounded shadow-lg border">
            <QRCode value={url} size={200} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
