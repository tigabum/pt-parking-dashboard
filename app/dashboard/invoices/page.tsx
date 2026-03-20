"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/auth-context";
import { UserRole } from "@/lib/auth";
import { PageHeader } from "@/components/layouts/page-header";
import {
    Search,
    RefreshCw,
    X,
    Building2,
    AlertCircle
} from "lucide-react";
import { RegisterInvoiceDialog } from "@/components/invoices/register-invoice-dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { invoiceService } from "@/lib/services/invoice-service";
import { toast } from "sonner";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { DashboardPagination } from "@/components/tables/dashboard-pagination";

/**
 * Sub-component for selecting a parking agent (Admin only)
 */
function ParkingSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [parkings, setParkings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const { parkingService } = await import("@/lib/services/parking-service");
                const res = await parkingService.getAllParking({ limit: 1000 });
                if (res && res.data) setParkings(res.data);
            } catch (err) {
                console.error("Failed to load parkings", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-14 w-full bg-white border-slate-200 rounded shadow-sm text-lg font-bold">
                <SelectValue placeholder={loading ? "Loading agents..." : "Select a Parking Agent"} />
            </SelectTrigger>
            <SelectContent className="rounded shadow-2xl">
                {parkings.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="font-bold py-3">
                        {p.name} ({p.parkingCode || "No Code"})
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export default function InvoicesPage() {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [typeFilter, setTypeFilter] = useState<string>("ALL");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [isWithholdDialogOpen, setIsWithholdDialogOpen] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    const [withholdForm, setWithholdForm] = useState({
        ReceiptNumber: "",
        Reason: "Withhold for services",
        ReceiptCounter: "",
        ManualReceiptNumber: "1",
        SourceSystemType: "POS",
        SourceSystemNumber: "800C04A75A",
        Type: "TWHT",
        Rate: 2
    });

    const [receiptForm, setReceiptForm] = useState({
        ReceiptNumber: "",
        Reason: "Payment for parking service",
        ModeOfPayment: "CASH",
        CollectorName: "System"
    });

    const [cancelReason, setCancelReason] = useState("1");

    const [currentParkingId, setCurrentParkingId] = useState<string>("");
    const isSystemAdmin = user?.role === UserRole.SYSTEM_SUPER_ADMIN || user?.role === UserRole.SYSTEM_ADMIN;

    // Initialize parking ID from user context
    useEffect(() => {
        if (user?.orgId) {
            setCurrentParkingId(user.orgId);
        }
    }, [user]);

    const loadInvoices = async (targetPage = page) => {
        if (!currentParkingId) return;
        setLoading(true);
        try {
            const response = await invoiceService.getHistory(currentParkingId, {
                page: targetPage,
                limit,
                search: searchTerm || undefined,
                status: statusFilter === "ALL" ? undefined : statusFilter,
                type: typeFilter === "ALL" ? undefined : typeFilter,
                startDate: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
                endDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
            });

            if (response) {
                setInvoices(response.data || []);
                setTotal(response.total || (response.data?.length || 0));
                setTotalPages(response.totalPages || 1);
            }
        } catch (error: any) {
            console.error("Failed to load invoices", error);
            if (currentParkingId && error.response?.status !== 403) {
                toast.error("Failed to fetch invoice history");
            }
        } finally {
            setLoading(false);
        }
    };



    // Reload when filters or parking ID changes
    useEffect(() => {
        if (currentParkingId) {
            loadInvoices(1);
            setPage(1);
        }
    }, [currentParkingId, searchTerm, statusFilter, typeFilter, dateRange, limit]);

    // Reload on page change
    useEffect(() => {
        if (currentParkingId) {
            loadInvoices(page);
        }
    }, [page]);

    const handleVerify = async (invoice: any) => {
        const loadingToast = toast.loading("Verifying invoice with MOR...");
        try {
            await invoiceService.verifyInvoice(invoice.id);
            toast.success("Invoice verified successfully", { id: loadingToast });
            loadInvoices();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Verification failed", { id: loadingToast });
        }
    };

    const handleGenerate = (invoice: any) => {
        setSelectedInvoice(invoice);
        setReceiptForm((prev) => ({
            ...prev,
            ReceiptNumber: `REC${Date.now()}`
        }));
        setIsReceiptDialogOpen(true);
    };

    const submitReceipt = async () => {
        if (!selectedInvoice) return;
        const loadingToast = toast.loading("Generating sales receipt...");
        try {
            await invoiceService.generateReceipt(selectedInvoice.id, receiptForm);
            toast.success("Receipt generated successfully", { id: loadingToast });
            setIsReceiptDialogOpen(false);
            loadInvoices();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Receipt generation failed", { id: loadingToast });
        }
    };

    const handleWithhold = (invoice: any) => {
        setSelectedInvoice(invoice);
        setWithholdForm((prev) => ({
            ...prev,
            ReceiptNumber: `WHT${Date.now()}`,
            ReceiptCounter: (invoice.invoiceCounter + 2000).toString()
        }));
        setIsWithholdDialogOpen(true);
    };

    const submitWithhold = async () => {
        if (!selectedInvoice) return;
        const loadingToast = toast.loading("Generating withholding receipt...");
        try {
            await invoiceService.generateWithholdingReceipt(selectedInvoice.id, withholdForm);
            toast.success("Withholding receipt generated successfully", { id: loadingToast });
            setIsWithholdDialogOpen(false);
            loadInvoices();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Withholding receipt generation failed", { id: loadingToast });
        }
    };

    const handleCancel = (invoice: any) => {
        setSelectedInvoice(invoice);
        setIsCancelDialogOpen(true);
    };

    const submitCancel = async () => {
        if (!selectedInvoice) return;
        const loadingToast = toast.loading("Cancelling invoice...");
        try {
            await invoiceService.cancelInvoice(selectedInvoice.id, cancelReason);
            toast.success("Invoice cancelled successfully", { id: loadingToast });
            setIsCancelDialogOpen(false);
            loadInvoices();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Cancellation failed", { id: loadingToast });
        }
    };

    const handleViewPayload = (invoice: any) => {
        alert(JSON.stringify(invoice.rawResponse, null, 2));
    };

    const clearFilters = () => {
        setSearchTerm("");
        setStatusFilter("ALL");
        setTypeFilter("ALL");
        setDateRange(undefined);
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Invoice Ledger"
                description="Monitor and manage MOR compliance: Registrations, Verifications, and Receipts."
            />

            {isSystemAdmin && (
                <div className="max-w-5xl mx-auto w-full space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mb-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <Label className="text-sm font-black uppercase tracking-widest text-slate-500">
                            Viewing Invoices for Agent
                        </Label>
                    </div>
                    <ParkingSelect
                        value={currentParkingId}
                        onChange={setCurrentParkingId}
                    />
                </div>
            )}

            {!currentParkingId && !isSystemAdmin && (
                <Alert variant="destructive" className="max-w-3xl mx-auto rounded">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Parking Assigned</AlertTitle>
                    <AlertDescription>
                        Your account is not assigned to any parking facility. Please contact your administrator.
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between w-full gap-4">
                <div className="relative w-full xl:w-72 shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by IRN or ID..."
                        className="pl-10 h-11 rounded border-slate-200 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-3 flex-1 lg:justify-start xl:justify-center">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="flex-1 sm:flex-none w-full sm:w-[150px] h-11 rounded border-slate-200 bg-white">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded">
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="REGISTERED">Registered</SelectItem>
                            <SelectItem value="VERIFIED">Verified</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            <SelectItem value="FAILED">Failed</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="flex-1 sm:flex-none w-full sm:w-[130px] h-11 rounded border-slate-200 bg-white">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded">
                            <SelectItem value="ALL">All Types</SelectItem>
                            <SelectItem value="B2B">B2B</SelectItem>
                            <SelectItem value="B2C">B2C</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="w-full sm:w-auto flex-1 sm:flex-none">
                        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    </div>

                    {(searchTerm !== "" || statusFilter !== "ALL" || typeFilter !== "ALL" || dateRange?.from) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={clearFilters}
                            className="h-11 w-11 rounded"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full xl:w-auto">
                    <RegisterInvoiceDialog
                        parkingId={currentParkingId}
                        onSuccess={() => loadInvoices()}
                    />

                    <Button variant="outline" size="icon" onClick={() => loadInvoices()} disabled={loading} className="h-11 w-11 rounded border-slate-200">
                        <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <InvoiceTable
                    invoices={invoices}
                    loading={loading}
                    onVerify={handleVerify}
                    onGenerate={handleGenerate}
                    onWithhold={handleWithhold}
                    onCancel={handleCancel}
                    onViewPayload={handleViewPayload}
                />

                <DashboardPagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    total={total}
                    limit={limit}
                    onLimitChange={setLimit}
                />
            </div>

            {/* Sub-Dialogs (Receipt, Withhold, Cancel) */}
            <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Generate Receipt</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Receipt Number</Label>
                            <Input value={receiptForm.ReceiptNumber} onChange={e => setReceiptForm({ ...receiptForm, ReceiptNumber: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsReceiptDialogOpen(false)}>Cancel</Button>
                        <Button onClick={submitReceipt}>Generate</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isWithholdDialogOpen} onOpenChange={setIsWithholdDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Withholding Receipt</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <Label>Rate (%)</Label>
                        <Input type="number" value={withholdForm.Rate} onChange={e => setWithholdForm({ ...withholdForm, Rate: parseFloat(e.target.value) })} />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsWithholdDialogOpen(false)}>Cancel</Button>
                        <Button onClick={submitWithhold}>Submit</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Cancel Invoice</DialogTitle></DialogHeader>
                    <div className="py-4">
                        <Select value={cancelReason} onValueChange={setCancelReason}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Mistake in Price/Qty</SelectItem>
                                <SelectItem value="2">Void Transaction</SelectItem>
                                <SelectItem value="3">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCancelDialogOpen(false)}>Keep Active</Button>
                        <Button variant="destructive" onClick={submitCancel}>Cancel Invoice</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

