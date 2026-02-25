"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { userService } from "@/lib/services/user-service";
import { UserResponse } from "@/components/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DetailLayout,
  DetailSection,
  DetailItem,
} from "@/components/layouts/detail-layout";
import { toast } from "sonner";
import {
  User as UserIcon,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function UserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await userService.getUserById(id as string);
      if (response.data) {
        setUser(response.data);
      } else {
        toast.error("User not found");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    if (
      !confirm(
        `Are you sure you want to ${user.status === "ACTIVE" ? "disable" : "activate"
        } this user?`,
      )
    )
      return;

    try {
      const loadingToast = toast.loading("Updating status...");
      await userService.toggleUserStatus(user.id);
      toast.success("Status updated successfully", { id: loadingToast });
      loadData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const formatDateTime = (date?: Date | string) =>
    date ? new Date(date).toLocaleString() : "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 font-bold text-lg">User not found</p>
        </div>
      </div>
    );
  }

  const userPermissions = Array.isArray(user.permissions)
    ? user.permissions
    : [];

  return (
    <DetailLayout
      backLink={{ label: "User Management", href: "/dashboard/users" }}
      title="System User Profile"
      subtitle={`ID: ${String(user.id || "")
        .substring(0, 12)
        .toUpperCase()}`}
      noCard={true}
      actions={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={handleToggleStatus}
            className="bg-slate-100 hover:bg-slate-200 text-slate-900 rounded h-10 px-4 font-bold transition-all border border-slate-200"
          >
            {user.status === "ACTIVE" ? "Disable Account" : "Activate Account"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push(`/dashboard/users/${user.id}/edit`)}
            className="bg-primary hover:bg-primary/90 text-white rounded h-10 px-4 font-bold transition-all shadow-lg shadow-primary/10"
          >
            Edit Profile
          </Button>
          <Badge
            className={`h-10 px-5 rounded flex items-center justify-center font-black uppercase text-[10px] tracking-widest border-none ${user.status === "ACTIVE"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
              }`}
          >
            {String(user.status || "")}
          </Badge>
        </div>
      }
    >
      <DetailSection title="Staff User Detail">
        <DetailItem label="User Code" value={user.userCode || "—"} />
        <DetailItem label="Full Name" value={user.fullName || "—"} />
        <DetailItem label="Email" value={user.email || "—"} />
        <DetailItem label="Phone Number" value={user.phoneNumber || "—"} />
        <DetailItem label="Organization ID" value={user.orgId || "—"} />
        <DetailItem label="Is Staff User" value={user.isStaffUser ? "YES" : "NO"} />
        <DetailItem label="Role" value={user.role} />
        <DetailItem label="Phone Verified" value={user.isPhoneVerified ? "YES" : "NO"} />
        <DetailItem label="Email Verified" value={user.isEmailVerified ? "YES" : "NO"} />
        <DetailItem label="Status" value={user.status} />
        <DetailItem label="Profile Image" value={user.profileImage ? <Badge variant="outline" className="font-mono text-[10px]">{user.profileImage}</Badge> : "—"} />
        <DetailItem
          label="Permissions"
          value={userPermissions.length > 0 ? userPermissions.join(", ") : "None"}
          className="col-span-full"
        />
      </DetailSection>
    </DetailLayout>
  );
}

import { Label } from "@/components/ui/label";
