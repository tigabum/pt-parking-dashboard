"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Eye, Banknote, PlayCircle } from "lucide-react";

import {
  ReusableTable,
  statusColumn,
  Column,
} from "@/components/tables";
import { BookingResponse, ParkingResponse } from "@/components/types";

const formatDateTime = (date?: string) =>
  date ? new Date(date).toLocaleString() : "—";

const formatMoney = (amount?: number, currency = "ETB") =>
  amount != null ? `${amount.toFixed(2)} ${currency}` : "—";

type Props = {
  bookings: BookingResponse[];
  parkings: ParkingResponse[];
  loading?: boolean;
  onConfirmPayment?: (row: BookingResponse) => void;
  onConfirmArrival?: (row: BookingResponse) => void;
};

import { useAuth } from "@/app/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";

function BookingActions({ row, onDetail, onConfirmPayment, onConfirmArrival }: { row: BookingResponse, onDetail: (r: BookingResponse) => void, onConfirmPayment?: (r: BookingResponse) => void, onConfirmArrival?: (r: BookingResponse) => void }) {
  const { hasPermission } = useAuth();
  const showConfirmPayment = row.paymentMethod === 'INCASH' && (row.status === 'PENDING' || row.status === 'COMPLETED') && hasPermission(PERMISSIONS.BOOKING_UPDATE);
  const showConfirmArrival = row.status === 'PENDING' && hasPermission(PERMISSIONS.BOOKING_UPDATE);
  const showDetail = hasPermission(PERMISSIONS.BOOKING_VIEW);

  if (!showDetail && !showConfirmPayment && !showConfirmArrival) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
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
          <DropdownMenuItem onClick={() => onConfirmArrival(row)}>
            <PlayCircle className="mr-2 h-4 w-4 text-primary" />
            <span>Confirm Arrival</span>
          </DropdownMenuItem>
        )}

        {showConfirmPayment && onConfirmPayment && (
          <DropdownMenuItem onClick={() => onConfirmPayment(row)}>
            <Banknote className="mr-2 h-4 w-4 text-emerald-500" />
            <span>Confirm Payment</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BookingsTable({
  bookings,
  parkings,
  loading,
  onConfirmPayment,
  onConfirmArrival,
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
      render: (row) => <BookingActions row={row} onDetail={onDetail} onConfirmPayment={onConfirmPayment} onConfirmArrival={onConfirmArrival} />
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
