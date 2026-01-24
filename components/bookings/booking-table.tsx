"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Eye, Banknote, PlayCircle, Loader2, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatMoney } from "@/lib/utils";
import { useAuth } from "@/app/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";

import {
  ReusableTable,
  statusColumn,
  Column,
} from "@/components/tables";
import { BookingResponse, ParkingResponse } from "@/components/types";
import { LiveDurationCell } from "./live-duration-cell";

const formatDateTime = (date?: string) =>
  date ? new Date(date).toLocaleString() : "—";


type Props = {
  bookings: BookingResponse[];
  parkings: ParkingResponse[];
  loading?: boolean;
  onConfirmPayment?: (row: BookingResponse) => void;
  onConfirmArrival?: (row: BookingResponse) => void;
  onCancel?: (row: BookingResponse) => void;
  actionId?: string | null;
};

function ConfirmationPopup({
  trigger,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  confirmVariant = "default",
  open: externalOpen,
  onOpenChange: externalOnOpenChange
}: {
  trigger: React.ReactNode,
  onConfirm: () => void,
  title: string,
  description: string,
  confirmText?: string,
  confirmVariant?: "default" | "destructive" | "outline",
  open?: boolean,
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-5 rounded-[1.5rem] shadow-2xl border-slate-100 animate-in zoom-in-95 duration-200" align="end" side="top" sideOffset={10}>
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">{title}</h4>
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="flex-1 h-9 rounded-xl text-[10px] uppercase font-black tracking-wider"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant={confirmVariant as any}
              onClick={() => { onConfirm(); setOpen(false); }}
              className={cn(
                "flex-1 h-9 rounded-xl text-[10px] uppercase font-black tracking-wider",
                confirmVariant === 'default' && "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20",
                confirmVariant === 'destructive' && "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200"
              )}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BookingActions({ row, onDetail, onConfirmPayment, onConfirmArrival, onCancel, isBusy }: {
  row: BookingResponse,
  onDetail: (r: BookingResponse) => void,
  onConfirmPayment?: (r: BookingResponse) => void,
  onConfirmArrival?: (r: BookingResponse) => void,
  onCancel?: (r: BookingResponse) => void,
  isBusy?: boolean
}) {
  const { hasPermission } = useAuth();
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isArrivalOpen, setIsArrivalOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const showConfirmPayment = (row.status === 'PENDING' || row.status === 'WAITING_CONFIRMATION') && hasPermission(PERMISSIONS.BOOKING_UPDATE);
  const showConfirmArrival = row.status === 'PENDING' && hasPermission(PERMISSIONS.BOOKING_UPDATE);
  const showCancel = (row.status === 'PENDING' || row.status === 'ACTIVE' || row.status === 'WAITING_CONFIRMATION') && (hasPermission(PERMISSIONS.BOOKING_UPDATE) || hasPermission(PERMISSIONS.BOOKING_DELETE));
  const showDetail = hasPermission(PERMISSIONS.BOOKING_VIEW);

  if (!showDetail && !showConfirmPayment && !showConfirmArrival && !showCancel) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={isBusy}>
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <MoreVertical className="h-4 w-4" />}
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          {showDetail && (
            <DropdownMenuItem onClick={() => onDetail(row)}>
              <Eye className="mr-2 h-4 w-4 text-slate-400" />
              <span>View Detail</span>
            </DropdownMenuItem>
          )}

          {showConfirmArrival && onConfirmArrival && (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsArrivalOpen(true); }}>
              <PlayCircle className="mr-2 h-4 w-4 text-primary" />
              <span>Confirm Arrival</span>
            </DropdownMenuItem>
          )}

          {showConfirmPayment && onConfirmPayment && (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsPaymentOpen(true); }}>
              <Banknote className="mr-2 h-4 w-4 text-emerald-500" />
              <span>Confirm Payment</span>
            </DropdownMenuItem>
          )}

          {showCancel && onCancel && (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsCancelOpen(true); }} className="text-red-500 hover:text-red-600 focus:text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Cancel Booking</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="fixed opacity-0 pointer-events-none">
        <ConfirmationPopup
          open={isArrivalOpen}
          onOpenChange={setIsArrivalOpen}
          title="Confirm Arrival"
          description={`Start parking session for ${row.plateNumber} now?`}
          onConfirm={() => onConfirmArrival?.(row)}
          trigger={<div />}
        />
        <ConfirmationPopup
          open={isPaymentOpen}
          onOpenChange={setIsPaymentOpen}
          title="Confirm Payment"
          description={`Verify payment of ${Number(row.totalAmount).toFixed(2)} ETB for ${row.plateNumber}.`}
          onConfirm={() => onConfirmPayment?.(row)}
          trigger={<div />}
        />
        <ConfirmationPopup
          open={isCancelOpen}
          onOpenChange={setIsCancelOpen}
          title="Cancel Booking"
          description={`Are you sure you want to cancel booking ${row.referenceNo}? This will release the spot.`}
          confirmText="Cancel Booking"
          confirmVariant="destructive"
          onConfirm={() => onCancel?.(row)}
          trigger={<div />}
        />
      </div>
    </>
  );
}

