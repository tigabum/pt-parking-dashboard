"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface InvoicePDFGeneratorProps {
    printableRef: React.RefObject<HTMLDivElement | null>;
    invoiceId: string;
    invoiceCounter?: string;
    disabled?: boolean;
}

export default function InvoicePDFGenerator({
    printableRef,
    invoiceId,
    invoiceCounter,
    disabled
}: InvoicePDFGeneratorProps) {
    const downloadPDF = async () => {
        if (!printableRef.current) return;
        const loadingToast = toast.loading("Preparing formal PDF for download...");
        try {
            const element = printableRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff"
            });
            const imgData = canvas.toDataURL("image/png");

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "px",
                format: "a4"
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 20;

            pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
            pdf.save(`Invoice_${invoiceCounter || invoiceId.substring(0, 8)}.pdf`);

            toast.success("Formal invoice downloaded!", { id: loadingToast });
        } catch (error) {
            console.error("PDF generation failed", error);
            toast.error("Failed to generate PDF", { id: loadingToast });
        }
    };

    return (
        <Button
            onClick={downloadPDF}
            disabled={disabled}
            className="bg-primary hover:opacity-90 font-black rounded-xl shadow-lg shadow-primary/20"
        >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
        </Button>
    );
}
