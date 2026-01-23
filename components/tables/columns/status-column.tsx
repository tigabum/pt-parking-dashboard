import { Column } from "../types";

const statusColorMap: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  PAID: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-red-100 text-red-700",
  EXPIRED: "bg-slate-100 text-slate-700",
  REFUNDED: "bg-indigo-100 text-indigo-700",
  DISABLED: "bg-gray-100 text-gray-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  // Legacy values for backward compatibility
  Active: "bg-blue-100 text-blue-700",
  Pending: "bg-amber-100 text-amber-700",
  InActive: "bg-gray-100 text-gray-600",
};

export const statusColumn = <T extends { status?: string }>(): Column<T> => ({
  key: "status",
  header: "Status",
  render: (row) => (
    <span
      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${row.status ? statusColorMap[row.status] : statusColorMap["InActive"]
        }`}
    >
      {row.status || "InActive"}
    </span>
  ),
});
