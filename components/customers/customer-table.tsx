"use client";
import {
  ReusableTable,
  indexColumn,
  statusColumn,
  actionsColumn,
  Column,
} from "@/components/tables";
import { User } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getImageUrl } from "@/lib/utils";

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
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-slate-100">
            <AvatarImage src={getImageUrl(row.profileImage)} />
            <AvatarFallback className="bg-primary/5 text-primary text-xs font-black">
              {row.fullName
                ?.split(" ")
                .map((n) => n[0])
                .join("") || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="font-bold text-slate-700">{row.fullName || ""}</span>
        </div>
      ),
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
