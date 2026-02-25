"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { userService } from "@/lib/services/user-service";
import { parkingService } from "@/lib/services/parking-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DetailLayout,
  DetailSection,
  DetailItem,
  FormDetailItem,
} from "@/components/layouts/detail-layout";
import {
  User as UserIcon,
  AlertCircle,
  Mail,
  Phone,
  Shield,
  Building2,
  CheckCircle2,
  Calendar,
  Clock,
  ParkingCircle,
} from "lucide-react";
import { cn, getImageUrl } from "@/lib/utils";

export default function ParkingUserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [parkingUser, setManager] = useState<any | null>(null);
  const [assignedParking, setAssignedParking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userRes, parkingsRes] = await Promise.all([
        userService.getUserById(id as string),
        parkingService.getAllParking({ limit: 1000 }),
      ]);

      if (userRes.data) {
        const userData = userRes.data;
        setManager(userData);
        // Find assigned parking by orgId
        const allParkings =
          parkingsRes.data || (parkingsRes as any).parking || [];
        const parking = allParkings.find((p: any) => p.id === userData.orgId);
        setAssignedParking(parking || null);
      } else {
        toast.error("Manager not found");
      }
    } catch (err) {
      toast.error("Failed to load manager details");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!parkingUser) return;
    if (
      !confirm(
        `Are you sure you want to ${parkingUser.status === "ACTIVE" ? "disable" : "activate"
        } this manager?`,
      )
    )
      return;

    try {
      const loadingToast = toast.loading("Updating status...");
      await userService.toggleUserStatus(parkingUser.id);
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
          <p className="text-slate-500 font-medium">
            Loading parking user details...
          </p>
        </div>
      </div>
    );
  }

  if (!parkingUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 font-bold text-lg">
            Parking User not found
          </p>
        </div>
      </div>
    );
  }

  const userPermissions = Array.isArray(parkingUser.permissions)
    ? parkingUser.permissions
    : [];

  return (
    <DetailLayout
      backLink={{ label: "Parking Staff", href: "/dashboard/parking-users" }}
      title="Parking Manager Profile"
      subtitle={`ID: ${String(parkingUser.id || "")
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
            {parkingUser.status === "ACTIVE"
              ? "Disable Account"
              : "Activate Account"}
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              router.push(`/dashboard/parking-users/${parkingUser.id}/edit`)
            }
            className="bg-primary hover:bg-primary/90 text-white rounded h-10 px-4 font-bold transition-all shadow-lg shadow-primary/10"
          >
            Edit Profile
          </Button>
          <Badge
            className={`h-10 px-5 rounded flex items-center justify-center font-black uppercase text-[10px] tracking-widest border-none ${parkingUser.status === "ACTIVE"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
              }`}
          >
            {String(parkingUser.status || "")}
          </Badge>
        </div>
      }
    >
      <div className="bg-white rounded md:rounded-xl border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3">
          {/* Left Column: Profile & Assignment Info */}
          <div className="lg:col-span-1 p-6 md:p-10 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/30 space-y-8 md:space-y-10">
            {/* Profile Photo */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Profile Identity
              </h3>
              <div className="flex flex-col items-center">
                <div className="h-48 w-48 rounded-full border-8 border-white shadow-2xl flex items-center justify-center bg-slate-200 overflow-hidden relative">
                  {parkingUser.profileImage ? (
                    <img
                      src={getImageUrl(parkingUser.profileImage)}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-20 w-20 text-slate-400" />
                  )}
                </div>
                <div className="mt-6 text-center">
                  <p className="text-xl font-black text-slate-900 leading-none">
                    {parkingUser.fullName}
                  </p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                    {parkingUser.userCode || "No Registry ID"}
                  </p>
                </div>
              </div>
            </div>

            {/* Assignment Info */}
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ParkingCircle className="h-4 w-4" />
                Registry Assignment
              </h3>
              <div className="space-y-4">
                <FormDetailItem
                  label="Target Site"
                  value={assignedParking?.name || "Unassigned"}
                  icon={ParkingCircle}
                />
                <FormDetailItem
                  label="Site Organization ID"
                  value={parkingUser.orgId || "N/A"}
                  icon={Building2}
                />
                <FormDetailItem
                  label="Manager Access Level"
                  value={parkingUser.role}
                  icon={Shield}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Contact Info & Permissions */}
          <div className="lg:col-span-2 p-6 md:p-12 space-y-10 md:space-y-12 bg-white">
            {/* Personal Information */}
            <div className="space-y-6 md:space-y-8">
              <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                <div className="p-2.5 bg-primary/10 text-primary rounded">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                    Manager Information
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                    Direct staff contact registration
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                <FormDetailItem
                  label="Corporate Email"
                  value={parkingUser.email}
                  icon={Mail}
                  className="md:col-span-2"
                />
                <FormDetailItem
                  label="Direct Contact"
                  value={parkingUser.phoneNumber || "Not Provisioned"}
                  icon={Phone}
                />
                <FormDetailItem
                  label="Current Registry Status"
                  value={parkingUser.status}
                  className="capitalize"
                />
                <FormDetailItem
                  label="Email Verification"
                  value={parkingUser.isEmailVerified ? "VERIFIED" : "PENDING"}
                  icon={CheckCircle2}
                />
                <FormDetailItem
                  label="Phone Verification"
                  value={parkingUser.isPhoneVerified ? "VERIFIED" : "PENDING"}
                  icon={CheckCircle2}
                />
                <FormDetailItem
                  label="Registry Created"
                  value={formatDateTime(parkingUser.createdAt)}
                  icon={Calendar}
                />
                <FormDetailItem
                  label="Last Information Update"
                  value={formatDateTime(parkingUser.updatedAt)}
                  icon={Clock}
                />
              </div>
            </div>

            {/* Site Capabilities */}
            <div className="space-y-8 pt-8 border-t border-slate-50">
              <div className="flex items-center gap-4">
                <div className="h-1 w-12 rounded-full bg-primary/20" />
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                  Site Capabilities
                </h3>
              </div>
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tight mb-4">
                  Operation Permission Registry
                </p>
                {userPermissions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userPermissions.map((perm: string) => (
                      <Badge
                        key={perm}
                        variant="outline"
                        className="bg-white text-slate-700 border-slate-200 font-bold uppercase text-[10px] h-8 px-3"
                      >
                        {perm.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-400 italic">
                    Inheriting standard role permissions for this site.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DetailLayout>
  );
}
