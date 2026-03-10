"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/auth-context";
import { UserRole } from "@/lib/auth";
import { PageHeader } from "@/components/layouts/page-header";
import {
    Search,
    Plus,
    RefreshCw,
    FileBox,
    Send,
    Loader2,
    X,
    Briefcase,
    XCircle,
    Printer,
    Trash2,
    ListChecks,
    Wallet,
    CalendarDays,
    AlertCircle,
    Building2
} from "lucide-react";
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

    const [registering, setRegistering] = useState(false);
    const [isSingleDialogOpen, setIsSingleDialogOpen] = useState(false);
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

    const [testPayload, setTestPayload] = useState({
        buyerName: "QR Anbessa Technology Development",
        buyerTin: "0094856874",
        buyerEmail: "company@anbessait.com",
        buyerPhone: "+251913654171",
        buyerIdType: "KID",
        buyerCity: "101",
        buyerRegion: "1",
        buyerWereda: "13",
        buyerHouseNumber: "101",
        buyerVatNumber: "43256663343256663322",
        buyerLocality: "",
        buyerSubCity: "",
        transactionType: "B2B",
        documentDate: format(new Date(), "dd-MM-yyyy'T'HH:mm:ss"),
        documentType: "INV",
        paymentMode: "CASH",
        paymentTerm: "IMMIDIATE",
        cashierName: "System Administrator",
        salesPersonName: "POS-01",
        items: [
            {
                ProductDescription: "Standard Parking Service",
                PreTaxValue: 10000,
                TaxAmount: 1500,
                ItemCode: "PKG-01",
                Quantity: 1,
                Unit: "PCS",
                NatureOfSupplies: "service",
                TaxCode: "VAT15"
            }
        ]
    });

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

    const addItem = () => {
        setTestPayload({
            ...testPayload,
            items: [
                ...testPayload.items,
                {
                    ProductDescription: "Parking Fee",
                    PreTaxValue: 0,
                    TaxAmount: 0,
                    ItemCode: `ITEM-${testPayload.items.length + 1}`,
                    Quantity: 1,
                    Unit: "PCS",
                    NatureOfSupplies: "service",
                    TaxCode: "VAT15"
                }
            ]
        });
    };

    const removeItem = (index: number) => {
        const newItems = [...testPayload.items];
        newItems.splice(index, 1);
        setTestPayload({ ...testPayload, items: newItems });
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...testPayload.items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Auto-calculate tax if preTax changes
        if (field === 'PreTaxValue') {
            newItems[index].TaxAmount = Math.round(Number(value) * 0.15);
        }

        setTestPayload({ ...testPayload, items: newItems });
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

    const handleSingleRegister = async () => {
        if (!currentParkingId) {
            toast.error("Please select a parking agent first");
            return;
        }
        if (testPayload.items.length === 0) {
            toast.error("Please add at least one item");
            return;
        }

        setRegistering(true);
        try {
            const payload = {
                parkingId: currentParkingId,
                TransactionType: testPayload.transactionType,
                BuyerDetails: {
                    IdType: testPayload.buyerIdType || "KID",
                    City: testPayload.buyerCity || "101",
                    Email: testPayload.buyerEmail || "",
                    HouseNumber: testPayload.buyerHouseNumber || "101",
                    LegalName: testPayload.buyerName || "",
                    Phone: testPayload.buyerPhone || "",
                    Region: testPayload.buyerRegion || "1",
                    Tin: testPayload.buyerTin || "",
                    VatNumber: testPayload.buyerVatNumber || "",
                    Wereda: testPayload.buyerWereda || "13",
                    Locality: testPayload.buyerLocality || null,
                    SubCity: testPayload.buyerSubCity || null
                },
                ItemList: testPayload.items.map((item, index) => ({
                    ...item,
                    PreTaxValue: Number(item.PreTaxValue),
                    TaxAmount: Number(item.TaxAmount),
                    TotalLineAmount: Number(item.PreTaxValue) + Number(item.TaxAmount),
                    UnitPrice: Number(item.PreTaxValue),
                    Discount: 0,
                    ExciseTaxValue: 0,
                    HarmonizationCode: null,
                    LineNumber: index + 1
                })),
                DocumentDetails: {
                    DocumentNumber: "AUTO",
                    Date: testPayload.documentDate,
                    Type: testPayload.documentType
                },
                PaymentDetails: {
                    Mode: testPayload.paymentMode,
                    PaymentTerm: testPayload.paymentTerm
                },
                SourceSystem: {
                    CashierName: testPayload.cashierName,
                    InvoiceCounter: 0,
                    SalesPersonName: testPayload.salesPersonName,
                    SystemNumber: "AUTO",
                    SystemType: "POS"
                }
            };

            await invoiceService.registerInvoice(payload);
            toast.success("Invoice registered successfully");
            setIsSingleDialogOpen(false);
            loadInvoices();
        } catch (error: any) {
            console.error("Registration failed", error);
            const errorMsg = error.response?.data?.message || "Failed to register invoice with MOR";
            toast.error(errorMsg, { duration: 8000 });
        } finally {
            setRegistering(false);
        }
    };

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
        console.log("Invoice Payload:", invoice.rawResponse);
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
                    <Dialog open={isSingleDialogOpen} onOpenChange={setIsSingleDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-11 rounded px-6 bg-primary hover:opacity-90 font-bold shadow-lg shadow-primary/20 flex-1 xl:flex-none transition-all">
                                <Plus className="h-4 w-4 mr-2" />
                                Register Invoice
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[900px] border-none shadow-2xl rounded-3xl overflow-hidden p-0">
                            <DialogHeader className="p-8 bg-slate-50 border-b border-slate-100">
                                <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                    <Send className="h-6 w-6 text-primary" />
                                    Manual Registration
                                </DialogTitle>
                                <DialogDescription className="font-medium text-slate-500 mt-2 text-left">
                                    Manage buyer information and line items for MOR compliance.
                                </DialogDescription>
                            </DialogHeader>

                            <Tabs defaultValue="buyer" className="w-full">
                                <div className="px-8 pt-4 bg-slate-50 border-b border-slate-100">
                                    <TabsList className="bg-slate-200/50 p-1 rounded-xl">
                                        <TabsTrigger value="buyer" className="rounded-lg font-bold px-8 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                            Buyer Info
                                        </TabsTrigger>
                                        <TabsTrigger value="items" className="rounded-lg font-bold px-8 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                                            Items
                                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px]">{testPayload.items.length}</span>
                                        </TabsTrigger>
                                        <TabsTrigger value="payment" className="rounded-lg font-bold px-8 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                                            Payment
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="buyer" className="p-8 m-0 max-h-[50vh] overflow-y-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Transaction Type</Label>
                                            <Select
                                                value={testPayload.transactionType}
                                                onValueChange={(val) => setTestPayload({ ...testPayload, transactionType: val })}
                                            >
                                                <SelectTrigger className="h-11 rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="B2B">B2B - Business</SelectItem>
                                                    <SelectItem value="B2C">B2C - Customer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 lg:col-span-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Legal Name</Label>
                                            <Input
                                                value={testPayload.buyerName}
                                                onChange={e => setTestPayload({ ...testPayload, buyerName: e.target.value })}
                                                className="h-11 border-slate-200 font-bold rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">TIN</Label>
                                            <Input
                                                value={testPayload.buyerTin}
                                                onChange={e => setTestPayload({ ...testPayload, buyerTin: e.target.value })}
                                                className="h-11 border-slate-200 font-mono rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">VAT</Label>
                                            <Input
                                                value={testPayload.buyerVatNumber}
                                                onChange={e => setTestPayload({ ...testPayload, buyerVatNumber: e.target.value })}
                                                className="h-11 border-slate-200 font-mono rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Phone</Label>
                                            <Input
                                                value={testPayload.buyerPhone}
                                                onChange={e => setTestPayload({ ...testPayload, buyerPhone: e.target.value })}
                                                className="h-11 border-slate-200 rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email</Label>
                                            <Input
                                                value={testPayload.buyerEmail}
                                                onChange={e => setTestPayload({ ...testPayload, buyerEmail: e.target.value })}
                                                className="h-11 border-slate-200 rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">City</Label>
                                            <Input value={testPayload.buyerCity} onChange={e => setTestPayload({...testPayload, buyerCity: e.target.value})} className="h-11 border-slate-200 rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Wereda</Label>
                                            <Input value={testPayload.buyerWereda} onChange={e => setTestPayload({...testPayload, buyerWereda: e.target.value})} className="h-11 border-slate-200 rounded-xl" />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="items" className="p-8 m-0 max-h-[50vh] overflow-y-auto space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                            <ListChecks className="h-4 w-4" />
                                            Line Items
                                        </h3>
                                        <Button onClick={addItem} size="sm" variant="outline" className="rounded-lg font-bold">
                                            <Plus className="h-4 w-4 mr-2" /> Add Item
                                        </Button>
                                    </div>
                                    <div className="space-y-4">
                                        {testPayload.items.map((item, index) => (
                                            <div key={index} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                                                <Button
                                                    onClick={() => removeItem(index)}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white shadow-md text-rose-500"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                    <div className="md:col-span-2 space-y-1.5">
                                                        <Label className="text-[9px] font-black uppercase text-slate-400">Description</Label>
                                                        <Input
                                                            value={item.ProductDescription}
                                                            onChange={e => updateItem(index, 'ProductDescription', e.target.value)}
                                                            className="h-10 bg-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[9px] font-black uppercase text-slate-400">Pre-Tax (ETB)</Label>
                                                        <Input
                                                            type="number"
                                                            value={item.PreTaxValue}
                                                            onChange={e => updateItem(index, 'PreTaxValue', parseFloat(e.target.value) || 0)}
                                                            className="h-10 bg-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[9px] font-black uppercase text-slate-400">Tax</Label>
                                                        <Input
                                                            type="number"
                                                            value={item.TaxAmount}
                                                            onChange={e => updateItem(index, 'TaxAmount', parseFloat(e.target.value) || 0)}
                                                            className="h-10 bg-white"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                <TabsContent value="payment" className="p-8 m-0 max-h-[50vh] overflow-y-auto space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase">Doc Type</Label>
                                            <Select value={testPayload.documentType} onValueChange={(val) => setTestPayload({ ...testPayload, documentType: val })}>
                                                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="INV">Invoice (INV)</SelectItem>
                                                    <SelectItem value="DEB">Debit Note (DEB)</SelectItem>
                                                    <SelectItem value="CRE">Credit Note (CRE)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase">Payment Mode</Label>
                                            <Select value={testPayload.paymentMode} onValueChange={(val) => setTestPayload({ ...testPayload, paymentMode: val })}>
                                                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="CASH">Cash</SelectItem>
                                                    <SelectItem value="CHQ">Cheque</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase">Cashier</Label>
                                            <Input value={testPayload.cashierName} onChange={e => setTestPayload({...testPayload, cashierName: e.target.value})} />
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 sm:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-8">
                                    <div className="text-left">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Grand Total</p>
                                        <p className="text-2xl font-black text-emerald-600 leading-none">
                                            {testPayload.items.reduce((sum, item) => sum + (Number(item.PreTaxValue) + Number(item.TaxAmount)), 0).toLocaleString()} <span className="text-[10px] text-slate-400">ETB</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <Button variant="ghost" onClick={() => setIsSingleDialogOpen(false)} className="rounded-xl font-bold px-6">Cancel</Button>
                                    <Button
                                        onClick={handleSingleRegister}
                                        disabled={registering}
                                        className="rounded-xl font-black px-8 bg-primary hover:opacity-90 shadow-xl"
                                    >
                                        {registering ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit to MOR"}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

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
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={total}
                    itemsPerPage={limit}
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
