"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/auth-context";
import { PageHeader } from "@/components/layouts/page-header";
import {
    Search,
    Plus,
    RefreshCw,
    Layers,
    FileBox,
    Send,
    Loader2,
    X,
    Filter,
    Briefcase,
    XCircle,
    Printer,
    Trash2,
    ListChecks,
    Wallet,
    CalendarDays
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
import { invoiceService } from "@/lib/services/invoice-service";
import { toast } from "sonner";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { DashboardPagination } from "@/components/tables/dashboard-pagination";

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
    const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
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

    const parkingId = user?.orgId;

    const loadInvoices = async (targetPage = page) => {
        if (!parkingId) return;
        setLoading(true);
        try {
            const response = await invoiceService.getHistory(parkingId, {
                page: targetPage,
                limit,
                search: searchTerm || undefined,
                status: statusFilter === "ALL" ? undefined : statusFilter,
                type: typeFilter === "ALL" ? undefined : typeFilter,
                startDate: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
                endDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
            });

            if (response && response.data) {
                setInvoices(response.data);
                setTotal(response.total || response.data.length);
                setTotalPages(response.totalPages || 1);
            }
        } catch (error) {
            console.error("Failed to load invoices", error);
            toast.error("Failed to fetch invoice history");
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

    useEffect(() => {
        loadInvoices(1);
        setPage(1);
    }, [parkingId, searchTerm, statusFilter, typeFilter, dateRange, limit]);

    useEffect(() => {
        loadInvoices(page);
    }, [page]);

    const handleSingleRegister = async () => {
        if (!parkingId) return;
        if (testPayload.items.length === 0) {
            toast.error("Please add at least one item");
            return;
        }

        setRegistering(true);
        try {
            const payload = {
                parkingId,
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
                    DocumentNumber: "AUTO", // Generated by backend
                    Date: testPayload.documentDate,
                    Type: testPayload.documentType
                },
                PaymentDetails: {
                    Mode: testPayload.paymentMode,
                    PaymentTerm: testPayload.paymentTerm
                },
                SourceSystem: {
                    CashierName: testPayload.cashierName,
                    InvoiceCounter: 0, // Generated by backend
                    SalesPersonName: testPayload.salesPersonName,
                    SystemNumber: "AUTO", // Derived from seller TIN on backend
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
        setReceiptForm({
            ...receiptForm,
            ReceiptNumber: `REC${Date.now()}`
        });
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
        setWithholdForm({
            ...withholdForm,
            ReceiptNumber: `WHT${Date.now()}`,
            ReceiptCounter: (invoice.invoiceCounter + 2000).toString()
        });
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

    const displayInvoices = invoices;

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Invoice Ledger"
                description="Monitor and manage MOR compliance: Registrations, Verifications, and Receipts."
                className="flex-col items-start! w-full! gap-4"
            >
                <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between w-full gap-4 mt-2">
                    {/* Left: Search */}
                    <div className="relative w-full xl:w-72 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by IRN or ID..."
                            className="pl-10 h-11 rounded border-slate-200 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Middle: Filters */}
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

                    {/* Right: Action Buttons Group */}
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
                                                Buyer Information
                                            </TabsTrigger>
                                            <TabsTrigger value="items" className="rounded-lg font-bold px-8 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                                                Line Items
                                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px]">{testPayload.items.length}</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="payment" className="rounded-lg font-bold px-8 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                                                Document & Payment
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
                                                    <SelectContent className="rounded-xl border-none shadow-2xl">
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
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">VAT Number</Label>
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
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">ID Type</Label>
                                                <Input
                                                    value={testPayload.buyerIdType}
                                                    onChange={e => setTestPayload({ ...testPayload, buyerIdType: e.target.value })}
                                                    className="h-11 border-slate-200 rounded-xl"
                                                    placeholder="e.g. KID"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Region</Label>
                                                <Input
                                                    value={testPayload.buyerRegion}
                                                    onChange={e => setTestPayload({ ...testPayload, buyerRegion: e.target.value })}
                                                    className="h-11 border-slate-200 rounded-xl"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">City</Label>
                                                <Input
                                                    value={testPayload.buyerCity}
                                                    onChange={e => setTestPayload({ ...testPayload, buyerCity: e.target.value })}
                                                    className="h-11 border-slate-200 rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Wereda</Label>
                                                <Input
                                                    value={testPayload.buyerWereda}
                                                    onChange={e => setTestPayload({ ...testPayload, buyerWereda: e.target.value })}
                                                    className="h-11 border-slate-200 rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">House No.</Label>
                                                <Input
                                                    value={testPayload.buyerHouseNumber}
                                                    onChange={e => setTestPayload({ ...testPayload, buyerHouseNumber: e.target.value })}
                                                    className="h-11 border-slate-200 rounded-xl"
                                                />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="items" className="p-8 m-0 max-h-[50vh] overflow-y-auto space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                <ListChecks className="h-4 w-4" />
                                                Invoice Line Items
                                            </h3>
                                            <Button onClick={addItem} size="sm" variant="outline" className="rounded-lg font-bold border-primary/20 text-primary hover:bg-primary/5">
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add New Item
                                            </Button>
                                        </div>

                                        <div className="space-y-4">
                                            {testPayload.items.map((item, index) => (
                                                <div key={index} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative group animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <Button
                                                        onClick={() => removeItem(index)}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white shadow-md text-rose-500 hover:bg-rose-50 border border-slate-100 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>

                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                        <div className="md:col-span-2 space-y-1.5">
                                                            <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Description</Label>
                                                            <Input
                                                                value={item.ProductDescription}
                                                                onChange={e => updateItem(index, 'ProductDescription', e.target.value)}
                                                                className="h-10 bg-white rounded-xl border-slate-200 font-bold"
                                                                placeholder="Service name..."
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Pre-Tax (ETB)</Label>
                                                            <Input
                                                                type="number"
                                                                value={item.PreTaxValue}
                                                                onChange={e => updateItem(index, 'PreTaxValue', parseFloat(e.target.value) || 0)}
                                                                className="h-10 bg-white rounded-xl border-slate-200 font-black text-emerald-600"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Tax (15%)</Label>
                                                            <Input
                                                                type="number"
                                                                value={item.TaxAmount}
                                                                onChange={e => updateItem(index, 'TaxAmount', parseFloat(e.target.value) || 0)}
                                                                className="h-10 bg-white rounded-xl border-slate-200 font-bold text-indigo-600"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {testPayload.items.length === 0 && (
                                                <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                                                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <FileBox className="h-8 w-8 text-slate-300" />
                                                    </div>
                                                    <p className="text-slate-400 font-medium">No items added yet. Click "Add New Item" to begin.</p>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="payment" className="p-8 m-0 max-h-[50vh] overflow-y-auto space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {/* Document Section */}
                                            <div className="lg:col-span-3">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                                                    <CalendarDays className="h-4 w-4" />
                                                    Document Details
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    <div className="space-y-2 text-left">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Document Type</Label>
                                                        <Select
                                                            value={testPayload.documentType}
                                                            onValueChange={(val) => setTestPayload({ ...testPayload, documentType: val })}
                                                        >
                                                            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="INV">Invoice (INV)</SelectItem>
                                                                <SelectItem value="DEB">Debit Note (DEB)</SelectItem>
                                                                <SelectItem value="CRE">Credit Note (CRE)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2 text-left">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Document Date</Label>
                                                        <Input
                                                            value={testPayload.documentDate}
                                                            onChange={e => setTestPayload({ ...testPayload, documentDate: e.target.value })}
                                                            className="h-11 border-slate-200 rounded-xl"
                                                            placeholder="DD-MM-YYYYT00:00:00"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Payment Section */}
                                            <div className="lg:col-span-3 pt-4 border-t border-slate-100">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                                                    <Wallet className="h-4 w-4" />
                                                    Payment Details
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    <div className="space-y-2 text-left">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Mode of Payment</Label>
                                                        <Select
                                                            value={testPayload.paymentMode}
                                                            onValueChange={(val) => setTestPayload({ ...testPayload, paymentMode: val })}
                                                        >
                                                            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="CASH">Cash</SelectItem>
                                                                <SelectItem value="CHEQUE">Cheque</SelectItem>
                                                                <SelectItem value="CREDIT">Credit Card</SelectItem>
                                                                <SelectItem value="MOBILE">Mobile Money</SelectItem>
                                                                <SelectItem value="OTHER">Other</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2 text-left">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Payment Term</Label>
                                                        <Select
                                                            value={testPayload.paymentTerm}
                                                            onValueChange={(val) => setTestPayload({ ...testPayload, paymentTerm: val })}
                                                        >
                                                            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="IMMIDIATE">Immediate</SelectItem>
                                                                <SelectItem value="DUE_ON_RECEIPT">Due on Receipt</SelectItem>
                                                                <SelectItem value="NET_15">Net 15</SelectItem>
                                                                <SelectItem value="NET_30">Net 30</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* System Section */}
                                            <div className="lg:col-span-3 pt-4 border-t border-slate-100">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                                                    <Briefcase className="h-4 w-4" />
                                                    Source System
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    <div className="space-y-2 text-left">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Cashier Name</Label>
                                                        <Input
                                                            value={testPayload.cashierName}
                                                            onChange={e => setTestPayload({ ...testPayload, cashierName: e.target.value })}
                                                            className="h-11 border-slate-200 rounded-xl"
                                                        />
                                                    </div>
                                                    <div className="space-y-2 text-left">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Sales Person</Label>
                                                        <Input
                                                            value={testPayload.salesPersonName}
                                                            onChange={e => setTestPayload({ ...testPayload, salesPersonName: e.target.value })}
                                                            className="h-11 border-slate-200 rounded-xl"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 sm:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-8">
                                        <div className="text-left">
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Total Subtotal</p>
                                            <p className="text-lg font-black text-slate-700 leading-none">
                                                {testPayload.items.reduce((sum, item) => sum + Number(item.PreTaxValue), 0).toLocaleString()} <span className="text-[10px] text-slate-400">ETB</span>
                                            </p>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Total Tax</p>
                                            <p className="text-lg font-black text-slate-700 leading-none">
                                                {testPayload.items.reduce((sum, item) => sum + Number(item.TaxAmount), 0).toLocaleString()} <span className="text-[10px] text-slate-400">ETB</span>
                                            </p>
                                        </div>
                                        <div className="h-10 w-px bg-slate-200 hidden md:block"></div>
                                        <div className="text-left">
                                            <p className="text-[9px] font-black uppercase text-primary tracking-widest leading-none mb-1">Grand Total</p>
                                            <p className="text-2xl font-black text-primary leading-none">
                                                {testPayload.items.reduce((sum, item) => sum + (Number(item.PreTaxValue) + Number(item.TaxAmount)), 0).toLocaleString()} <span className="text-[10px]">ETB</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <Button variant="outline" onClick={() => setIsSingleDialogOpen(false)} className="h-12 px-8 font-bold border-slate-200 rounded-xl flex-1 sm:flex-none">
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleSingleRegister}
                                            disabled={registering}
                                            className="h-12 px-10 bg-primary font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/30 flex-1 sm:flex-none"
                                        >
                                            {registering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Layers className="h-4 w-4 mr-2" />}
                                            Submit Invoice
                                        </Button>
                                    </div>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="h-11 rounded border-slate-200 font-bold flex-1 xl:flex-none bg-white">
                                    <FileBox className="mr-2 h-4 w-4 text-slate-400" />
                                    Bulk Mode
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[450px] border-none shadow-2xl rounded-3xl overflow-hidden p-0 text-center">
                                <div className="p-10 space-y-6 text-center">
                                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto">
                                        <Layers className="h-8 w-8" />
                                    </div>
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black uppercase text-center">Bulk Batch Mode</DialogTitle>
                                        <DialogDescription className="text-center font-medium mt-2">
                                            Combine multiple daily transactions into a single register call.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-6 px-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3 text-left">
                                        <Filter className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-amber-700 font-bold leading-relaxed">
                                            This feature allows queuing multiple pending bookings. Feature is being optimized for large batches.
                                        </p>
                                    </div>
                                    <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest" disabled>Coming Soon</Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Button onClick={() => loadInvoices()} variant="ghost" size="icon" className="h-11 w-11 rounded border border-transparent hover:border-slate-100 hover:bg-white transition-all ml-1">
                            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                        </Button>
                    </div>
                </div>
            </PageHeader>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <InvoiceTable
                    invoices={displayInvoices}
                    loading={loading}
                    onVerify={handleVerify}
                    onGenerate={handleGenerate}
                    onWithhold={handleWithhold}
                    onCancel={handleCancel}
                    onViewPayload={handleViewPayload}
                />
            </div>

            <DashboardPagination
                page={page}
                totalPages={totalPages}
                total={total}
                onPageChange={setPage}
                limit={limit}
                onLimitChange={setLimit}
            />

            {/* Sales Receipt Dialog */}
            <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
                <DialogContent className="sm:max-w-[450px] border-none shadow-2xl rounded-3xl overflow-hidden p-0">
                    <DialogHeader className="p-8 bg-emerald-50 border-b border-emerald-100 text-left">
                        <DialogTitle className="text-2xl font-black uppercase flex items-center gap-3 text-emerald-700">
                            <Printer className="h-6 w-6" />
                            Sales Receipt
                        </DialogTitle>
                        <DialogDescription className="text-emerald-600 font-medium mt-2 text-left">
                            Finalize payment for invoice IRN: <span className="font-mono block truncate mt-1 text-emerald-800">{selectedInvoice?.irn}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-8 space-y-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Receipt Number</Label>
                            <Input value={receiptForm.ReceiptNumber} onChange={e => setReceiptForm({ ...receiptForm, ReceiptNumber: e.target.value })} className="h-11 rounded-xl border-slate-200" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Mode of Payment</Label>
                                <Select value={receiptForm.ModeOfPayment} onValueChange={v => setReceiptForm({ ...receiptForm, ModeOfPayment: v })}>
                                    <SelectTrigger className="h-11 rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">CASH</SelectItem>
                                        <SelectItem value="BANK">BANK TRANSFER</SelectItem>
                                        <SelectItem value="TELEBIRR">TELEBIRR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Collector Name</Label>
                                <Input value={receiptForm.CollectorName} onChange={e => setReceiptForm({ ...receiptForm, CollectorName: e.target.value })} className="h-11 rounded-xl border-slate-200" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Reason / Description</Label>
                            <Input value={receiptForm.Reason} onChange={e => setReceiptForm({ ...receiptForm, Reason: e.target.value })} className="h-11 rounded-xl border-slate-200" />
                        </div>
                    </div>
                    <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex-row gap-3">
                        <Button variant="ghost" onClick={() => setIsReceiptDialogOpen(false)} className="font-bold flex-1">Cancel</Button>
                        <Button onClick={submitReceipt} className="bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-widest px-8 flex-1">Generate Receipt</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Withholding Dialog */}
            <Dialog open={isWithholdDialogOpen} onOpenChange={setIsWithholdDialogOpen}>
                <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-3xl overflow-hidden p-0">
                    <DialogHeader className="p-8 bg-orange-50 border-b border-orange-100 text-left">
                        <DialogTitle className="text-2xl font-black uppercase flex items-center gap-3 text-orange-700">
                            <Briefcase className="h-6 w-6" />
                            Withholding Receipt
                        </DialogTitle>
                        <DialogDescription className="text-orange-600 font-medium mt-2 text-left">
                            Generate a withholding tax receipt for invoice IRN: <span className="font-mono block truncate mt-1 text-orange-800">{selectedInvoice?.irn}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-8 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Receipt Number</Label>
                                <Input value={withholdForm.ReceiptNumber} onChange={e => setWithholdForm({ ...withholdForm, ReceiptNumber: e.target.value })} className="h-10 rounded-lg border-slate-200" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Counter</Label>
                                <Input value={withholdForm.ReceiptCounter} onChange={e => setWithholdForm({ ...withholdForm, ReceiptCounter: e.target.value })} className="h-10 rounded-lg border-slate-200" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Source Type</Label>
                                <Select value={withholdForm.SourceSystemType} onValueChange={v => setWithholdForm({ ...withholdForm, SourceSystemType: v })}>
                                    <SelectTrigger className="h-10 rounded-lg border-slate-200"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="POS">POS - Point of Sale</SelectItem><SelectItem value="MAN">MAN - Manual</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Rate (%)</Label>
                                <Input type="number" value={withholdForm.Rate} onChange={e => setWithholdForm({ ...withholdForm, Rate: Number(e.target.value) })} className="h-10 rounded-lg border-slate-200" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Reason</Label>
                            <Input value={withholdForm.Reason} onChange={e => setWithholdForm({ ...withholdForm, Reason: e.target.value })} className="h-10 rounded-lg border-slate-200" />
                        </div>
                    </div>
                    <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex-row gap-3">
                        <Button variant="ghost" onClick={() => setIsWithholdDialogOpen(false)} className="font-bold flex-1">Cancel</Button>
                        <Button onClick={submitWithhold} className="bg-orange-600 hover:bg-orange-700 font-black uppercase tracking-widest px-8 flex-1">Generate</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Dialog */}
            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent className="sm:max-w-[400px] border-none shadow-2xl rounded-3xl overflow-hidden p-0">
                    <DialogHeader className="p-8 bg-rose-50 border-b border-rose-100 text-left">
                        <DialogTitle className="text-2xl font-black uppercase flex items-center gap-3 text-rose-700">
                            <XCircle className="h-6 w-6" />
                            Cancel Invoice
                        </DialogTitle>
                        <DialogDescription className="text-rose-600 font-medium mt-2 text-left">
                            This action is permanent and will be logged with MOR.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-8 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-slate-400">Reason for Cancellation</Label>
                            <Select value={cancelReason} onValueChange={setCancelReason}>
                                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Incorrect Receipt</SelectItem>
                                    <SelectItem value="2">Request by Customer</SelectItem>
                                    <SelectItem value="3">System Error</SelectItem>
                                    <SelectItem value="4">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex-row gap-3">
                        <Button variant="ghost" onClick={() => setIsCancelDialogOpen(false)} className="font-bold text-slate-400 flex-1">Go Back</Button>
                        <Button onClick={submitCancel} className="bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest px-8 flex-1">Confirm Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
