"use client";
import {
  ReusableTable,
  indexColumn,
  statusColumn,
  actionsColumn,
  Column,
} from "@/components/tables";

type Props = {
  vehicles: any[];
  loading?: boolean;
  onDetail?: (vehicle: any) => void;
  onEdit?: (vehicle: any) => void;
  onDelete?: (vehicle: any) => void;
};

export function VehicleTable({
  vehicles,
  loading,
  onDetail,
  onEdit,
  onDelete,
}: Props) {
  const columns: Column<any>[] = [
    indexColumn<any>(),
    { key: "plateNumber", header: "Plate Number" },
    { key: "brand", header: "Brand" },
    { key: "model", header: "Model" },
    {
      key: "customer",
      header: "Owner",
      render: (row) => row.customer?.fullName || "N/A"
    },
    statusColumn<any>(),
    actionsColumn<any>({
      onDetail,
      onEdit,
      onDelete,
    }),
  ];

  return (
    <ReusableTable
      data={vehicles}
      columns={columns}
      getRowKey={(row) => row.id}
      emptyText={loading ? "Loading vehicles..." : "No vehicles found"}
    />
  );
}
