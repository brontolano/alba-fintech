import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const dynamic = "force-dynamic";

interface ExportParams {
  tenantId: number;
  startDate: Date;
  endDate: Date;
  unitId?: number;
  type?: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

async function fetchExportData(params: ExportParams) {
  const txWhere: Record<string, unknown> = {
    tenantId: params.tenantId,
    status: "Approved",
    transactionDate: { gte: params.startDate, lte: params.endDate },
  };
  if (params.unitId) txWhere.unitId = params.unitId;
  if (params.type === "income" || params.type === "expense") {
    txWhere.type = params.type === "income" ? "Debit" : "Kredit";
  }

  const [units, transactions, categories] = await Promise.all([
    prisma.unit.findMany({
      where: { tenantId: params.tenantId },
      select: { id: true, name: true, type: true, balance: true },
    }),
    prisma.transaction.findMany({
      where: txWhere,
      orderBy: { transactionDate: "asc" },
      include: {
        unit: { select: { name: true, type: true } },
        user: { select: { name: true } },
        approvedBy: { select: { name: true } },
      },
    }),
    prisma.category.findMany({
      where: { tenantId: params.tenantId },
      select: { id: true, name: true, type: true },
    }),
  ]);

  return { units, transactions, categories };
}

type ExportUnit = { id: number; name: string; type: string; balance: unknown };
type ExportTransaction = {
  transactionDate: Date;
  unitId: number;
  type: string;
  amount: unknown;
  category: string;
  unit: { name: string };
  method: string;
  description: string | null;
  status: string;
  user: { name: string };
  approvedBy: { name: string } | null;
};
type ExportCategory = { name: string; type: string };

function buildSummary(units: ExportUnit[], transactions: ExportTransaction[], categories: ExportCategory[]) {
  const totalIncome = transactions.filter((t) => t.type === "Debit").reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === "Kredit").reduce((sum, t) => sum + Number(t.amount), 0);
  const totalBalance = units.reduce((sum, u) => sum + Number(u.balance), 0);

  const unitSummary = units.map((unit) => {
    const unitTx = transactions.filter((t) => t.unitId === unit.id);
    const income = unitTx.filter((t) => t.type === "Debit").reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = unitTx.filter((t) => t.type === "Kredit").reduce((sum, t) => sum + Number(t.amount), 0);
    return {
      name: unit.name,
      type: unit.type,
      balance: Number(unit.balance),
      income,
      expense,
      transactionCount: unitTx.length,
    };
  });

