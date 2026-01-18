"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ParkingFormProps,
  ParkingStatus,
  ParkingType,
  Commission
} from "../types";
import {
  X,
  Image as ImageIcon,
  Loader2,
  Check,
  Plus,
  FileText,
  Search,
  Crosshair
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/context/auth-context";
import { UserRole } from "@/lib/auth";
import { getImageUrl } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

/* ================= TYPES ================= */
declare global {
  interface Window {
    google: any;
  }
}

let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  googleMapsPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if ((window as any).google?.maps) return resolve();

    // Check if script already exists in the DOM to prevent duplicates
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      if ((window as any).google?.maps) return resolve();
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    if (!apiKey) {
      const error = "Google Maps API Key is missing in environment variables.";
      console.error(error);
      return reject(new Error(error));
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (e) => {
      googleMapsPromise = null; // Allow retry on error
      reject(e);
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export function ParkingForm({
  initialData,
  onSave,
  onOpenChange,
  isLoading = false,
}: ParkingFormProps) {
  const [locating, setLocating] = useState(false);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mapInstanceRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<any>(null);
  const { canAccess } = useAuth();
  const isSuperAdmin = canAccess([UserRole.SYSTEM_SUPER_ADMIN]);

  // Load commissions
  useEffect(() => {
    const loadCommissions = async () => {
      try {
        const { commissionService } = await import("@/lib/services/commission-service");
        const res = await commissionService.getCommissions({ limit: 1000 });
        if (res && res.success && Array.isArray(res.data)) {
          setCommissions(res.data);
        }
      } catch (error) {
        console.error("Failed to load commissions:", error);
      }
    };
    loadCommissions();
  }, []);

  const [form, setForm] = useState<any>(() => {
    const defaults = {
      // Basic Information
      name: "",
      parkingCode: "",
      parkingType: ParkingType.PUBLIC,
      description: "",
      status: ParkingStatus.PENDING,
      licenseNumber: "",
      vatRegistrationNumber: "",
      numberOfSpots: 0,

      // Location
      country: "Ethiopia",
      city: "",
      region: "",
      subCity: "",
      woreda: "",
      kebele: "",
      streetName: "",
      lat: 9.03,
      lng: 38.74,

      // Media & Files
      featureImage: null,
      galleryImages: [],
      licenseFiles: [],
      agreementDocuments: [],
      tinNumber: "",
      amenities: [],
      isIndoor: true,
      isVatIncluded: false,
      pricing: {
        hourly: { price: 0, discount: 0, currency: "ETB" },
        daily: { price: 0, discount: 0, currency: "ETB" },
        monthly: { price: 0, discount: 0, currency: "ETB" },
        flat: { price: 0, discount: 0, currency: "ETB" },
      },
    };

    if (initialData) {
      return {
        ...defaults,
        ...initialData,
        pricing: initialData.pricing || defaults.pricing,
        licenseFiles: initialData.licenseFiles || [],
        galleryImages: initialData.galleryImages || [],
        agreementDocuments: initialData.agreementDocuments || [],
        commissionConfigId: initialData.commissionConfig?.id,
      };
    }
    return defaults;
  });

  useEffect(() => {
    if (initialData) {
      setForm((prev: any) => ({
        ...prev,
        ...initialData,
        pricing: initialData.pricing || prev.pricing,
        licenseFiles: initialData.licenseFiles || [],
        galleryImages: initialData.galleryImages || [],
        agreementDocuments: initialData.agreementDocuments || [],
        commissionConfigId: initialData.commissionConfig?.id,
      }));
    }
  }, [initialData]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setCenter(currentPos);
          mapInstanceRef.current.setZoom(18);
          markerRef.current.setPosition(currentPos);
          markerRef.current.setAnimation(window.google.maps.Animation.DROP);

          setForm((f: any) => ({
            ...f,
            lat: currentPos.lat,
            lng: currentPos.lng,
          }));
          toast.success("Location updated successfully");
        }
        setLocating(false);
      },
      (error) => {
        console.warn("Geolocation error:", error);
        let errorMsg = "Unable to get your location";
        if (error.code === 1) errorMsg = "Location permission denied";
        else if (error.code === 2) errorMsg = "Location unavailable";
        else if (error.code === 3) errorMsg = "Location request timeout";
        toast.error(errorMsg);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = async () => {
      try {
        await loadGoogleMaps();
        if (!window.google) return;

        let center = { lat: Number(form.lat), lng: Number(form.lng) };

        const map = new window.google.maps.Map(mapRef.current!, {
          center,
          zoom: 16,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: false,
        });
        mapInstanceRef.current = map;

        markerRef.current = new window.google.maps.Marker({
          position: center,
          map,
          draggable: true,
        });

        const addListeners = (map: any) => {
          map.addListener("click", (e: any) => {
            if (!e.latLng || (!isSuperAdmin && initialData)) return;
            markerRef.current.setPosition(e.latLng);
            setForm((f: any) => ({
              ...f,
              lat: e.latLng.lat(),
              lng: e.latLng.lng(),
            }));
          });

          markerRef.current.addListener("dragend", (e: any) => {
            if (!isSuperAdmin && initialData) {
              markerRef.current.setPosition({ lat: Number(form.lat), lng: Number(form.lng) });
              return;
            }
            setForm((f: any) => ({
              ...f,
              lat: e.latLng.lat(),
              lng: e.latLng.lng(),
            }));
          });
        };

        addListeners(map);

        // Setup Search Box
        if (searchInputRef.current) {
          const autocomplete = new window.google.maps.places.Autocomplete(
            searchInputRef.current
          );
          autocomplete.bindTo("bounds", map);
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) return;

            map.setCenter(place.geometry.location);
            map.setZoom(18);
            markerRef.current.setPosition(place.geometry.location);

            setForm((f: any) => ({
              ...f,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            }));
          });
        }

        // Auto-locate only if creating new and user hasn't interated yet (roughly)
        // Actually, for single page, allow manual trigger or just init at default/props
        if (!initialData) {
          // Optional: auto-locate on load? maybe distracting. Let's let user click button.
          // handleLocateMe(); 
        }
      } catch (error) {
        console.error("Map initialization failed:", error);
      }
    };



    initMap();
  }, [mapRef.current]); // Ensure map inits once ref is ready

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name?.trim()) newErrors.name = "Parking Name is required";
    if (!form.numberOfSpots || form.numberOfSpots <= 0) newErrors.numberOfSpots = "Total spots must be greater than 0";
    if (!form.region?.trim()) newErrors.region = "Region is required";
    if (!form.city?.trim()) newErrors.city = "City is required";
    if (!form.lat || !form.lng) {
      newErrors.map = "Accurate map location (latitude/longitude) is required";
      toast.error("Please set a location on the map");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async () => {
    if (!validate()) {
      toast.error("Please fill in all required fields marked in red");
      return;
    }
    await onSave(form);
  };

  const removeGalleryImage = (index: number) => {
    setForm((prev: any) => ({
      ...prev,
      galleryImages: prev.galleryImages.filter(
        (_: any, i: number) => i !== index
      ),
    }));
  };

  const removeLicenseFile = (index: number) => {
    setForm((prev: any) => ({
      ...prev,
      licenseFiles: prev.licenseFiles.filter(
        (_: any, i: number) => i !== index
      ),
    }));
  };





  return (
    <div className="w-full h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 md:px-8 py-4 md:py-5 shrink-0 bg-white border-b shadow-sm z-20">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900">
            {initialData ? "Update Parking" : "Create New Parking"}
          </h2>
          <p className="text-xs md:text-sm text-slate-500 font-medium">
            Fill in the details to register a location.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Buttons moved to footer */}
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto p-3 md:p-8 pb-32">
          <div className="bg-white p-5 md:p-10 rounded-2xl md:rounded-3xl border shadow-sm space-y-8 md:space-y-12">

            {/* SECTION 1: BASIC INFO */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <div className="w-1 h-6 bg-indigo-500 rounded-full" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Parking Name *</Label>
                  <Input
                    className={`h-12 rounded-xl bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-70 ${errors.name ? "border-red-500 bg-red-50" : ""}`}
                    placeholder="e.g. Bole Medhanialem Parking"
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: "" });
                    }}
                    disabled={!isSuperAdmin && !!initialData}
                  />
                  {errors.name && <p className="text-xs text-red-500 font-medium mt-1">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">License Number</Label>
                  <Input
                    className="h-12 rounded-xl bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-70"
                    placeholder="e.g. LIC-ADD-2321"
                    value={form.licenseNumber}
                    onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                    disabled={!isSuperAdmin && !!initialData}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Total Spots *</Label>
                  <Input
                    type="number"
                    className={`h-12 rounded-xl bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-70 ${errors.numberOfSpots ? "border-red-500 bg-red-50" : ""}`}
                    placeholder="0"
                    value={form.numberOfSpots}
                    onChange={(e) => {
                      setForm({ ...form, numberOfSpots: +e.target.value, availableSpots: +e.target.value });
                      if (errors.numberOfSpots) setErrors({ ...errors, numberOfSpots: "" });
                    }}
                    disabled={!isSuperAdmin && !!initialData}
                  />
                  {errors.numberOfSpots && <p className="text-xs text-red-500 font-medium mt-1">{errors.numberOfSpots}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Parking Type</Label>
                  <Select
                    value={form.parkingType}
                    onValueChange={(val) => setForm({ ...form, parkingType: val })}
                    disabled={!isSuperAdmin && !!initialData}
                  >
                    <SelectTrigger className="w-full h-12 rounded-xl bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-70">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ParkingType).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Commission Configuration</Label>
                  <Select
                    value={form.commissionConfigId || "none"}
                    onValueChange={(val) =>
                      setForm({ ...form, commissionConfigId: val === "none" ? null : val })
                    }
                    disabled={!isSuperAdmin && !!initialData}
                  >
                    <SelectTrigger className="w-full h-12 rounded-xl bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-70">
                      <SelectValue placeholder="Select commission policy (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {commissions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 space-y-2">
                  <Label className="text-sm font-semibold">Description</Label>
                  <Textarea
                    className="rounded-xl bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white transition-all min-h-[140px] resize-none disabled:opacity-70"
                    placeholder="Briefly describe the assigned parking..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    disabled={!isSuperAdmin && !!initialData}
                  />
                </div>
                <div className="col-span-1 space-y-2">
                  <Label className="text-sm font-semibold">Amenities (comma separated)</Label>
                  <Textarea
                    className="rounded-xl bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white transition-all min-h-[140px] resize-none disabled:opacity-70"
                    placeholder="e.g. WiFi, CCTV, Security, 24/7"
                    value={form.amenities?.map((a: any) => typeof a === 'string' ? a : a.name).join(", ") || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const arr = val.split(",").map((i) => i.trim()).filter((i) => i !== "");
                      setForm({ ...form, amenities: arr.map(name => ({ name })) });
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* SECTION 2: ADDRESS INFO */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <div className="w-1 h-6 bg-indigo-500 rounded-full" />
                Address Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600">Country</Label>
                  <Input
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="h-12 rounded-xl bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white disabled:opacity-70"
                    disabled={!isSuperAdmin && !!initialData}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600">Region *</Label>
                  <Input
                    value={form.region}
                    onChange={(e) => {
                      setForm({ ...form, region: e.target.value });
                      if (errors.region) setErrors({ ...errors, region: "" });
                    }}
                    className={`h-12 rounded-xl bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white disabled:opacity-70 ${errors.region ? "border-red-500 bg-red-50" : ""}`}
                    placeholder="e.g. Addis Ababa"
                    disabled={!isSuperAdmin && !!initialData}
                  />
                  {errors.region && <p className="text-xs text-red-500 font-medium mt-1">{errors.region}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600">City *</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => {
                      setForm({ ...form, city: e.target.value });
                      if (errors.city) setErrors({ ...errors, city: "" });
                    }}
                    className={`h-12 rounded-xl bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white disabled:opacity-70 ${errors.city ? "border-red-500 bg-red-50" : ""}`}
                    disabled={!isSuperAdmin && !!initialData}
                  />
                  {errors.city && <p className="text-xs text-red-500 font-medium mt-1">{errors.city}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600">Sub-city</Label>
                  <Input
                    value={form.subCity}
                    onChange={(e) => setForm({ ...form, subCity: e.target.value })}
                    className="h-12 rounded-xl bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white disabled:opacity-70"
                    disabled={!isSuperAdmin && !!initialData}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600">Woreda</Label>
                  <Input
                    value={form.woreda}
                    onChange={(e) => setForm({ ...form, woreda: e.target.value })}
                    className="h-12 rounded-xl bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white disabled:opacity-70"
                    placeholder="e.g. 01"
                    disabled={!isSuperAdmin && !!initialData}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600">Kebele</Label>
                  <Input
                    value={form.kebele}
                    onChange={(e) => setForm({ ...form, kebele: e.target.value })}
                    className="h-12 rounded-xl bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white disabled:opacity-70"
                    placeholder="e.g. 03"
                    disabled={!isSuperAdmin && !!initialData}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600">Street Name</Label>
                  <Input
                    value={form.streetName}
                    onChange={(e) => setForm({ ...form, streetName: e.target.value })}
                    className="h-12 rounded-xl bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white disabled:opacity-70"
                    disabled={!isSuperAdmin && !!initialData}
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* SECTION 3: MAP */}
            <div className="space-y-6">
              <div className="px-1 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-1 h-6 bg-indigo-500 rounded-full" />
                  Exact Map Location
                </h3>
                <div className="flex gap-4 text-xs font-mono">
                  <div className="px-3 py-1 bg-slate-100 rounded-lg">
                    <span className="text-slate-400 mr-2">LAT:</span>
                    <span className="font-bold text-indigo-600">{Number(form.lat).toFixed(6)}</span>
                  </div>
                  <div className="px-3 py-1 bg-slate-100 rounded-lg">
                    <span className="text-slate-400 mr-2">LNG:</span>
                    <span className="font-bold text-indigo-600">{Number(form.lng).toFixed(6)}</span>
                  </div>
                </div>
              </div>

              <div className={`relative w-full h-[300px] md:h-[500px] rounded-xl md:rounded-2xl overflow-hidden border ${errors.map ? "border-red-500 ring-2 ring-red-200" : "border-slate-200"} group`}>
                <div ref={mapRef} className="w-full h-full bg-slate-100" />

                {!isSuperAdmin && initialData && (
                  <div className="absolute inset-0 bg-black/5 z-20 cursor-not-allowed items-center justify-center flex">
                    <div className="bg-white/80 backdrop-blur px-3 md:px-4 py-1.5 md:py-2 rounded-lg border shadow-sm font-bold text-[10px] md:text-xs text-slate-500 uppercase tracking-widest">
                      Location Lock (Superadmin Only)
                    </div>
                  </div>
                )}

                <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10 w-[calc(100%-1.5rem)] md:w-[calc(100%-2rem)] max-w-[280px] md:max-w-sm">
                  <div className="relative shadow-xl">
                    <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search location..."
                      className="w-full h-10 md:h-12 pl-10 md:pl-12 pr-4 rounded-xl border-none bg-white font-medium text-xs md:text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:cursor-not-allowed"
                      disabled={!isSuperAdmin && !!initialData}
                    />
                  </div>
                </div>

                <div className="absolute bottom-4 right-3 md:bottom-6 md:right-4 flex flex-col gap-2 md:gap-3">
                  <Button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={!isSuperAdmin && !!initialData}
                    className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white text-indigo-600 shadow-xl hover:bg-slate-50 border border-slate-100 disabled:opacity-50"
                  >
                    {locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crosshair className="h-5 w-5 md:h-6 md:w-6" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* SECTION 4: PRICING */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <div className="w-1 h-6 bg-indigo-500 rounded-full" />
                Pricing Configuration
              </h3>

              <div className="space-y-4">
                {/* HOURLY */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                    Hourly Rate
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold ml-1">Price (ETB)</span>
                      <Input
                        type="number"
                        className="h-10 bg-white"
                        placeholder="0"
                        value={form.pricing.hourly?.price}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            pricing: {
                              ...form.pricing,
                              hourly: {
                                ...form.pricing.hourly,
                                price: +e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold ml-1">Discount (%)</span>
                      <Input
                        type="number"
                        className="h-10 bg-white"
                        placeholder="0"
                        value={form.pricing.hourly?.discount}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            pricing: {
                              ...form.pricing,
                              hourly: {
                                ...form.pricing.hourly,
                                discount: +e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* DAILY */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                    Daily Rate
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold ml-1">Price (ETB)</span>
                      <Input
                        type="number"
                        className="h-10 bg-white"
                        placeholder="0"
                        value={form.pricing.daily?.price}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            pricing: {
                              ...form.pricing,
                              daily: {
                                ...form.pricing.daily,
                                price: +e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold ml-1">Discount (%)</span>
                      <Input
                        type="number"
                        className="h-10 bg-white"
                        placeholder="0"
                        value={form.pricing.daily?.discount}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            pricing: {
                              ...form.pricing,
                              daily: {
                                ...form.pricing.daily,
                                discount: +e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* MONTHLY */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                    Monthly Rate
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold ml-1">Price (ETB)</span>
                      <Input
                        type="number"
                        className="h-10 bg-white"
                        placeholder="0"
                        value={form.pricing.monthly?.price}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            pricing: {
                              ...form.pricing,
                              monthly: {
                                ...form.pricing.monthly,
                                price: +e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold ml-1">Discount (%)</span>
                      <Input
                        type="number"
                        className="h-10 bg-white"
                        placeholder="0"
                        value={form.pricing.monthly?.discount}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            pricing: {
                              ...form.pricing,
                              monthly: {
                                ...form.pricing.monthly,
                                discount: +e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* FLAT RATE */}
                <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 space-y-3">
                  <Label className="text-xs font-bold uppercase text-indigo-500 tracking-wider">
                    Flat Rate (Single Charge)
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] text-indigo-400 font-bold ml-1">Price (ETB)</span>
                      <Input
                        type="number"
                        className="h-10 bg-white"
                        placeholder="0"
                        value={form.pricing.flat?.price}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            pricing: {
                              ...form.pricing,
                              flat: {
                                ...form.pricing.flat,
                                price: +e.target.value,
                                currency: "ETB"
                              },
                            },
                          })
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] text-indigo-400 font-bold ml-1">Discount (%)</span>
                      <Input
                        type="number"
                        className="h-10 bg-white"
                        placeholder="0"
                        value={form.pricing.flat?.discount}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            pricing: {
                              ...form.pricing,
                              flat: {
                                ...form.pricing.flat,
                                discount: +e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Indoor Parking</Label>
                  <p className="text-xs text-slate-500">Is this an indoor assigned parking?</p>
                </div>
                <Switch
                  checked={form.isIndoor}
                  onCheckedChange={(c) => setForm({ ...form, isIndoor: c })}
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">VAT Included</Label>
                  <p className="text-xs text-slate-500">Are prices inclusive of VAT (15%)?</p>
                </div>
                <Switch
                  checked={form.isVatIncluded}
                  onCheckedChange={(c) => setForm({ ...form, isVatIncluded: c })}
                  disabled={!isSuperAdmin && !!initialData}
                />
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* SECTION 5: MEDIA */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <div className="w-1 h-6 bg-indigo-500 rounded-full" />
                Media & Verification
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Feature Image */}
                <div className="space-y-4">
                  <Label className="text-sm font-bold text-slate-700">Cover Image</Label>
                  <div className="relative w-full h-64 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 bg-slate-50 hover:border-indigo-500 hover:bg-indigo-50/10 transition-all group flex flex-col items-center justify-center text-center cursor-pointer">
                    {form.featureImage ? (
                      <>
                        <img
                          src={form.featureImage instanceof File ? URL.createObjectURL(form.featureImage) : getImageUrl(form.featureImage as string)}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all z-10">
                          <span className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold border border-white/30 pointer-events-none">Change Cover</span>
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all z-20">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setForm({ ...form, featureImage: null });
                            }}
                            className="h-8 w-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-lg"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-slate-400">
                        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-indigo-500 group-hover:scale-110 transition-transform">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                        <span className="text-sm font-bold text-slate-600">Upload Cover Photo</span>
                        <span className="text-xs text-slate-400 mt-1">Recommended 1200x800px</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer z-0"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setForm({ ...form, featureImage: file });
                      }}
                    />
                  </div>
                </div>

                {/* Business License */}
                <div className="space-y-4">
                  <Label className="text-sm font-bold text-slate-700">Business License Files</Label>
                  <div className="relative w-full h-64 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 bg-slate-50 hover:border-indigo-500 hover:bg-indigo-50/10 transition-all group flex flex-col items-center justify-center text-center cursor-pointer">
                    {form.licenseFiles && form.licenseFiles.length > 0 ? (
                      <div className="flex flex-col items-center justify-center p-6 gap-3">
                        <div className="h-20 w-20 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-indigo-500">
                          <Check className="h-10 w-10" />
                        </div>
                        <div className="space-y-1 text-center">
                          <p className="text-sm font-bold text-slate-700">{form.licenseFiles.length} File(s) Selected</p>
                          <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest">Verification Ready</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setForm({ ...form, licenseFiles: [] });
                          }}
                          className="text-xs text-red-500 font-bold hover:underline"
                        >
                          Clear All
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-slate-400">
                        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-indigo-500 group-hover:scale-110 transition-transform">
                          <FileText className="h-8 w-8" />
                        </div>
                        <span className="text-sm font-bold text-slate-600">Upload Licence Files</span>
                        <span className="text-xs text-slate-400 mt-1">PDF or Image Accepted</span>
                      </div>
                    )}
                    <input
                      type="file"
                      multiple
                      name="license"
                      accept=".pdf,image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer z-0"
                      onChange={(e) => {
                        if (e.target.files) {
                          const files = Array.from(e.target.files);
                          setForm((prev: any) => ({ ...prev, licenseFiles: [...(prev.licenseFiles || []), ...files] }));
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Document Verification */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <Label className="text-sm font-bold text-slate-700">TIN Number</Label>
                      <Input
                        placeholder="Enter TIN Number"
                        value={form.tinNumber}
                        onChange={(e) => setForm({ ...form, tinNumber: e.target.value })}
                        className="h-10 bg-slate-50 border-transparent focus:bg-white"
                        disabled={!isSuperAdmin && !!initialData}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-sm font-bold text-slate-700">VAT Registration Number</Label>
                      <Input
                        placeholder="Enter VAT Reg Number"
                        value={form.vatRegistrationNumber}
                        onChange={(e) => setForm({ ...form, vatRegistrationNumber: e.target.value })}
                        className="h-10 bg-slate-50 border-transparent focus:bg-white"
                        disabled={!isSuperAdmin && !!initialData}
                      />
                    </div>
                  </div>
                </div>

                {/* Agreement Document */}
                <div className="space-y-4">
                  <Label className="text-sm font-bold text-slate-700">Agreement Documents</Label>
                  <div className="relative w-full h-64 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 bg-slate-50 hover:border-indigo-500 hover:bg-indigo-50/10 transition-all group flex flex-col items-center justify-center text-center cursor-pointer">
                    {form.agreementDocuments && form.agreementDocuments.length > 0 ? (
                      <div className="flex flex-col items-center justify-center p-6 gap-3">
                        <div className="h-20 w-20 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-indigo-500">
                          <Check className="h-10 w-10" />
                        </div>
                        <div className="space-y-1 text-center">
                          <p className="text-sm font-bold text-slate-700">{form.agreementDocuments.length} Document(s) Selected</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setForm({ ...form, agreementDocuments: [] });
                          }}
                          className="text-xs text-red-500 font-bold hover:underline"
                        >
                          Clear All
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-slate-400">
                        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-indigo-500 group-hover:scale-110 transition-transform">
                          <FileText className="h-8 w-8" />
                        </div>
                        <span className="text-sm font-bold text-slate-600">Upload Agreement Documents</span>
                      </div>
                    )}
                    <input
                      type="file"
                      multiple
                      name="agreement"
                      accept=".pdf,.doc,.docx,image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files) {
                          const files = Array.from(e.target.files);
                          setForm((prev: any) => ({ ...prev, agreementDocuments: [...(prev.agreementDocuments || []), ...files] }));
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Gallery Uploader */}
              <div className="space-y-4">
                <Label className="text-sm font-bold text-slate-700">Add to Gallery</Label>
                <div className="relative w-full h-64 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center hover:border-indigo-500 hover:bg-indigo-50/10 transition-all cursor-pointer group">
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-indigo-500 group-hover:scale-110 transition-transform">
                    <Plus className="h-8 w-8" />
                  </div>
                  <span className="text-sm font-bold text-slate-600">Add Photos</span>
                  <span className="text-xs text-slate-400 mt-1">Multiple Images Supported</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setForm({ ...form, galleryImages: [...form.galleryImages, ...files] });
                    }}
                  />
                </div>
              </div>

              {/* Gallery List (Underneath) */}
              {form.galleryImages.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <Label className="text-sm font-bold text-slate-700 mb-4 block">Gallery - {form.galleryImages.length} Images</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {form.galleryImages.map((img: any, i: number) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                        <img
                          src={img instanceof File ? URL.createObjectURL(img) : getImageUrl(img as string)}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(i)}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-md"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t py-6 px-10 bg-white shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-end gap-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-14 px-8 rounded-xl font-bold text-slate-400 hover:text-slate-900"
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={isLoading}
            className="h-14 px-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xl shadow-indigo-200 hover:shadow-2xl transition-all flex items-center gap-3"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            {initialData ? "Save Changes" : "Create Parking"}
          </Button>
        </div>
      </div>
    </div>
  );
}
