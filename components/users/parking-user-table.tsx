"use client";
import {
  ReusableTable,
  indexColumn,
  statusColumn,
  actionsColumn,
  Column,
} from "@/components/tables";
import { User } from "@/lib/auth";
import { ParkingResponse } from "@/components/types";
import { PERMISSIONS } from "@/lib/permissions";

type Props = {
  users: User[];
  parkings: ParkingResponse[];
  loading?: boolean;
  onDetail?: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete?: (user: User) => void;
  onResetPassword?: (user: User) => void;
};

export function ParkingUserTable({
  users,
  parkings: parkings,
  loading,
  onDetail,
  onEdit,
  onDelete,
  onResetPassword,
}: Props) {
  // Helper to find which parking a user belongs to
  const getOwnedParkingName = (user: User) => {
    const parking = parkings.find((p) => p.id === user.orgId);
    return parking ? parking.name : "Unassigned";
  };

  const columns: Column<User>[] = [
    indexColumn<User>(),
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <span className="font-medium text-slate-700">{row.fullName}</span>
      ),
    },
    { key: "email", header: "Email" },
    {
      key: "phoneNumber",
      header: "Phone",
      render: (row) => row.phoneNumber || "-",
    },
    {
      key: "orgId",
      header: "Parking Name",
      render: (row) => (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-primary/5 text-primary border border-primary/10">
          {getOwnedParkingName(row)}
        </span>
      ),
    },
    statusColumn<User>(),
    actionsColumn<User>({
      onDetail,
      detailPermission: PERMISSIONS.USER_VIEW,
      onEdit,
      editPermission: PERMISSIONS.USER_UPDATE,
      onDelete,
      deletePermission: PERMISSIONS.USER_DELETE,
      onResetPassword,
      resetPasswordPermission: PERMISSIONS.SETTINGS_RESET_PASSWORD,
    }),
  ];

  return (
    <ReusableTable
      data={users}
      columns={columns}
      getRowKey={(row) => row.id}
      emptyText={
        loading ? "Loading parking users..." : "No parking users found"
      }
    />
  );
}