  const incomeByCategory = categories
    .filter((c) => c.type === "Debit")
    .map((cat) => ({
      name: cat.name,
      value: transactions.filter((t) => t.type === "Debit" && t.category === cat.name).reduce((sum, t) => sum + Number(t.amount), 0),
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const expenseByCategory = categories
    .filter((c) => c.type === "Kredit")
    .map((cat) => ({
      name: cat.name,
      value: transactions.filter((t) => t.type === "Kredit" && t.category === cat.name).reduce((sum, t) => sum + Number(t.amount), 0),
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  return { totalIncome, totalExpense, totalBalance, unitSummary, incomeByCategory, expenseByCategory };
}

async function generateExcel(tenantName: string, params: ExportParams): Promise<Buffer> {
  const XLSX = await import("xlsx");
  const { units, transactions, categories } = await fetchExportData(params);
  const { totalIncome, totalExpense, totalBalance, unitSummary, incomeByCategory, expenseByCategory } = buildSummary(
    units as ExportUnit[],
    transactions as ExportTransaction[],
    categories as ExportCategory[]
  );

  const wb = XLSX.utils.book_new();

  // Sheet 1: Ringkasan
  const summaryData: (string | number)[][] = [
    ["LAPORAN KEUANGAN"],
    [tenantName],
    [`Periode: ${format(params.startDate, "dd MMMM yyyy", { locale: idLocale })} - ${format(params.endDate, "dd MMMM yyyy", { locale: idLocale })}`],
    [],
    ["RINGKASAN"],
    ["Total Saldo", totalBalance],
    ["Total Pemasukan", totalIncome],
    ["Total Pengeluaran", totalExpense],
    ["Selisih", totalIncome - totalExpense],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");

  // Sheet 2: Per Unit
  const unitData: (string | number)[][] = [
    ["Unit", "Tipe", "Saldo Saat Ini", "Pemasukan", "Pengeluaran", "Jumlah Transaksi"],
    ...unitSummary.map((u) => [u.name, u.type, u.balance, u.income, u.expense, u.transactionCount]),
  ];
  const wsUnit = XLSX.utils.aoa_to_sheet(unitData);
  wsUnit["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsUnit, "Per Unit");

  // Sheet 3: Detail Transaksi
  const txData: (string | number)[][] = [
    ["Tanggal", "Unit", "Tipe", "Metode", "Kategori", "Nominal", "Keterangan", "Status", "Dibuat Oleh", "Disetujui Oleh"],
    ...transactions.map((tx) => [
      format(new Date(tx.transactionDate), "dd/MM/yyyy HH:mm"),
      tx.unit.name,
      tx.type,
      tx.method,
      tx.category,
      Number(tx.amount),
      tx.description || "",
      tx.status,
      tx.user.name,
      tx.approvedBy?.name || "-",
    ]),
  ];
  const wsTx = XLSX.utils.aoa_to_sheet(txData);
  wsTx["!cols"] = [{ wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsTx, "Detail Transaksi");

  // Sheet 4: Kategori Pemasukan
  const incomeCatData: (string | number)[][] = [
    ["Kategori", "Total"],
    ...incomeByCategory.map((c) => [c.name, c.value]),
  ];
  const wsIncomeCat = XLSX.utils.aoa_to_sheet(incomeCatData);
  wsIncomeCat["!cols"] = [{ wch: 25 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsIncomeCat, "Kategori Pemasukan");

  // Sheet 5: Kategori Pengeluaran
  const expenseCatData: (string | number)[][] = [
    ["Kategori", "Total"],
    ...expenseByCategory.map((c) => [c.name, c.value]),
  ];
  const wsExpenseCat = XLSX.utils.aoa_to_sheet(expenseCatData);
  wsExpenseCat["!cols"] = [{ wch: 25 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsExpenseCat, "Kategori Pengeluaran");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

async function generatePDF(tenantName: string, params: ExportParams): Promise<Buffer> {
  const jsPDFModule = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const { units, transactions, categories } = await fetchExportData(params);
  const { totalIncome, totalExpense, totalBalance, unitSummary, incomeByCategory, expenseByCategory } = buildSummary(
    units as ExportUnit[],
    transactions as ExportTransaction[],
    categories as ExportCategory[]
  );

  const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
  const autoTable = autoTableModule.default;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("LAPORAN KEUANGAN", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(tenantName, pageWidth / 2, 25, { align: "center" });
  doc.setFontSize(9);
  doc.text(
    `Periode: ${format(params.startDate, "dd MMMM yyyy", { locale: idLocale })} - ${format(params.endDate, "dd MMMM yyyy", { locale: idLocale })}`,
    pageWidth / 2,
    31,
    { align: "center" }
  );

  let startY = 40;

  // Summary
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Ringkasan", 14, startY);
  startY += 6;

  autoTable(doc, {
    startY,
    head: [["Keterangan", "Jumlah"]],
    body: [
      ["Total Saldo", formatCurrency(totalBalance)],
      ["Total Pemasukan", formatCurrency(totalIncome)],
      ["Total Pengeluaran", formatCurrency(totalExpense)],
      ["Selisih", formatCurrency(totalIncome - totalExpense)],
    ],
    theme: "grid",
    headStyles: { fillColor: [2, 36, 72], textColor: 255 },
    styles: { fontSize: 9 },
  });

  startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Unit Summary
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Ringkasan per Unit", 14, startY);
  startY += 6;

  autoTable(doc, {
    startY,
    head: [["Unit", "Tipe", "Saldo", "Pemasukan", "Pengeluaran", "Transaksi"]],
    body: unitSummary.map((u) => [
      u.name,
      u.type,
      formatCurrency(u.balance),
      formatCurrency(u.income),
      formatCurrency(u.expense),
      String(u.transactionCount),
    ]),
    theme: "striped",
    headStyles: { fillColor: [2, 36, 72], textColor: 255 },
    styles: { fontSize: 8 },
  });

  startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Detail Transaksi
  if (startY > 240) {
    doc.addPage();
    startY = 20;
  }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Detail Transaksi", 14, startY);
  startY += 6;

  autoTable(doc, {
    startY,
    head: [["Tanggal", "Unit", "Tipe", "Kategori", "Nominal", "Status"]],
    body: transactions.map((tx) => [
      format(new Date(tx.transactionDate), "dd/MM/yy"),
      tx.unit.name,
      tx.type,
      tx.category,
      formatCurrency(Number(tx.amount)),
      tx.status,
    ]),
    theme: "striped",
    headStyles: { fillColor: [2, 36, 72], textColor: 255 },
    styles: { fontSize: 7 },
  });

  startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Top Categories
  if (startY > 240) {
    doc.addPage();
    startY = 20;
  }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Top Kategori Pemasukan", 14, startY);
  startY += 6;

  autoTable(doc, {
    startY,
    head: [["Kategori", "Total"]],
    body: incomeByCategory.slice(0, 10).map((c) => [c.name, formatCurrency(c.value)]),
    theme: "grid",
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    styles: { fontSize: 9 },
  });

  startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  if (startY > 240) {
    doc.addPage();
    startY = 20;
  }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Top Kategori Pengeluaran", 14, startY);
  startY += 6;

  autoTable(doc, {
    startY,
    head: [["Kategori", "Total"]],
    body: expenseByCategory.slice(0, 10).map((c) => [c.name, formatCurrency(c.value)]),
    theme: "grid",
    headStyles: { fillColor: [239, 68, 68], textColor: 255 },
    styles: { fontSize: 9 },
  });

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Halaman ${i} dari ${pageCount} - Dicetak ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: idLocale })}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  return Buffer.from(doc.output("arraybuffer"));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { tenantId } = await params;
    const tenantIdNum = parseInt(tenantId);
    const user = session.user;

    if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const formatType = (searchParams.get("format") || "excel").toLowerCase();

    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : new Date();
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1);
    const unitId = searchParams.get("unitId") ? parseInt(searchParams.get("unitId")!) : undefined;
    const type = searchParams.get("type") || undefined;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantIdNum },
      select: { name: true, appName: true },
    });

    if (!tenant) {
      return NextResponse.json({ success: false, error: "Tenant not found" }, { status: 404 });
    }

    const exportParams: ExportParams = { tenantId: tenantIdNum, startDate, endDate, unitId, type };
    const filename = `Laporan_${tenant.appName.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd_HHmmss")}`;
    const tenantName = tenant.appName;

    let buffer: Buffer;
    let contentType: string;
    let extension: string;

    if (formatType === "pdf") {
      buffer = await generatePDF(tenantName, exportParams);
      contentType = "application/pdf";
      extension = "pdf";
    } else {
      buffer = await generateExcel(tenantName, exportParams);
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      extension = "xlsx";
    }

    await logAction({
      tenantId: tenantIdNum,
      actorId: Number(user.id),
      action: "export",
      entity: "Laporan",
      entityId: 0,
      metadata: { format: formatType, startDate, endDate, unitId, type },
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}.${extension}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
