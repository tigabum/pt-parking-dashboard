"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ReusableTable,
  statusColumn,
  actionsColumn,
  Column,
} from "@/components/tables";
import { ParkingResponse } from "@/components/types";
import { getImageUrl } from "@/lib/utils";
import { QrCode, Star, Image as ImageIcon } from "lucide-react";
import { QrCodeDialog } from "./qr-code-dialog";
import { PERMISSIONS } from "@/lib/permissions";

type Props = {
  spaces: ParkingResponse[];
  loading?: boolean;
  onEdit: (parking: ParkingResponse) => void;
  onDelete: (parking: ParkingResponse) => void;
};

export function ParkingSpacesTable({
  spaces,
  loading,
  onEdit,
  onDelete,
}: Props) {
  const router = useRouter();
  const onDetail = (parking: ParkingResponse) => router.push(`/dashboard/parkings/${parking.id}`);
  const [qrSpace, setQrSpace] = useState<ParkingResponse | null>(null);
  const formatMoney = (value?: number, currency = "ETB") =>
    value != null ? `${value} ${currency}` : "—";


  const columns: Column<ParkingResponse>[] = [
    // indexColumn<ParkingResponse>(), // Removed as requested

    {
      key: "parkingCode",
      header: "Code",
      render: (row) => <span className="font-mono font-bold text-primary">{row.parkingCode || "—"}</span>,
    },
    {
      key: "name",
      header: "Parking Name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
            {row.featureImage ? (
              <img
                src={getImageUrl(row.featureImage)}
                className="h-full w-full object-cover"
                alt={row.name}
              />
            ) : (
              <div className="text-slate-300">
                <span className="text-[10px] font-black uppercase tracking-tighter">IMG</span>
              </div>
            )}
          </div>
          <span className="font-bold text-slate-900">{row.name}</span>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{row.region || "—"} / {row.city || "—"}</span>
          <div className="flex gap-1 text-[10px] text-slate-500 font-medium whitespace-nowrap overflow-hidden">
            {row.woreda && <span>W: {row.woreda}</span>}
            {row.kebele && <span>K: {row.kebele}</span>}
            {row.streetName && <span className="truncate">• {row.streetName}</span>}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {row.lat ? Number(row.lat).toFixed(4) : "0.0000"}, {row.lng ? Number(row.lng).toFixed(4) : "0.0000"}
          </span>
        </div>
      )
    },

    {
      key: "spots",
      header: "Capacity Analysis",
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-amber-600">{row.numberOfSpots}</span>
            <span className="text-[9px] font-bold text-amber-600/50 uppercase tracking-tight">Total Spots</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-emerald-600">{row.availableSpots}</span>
            <span className="text-[9px] font-bold text-emerald-600/50 uppercase tracking-tight">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-red-600">{row.numberOfSpots - (row.availableSpots ?? 0)}</span>
            <span className="text-[9px] font-bold text-red-600/50 uppercase tracking-tight">Occupied</span>
          </div>
        </div>
      )
    },
    {
      key: "parkingType",
      header: "Type",
      render: (row) => (
        <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold uppercase text-slate-600">
          {row.parkingType || "PUBLIC"}
        </span>
      )
    },
    {
      key: "pricing",
      header: "Base Rate",
      render: (row) => formatMoney(row.pricing?.hourly?.price || row.pricing?.flat?.price)
    },


    /* {
      key: "reviews",
      header: "Reviews",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg border border-amber-100/50">
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            <span className="text-xs font-bold text-amber-700">{row.averageRating != null ? Number(row.averageRating).toFixed(1) : "0.0"}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">({row.ratingsCount || 0})</span>
        </div>
      )
    }, */
    {
      key: "qr",
      header: "QR",
      render: (row) => (
        <button
          onClick={() => setQrSpace(row)}
          className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
          title="Show QR Code"
        >
          <QrCode className="h-4 w-4" />
        </button>
      ),
    },

    statusColumn<ParkingResponse>(),
    actionsColumn<ParkingResponse>({
      onDetail,
      detailPermission: PERMISSIONS.PARKING_VIEW,
      onEdit,
      editPermission: PERMISSIONS.PARKING_UPDATE,
      onDelete,
      deletePermission: PERMISSIONS.PARKING_DELETE,
    }),
  ];

  return (
    <>
      <ReusableTable
        data={spaces}
        columns={columns}
        getRowKey={(row) => row.id}
        emptyText={loading ? "Loading parkings..." : "No parkings found"}
      />

      {qrSpace && (
        <QrCodeDialog
          open={!!qrSpace}
          onOpenChange={(open) => !open && setQrSpace(null)}
          parkingId={qrSpace.id}
          parkingName={qrSpace.name}
        />
      )}
    </>
  );
}
