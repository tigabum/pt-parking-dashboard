"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { userService } from "@/lib/services/user-service";
import { parkingService } from "@/lib/services/parking-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  ShieldCheck,
  Shield,
  CheckCircle2,
  Clock,
  Calendar,
  ParkingCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { getImageUrl, cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DetailLayout,
  DetailSection,
  DetailItem,
} from "@/components/layouts/detail-layout";
import { PERMISSION_LABELS, PERMISSION_CATEGORIES } from "@/lib/permissions";
import { Label } from "@/components/ui/label";

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
        const allParkings = parkingsRes.data || (parkingsRes as any).parking || [];
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
        } this manager?`
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
          <p className="text-slate-500 font-medium">Loading parking user details...</p>
        </div>
      </div>
    );
  }

  if (!parkingUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 font-bold text-lg">Parking User not found</p>
        </div>
      </div>
    );
  }

  const userPermissions = Array.isArray(parkingUser.permissions) ? parkingUser.permissions : [];

  return (
    <DetailLayout
      backLink={{ label: "Parking Staff", href: "/dashboard/parking-users" }}
      title="Parking Manager Profile"
      subtitle={`ID: ${String(parkingUser.id || "")
        .substring(0, 12)
        .toUpperCase()}`}
      actions={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={handleToggleStatus}
            className="bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl h-10 px-4 font-bold transition-all border border-slate-200"
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
            className="bg-primary hover:bg-primary/90 text-white rounded-xl h-10 px-4 font-bold transition-all shadow-lg shadow-primary/10"
          >
            Edit Profile
          </Button>
          <Badge
            className={`h-10 px-5 rounded-xl flex items-center justify-center font-black uppercase text-[10px] tracking-widest border-none ${parkingUser.status === "ACTIVE"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
              }`}
          >
            {String(parkingUser.status || "")}
          </Badge>
        </div>
      }
    >
      <DetailSection title="Parking Manager Detail">
        <div className="col-span-1 md:col-span-2 lg:col-span-1 row-span-2">
          <div className="relative aspect-square w-48 rounded-[2.5rem] overflow-hidden border-2 border-slate-100 shadow-xl bg-slate-50 mx-auto lg:mx-0 p-1">
            <Avatar className="h-full w-full rounded-[2.2rem]">
              <AvatarImage src={getImageUrl(parkingUser.profileImage)} />
              <AvatarFallback className="bg-primary/5 text-primary text-5xl font-black">
                {String(parkingUser.fullName || "")
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("") || <User className="h-20 w-20" />}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <DetailItem
            label="Full Name"
            value={String(parkingUser.fullName || "")}
          />
          <DetailItem
            label="Access Role"
            value={
              <Badge
                variant="outline"
                className="uppercase tracking-wider font-bold text-primary border-primary/20 bg-primary/5"
              >
                <Shield className="h-3 w-3 mr-1" />
                {String(parkingUser.role || "").replace(/_/g, " ")}
              </Badge>
            }
          />

          <DetailItem
            label="Email Address"
            value={
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="font-mono text-sm">{String(parkingUser.email || "")}</span>
              </div>
            }
          />
          <DetailItem
            label="Phone Number"
            value={
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="font-mono text-sm">
                  {parkingUser.phoneNumber ? String(parkingUser.phoneNumber) : "Not provided"}
                </span>
              </div>
            }
          />
        </div>

        <DetailItem
          label="Account Status"
          value={
            <Badge
              className={cn(
                "font-bold",
                parkingUser.isPasswordSet ||
                  parkingUser.isEmailVerified ||
                  parkingUser.isPhoneVerified
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              )}
            >
              {parkingUser.isPasswordSet ||
                parkingUser.isEmailVerified ||
                parkingUser.isPhoneVerified
                ? "Active & Verified"
                : "Pending Setup"}
            </Badge>
          }
        />
        <DetailItem
          label="Email Verified"
          value={
            parkingUser.isEmailVerified ? (
              <Badge className="bg-green-100 text-green-700 font-bold">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-600 font-bold">Pending</Badge>
            )
          }
        />
        <DetailItem
          label="Phone Verified"
          value={
            parkingUser.isPhoneVerified ? (
              <Badge className="bg-green-100 text-green-700 font-bold">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-600 font-bold">Pending</Badge>
            )
          }
        />
        <DetailItem
          label="Password Set"
          value={
            parkingUser.isPasswordSet ? (
              <Badge className="bg-green-100 text-green-700 font-bold">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-600 font-bold">Not Set</Badge>
            )
          }
        />
        <DetailItem
          label="Registration Date"
          value={
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              {formatDateTime(parkingUser.createdAt)}
            </div>
          }
        />
        <DetailItem
          label="Last Updated"
          value={
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              {formatDateTime(parkingUser.updatedAt)}
            </div>
          }
        />

        <div className="col-span-full mt-8">
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 block">Assigned Parking Facility</Label>
          {assignedParking ? (
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-3xl p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
                    <ParkingCircle className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 mb-1">
                      {assignedParking.name}
                    </h3>
                    <Badge className="bg-green-100 text-green-700 border-none font-bold">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Active Assignment
                    </Badge>
                  </div>
                </div>
                <Button
                  onClick={() =>
                    router.push(`/dashboard/parkings/${assignedParking.id}`)
                  }
                  className="bg-white hover:bg-slate-50 text-primary rounded-xl font-bold shadow-lg"
                >
                  View Details
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-white/50">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                    <MapPin className="h-3 w-3" />
                    Location
                  </div>
                  <p className="text-slate-900 font-bold text-sm">
                    {[assignedParking.city, assignedParking.subCity, assignedParking.streetName].filter(Boolean).join(", ") || "Address not set"}
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-white/50">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                    <Building className="h-3 w-3" />
                    Capacity
                  </div>
                  <p className="text-slate-900 font-bold text-lg">
                    {assignedParking.numberOfSpots || 0} Spots
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-white/50">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                    <ParkingCircle className="h-3 w-3" />
                    Parking ID
                  </div>
                  <p className="text-slate-900 font-mono font-bold text-sm">
                    {assignedParking.id.substring(0, 12).toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm mb-4">
                <ShieldCheck className="h-8 w-8 text-slate-300" />
              </div>
              <h4 className="text-slate-900 font-bold text-lg mb-2">
                No Active Assignment
              </h4>
              <p className="text-slate-500 text-sm max-w-md mb-4">
                This manager is currently in the standby pool and not assigned to any parking facility.
              </p>
              <Button
                variant="outline"
                className="font-bold"
                onClick={() => router.push("/dashboard/parkings")}
              >
                Assign to Parking
              </Button>
            </div>
          )}
        </div>

        <div className="col-span-full mt-8">
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 block">Access Permissions</Label>
          {userPermissions.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(PERMISSION_CATEGORIES).map(([category, categoryPermissions]) => {
                const userCategoryPerms = categoryPermissions.filter(p => userPermissions.includes(p));

                if (userCategoryPerms.length === 0) return null;

                return (
                  <div key={category} className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                    <div className="flex items-center justify-between p-4 bg-primary/5 border-b border-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Shield className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-black text-slate-900">{category}</span>
                      </div>
                      <Badge variant="outline" className="font-bold text-xs">
                        {userCategoryPerms.length}/{categoryPermissions.length} permissions
                      </Badge>
                    </div>

                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {userCategoryPerms.map(permission => (
                        <div
                          key={permission}
                          className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span className="text-sm font-bold text-slate-700">
                            {PERMISSION_LABELS[permission]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm mb-4">
                <Shield className="h-8 w-8 text-slate-300" />
              </div>
              <h4 className="text-slate-900 font-bold text-lg mb-2">
                No Specific Permissions Assigned
              </h4>
              <p className="text-slate-500 text-sm max-w-md">
                This user may have role-based default permissions or requires permission assignment.
              </p>
            </div>
          )}
        </div>
      </DetailSection>
    </DetailLayout>
  );
}
