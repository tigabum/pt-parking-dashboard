"use client";
import {
  ReusableTable,
  indexColumn,
  statusColumn,
  actionsColumn,
  Column,
} from "@/components/tables";
import { User } from "@/lib/auth";

type Props = {
  owners: User[];
  loading?: boolean;
  onDetail: (owner: User) => void;
  onEdit: (owner: User) => void;
  onDelete: (owner: User) => void;
};

export function CustomerTable({
  owners,
  loading,
  onDetail,
  onEdit,
  onDelete,
}: Props) {
  const columns: Column<User>[] = [
    indexColumn<User>(),
    {
      key: "fullName",
      header: "Name",
      render: (row) => row.fullName || "",
    },
    { key: "email", header: "Email" },
    { key: "phoneNumber", header: "Phone" },
    statusColumn<User>(),
    actionsColumn<User>({
      onDetail,
      onEdit,
      onDelete,
    }),
  ];

  return (
    <ReusableTable
      data={owners}
      columns={columns}
      getRowKey={(row) => row.id}
      emptyText={loading ? "Loading owners..." : "No parking owners found"}
    />
  );
}