export function BookingsTable({
  bookings,
  parkings,
  loading,
  onConfirmPayment,
  onConfirmArrival,
  onCancel,
  actionId,
}: Props) {
  const router = useRouter();
  const onDetail = (booking: BookingResponse) => router.push(`/dashboard/bookings/${booking.id}`);
  const geParkingName = (parkingId: string) =>
    parkings.find((s) => s.id === parkingId)?.name || "Unknown Space";

  const columns: Column<BookingResponse>[] = [
    {
      key: "referenceNo",
      header: "Booking Ref",
      render: (row) => row.referenceNo ?? "—",
    },

    {
      key: "parkingId",
      header: "Parking",
      render: (row) => row.parking?.name || geParkingName(row.parkingId),
    },

    {
      key: "customerName",
      header: "Customer",
    },

    {
      key: "customerPhone",
      header: "Phone",
    },

    {
      key: "plateNumber",
      header: "Plate No",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.plateNumber}</span>
          <span className="text-xs text-muted-foreground">{row.vehicleName || row.vehicleBrand || "—"}</span>
        </div>
      )
    },



    {
      key: "time",
      header: "Parking Time",
      render: (row) =>
        `${formatDateTime(row.startTime)} → ${row.endTime ? formatDateTime(row.endTime) : "Ongoing"
        }`,
    },

    {
      key: "totalAmount",
      header: "Total",
      render: (row) => formatMoney(Number(row.totalAmount)),
    },

    statusColumn<BookingResponse>(),

    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.status === 'WAITING_CONFIRMATION' && onConfirmPayment && (
            <ConfirmationPopup
              title="Confirm Payment"
              description={`Verify that payment of ${Number(row.totalAmount).toFixed(2)} ETB has been received for plate ${row.plateNumber}.`}
              onConfirm={() => onConfirmPayment?.(row)}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionId === row.id}
                  className="h-8 rounded-lg bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 hover:text-emerald-700 font-bold text-[10px] uppercase tracking-wider"
                >
                  {actionId === row.id ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Banknote className="h-3 w-3 mr-1" />
                  )}
                  Confirm
                </Button>
              }
            />
          )}
          <BookingActions
            row={row}
            onDetail={onDetail}
            onConfirmPayment={onConfirmPayment}
            onConfirmArrival={onConfirmArrival}
            onCancel={onCancel}
            isBusy={actionId === row.id}
          />
        </div>
      )
    }
  ];

  return (
    <ReusableTable
      data={bookings}
      columns={columns}
      getRowKey={(row) => row.id}
      emptyText={loading ? "Loading bookings..." : "No bookings found"}
    />
  );
}
