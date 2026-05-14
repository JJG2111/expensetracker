import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { companies, displayDate, money, periodFromDate, users } from "./constants";
import type { Expense } from "./db";

type UserCode = keyof typeof users;
type CompanyCode = keyof typeof companies;

function reportFilename(userCode: UserCode, companyCode: CompanyCode, reportDate: string, extension: string) {
  const period = periodFromDate(reportDate);
  const user = users[userCode];
  const company = companies[companyCode];
  return `${period.monthName}-${period.year}-${user.shortName}-${company.shortName}.${extension}`;
}

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function selectedCsv(expenses: Expense[]) {
  const rows = [
    ["Product Name", "Date", "Qty", "Commission", "Party Name"],
    ...expenses.map((expense) => [
      expense.product_name,
      displayDate(expense.expense_date),
      expense.qty,
      expense.commission,
      expense.party_name
    ])
  ];
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export async function selectedXlsx(expenses: Expense[], userCode: UserCode, companyCode: CompanyCode, reportDate: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Debit Note");
  const user = users[userCode];
  const company = companies[companyCode];
  const period = periodFromDate(reportDate);

  sheet.mergeCells("A1:G6");
  sheet.getCell("A1").value = [
    "Debit Note",
    user.name,
    "Address: A 501/502 Kameshwar Jyot-2, Opp GST Bhavan Nehrunagar Ahmedabad - 380015",
    `PAN No: ${user.pan}`,
    `Party Name: ${company.name}`,
    `No: ${period.month}/${period.year}    Date: ${period.month}/${period.year}`,
    "Ref: Commission"
  ].join("\n");
  sheet.getCell("A1").alignment = { vertical: "top", wrapText: true };
  sheet.getCell("A1").font = { size: 12 };

  const headerRow = sheet.addRow([]);
  headerRow.hidden = true;
  sheet.addRow(["S NO", "Product Name", "Date", "Qty", "Commission", "Commission Amount", "Party Name"]);

  expenses.forEach((expense, index) => {
    sheet.addRow([
      index + 1,
      expense.product_name,
      displayDate(expense.expense_date),
      expense.qty,
      expense.commission,
      expense.qty * expense.commission,
      expense.party_name
    ]);
  });

  const total = expenses.reduce((sum, expense) => sum + expense.qty * expense.commission, 0);
  sheet.addRow(["TOTAL", "", "", "", "", total, ""]);
  sheet.addRow([]);
  sheet.addRow([`For, ${user.name}`]);
  sheet.addRow([]);
  sheet.addRow(["Authorized Signatory"]);

  sheet.columns = [
    { width: 8 },
    { width: 30 },
    { width: 14 },
    { width: 10 },
    { width: 14 },
    { width: 22 },
    { width: 24 }
  ];

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    filename: reportFilename(userCode, companyCode, reportDate, "xlsx"),
    bytes: Buffer.from(buffer)
  };
}

export async function selectedPdf(expenses: Expense[], userCode: UserCode, companyCode: CompanyCode, reportDate: string) {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([842, 595]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const user = users[userCode];
  const company = companies[companyCode];
  const period = periodFromDate(reportDate);
  let y = 555;

  const draw = (text: string, x: number, size = 10, isBold = false) => {
    page.drawText(text, { x, y, size, font: isBold ? bold : font, color: rgb(0.08, 0.1, 0.15) });
  };

  draw("Debit Note", 380, 16, true);
  y -= 24;
  draw(user.name, 40, 12, true);
  y -= 18;
  draw(`PAN No: ${user.pan}`, 40);
  y -= 18;
  draw(`Party Name: ${company.name}`, 40);
  y -= 18;
  draw(`No: ${period.month}/${period.year}`, 40);
  draw(`Date: ${period.month}/${period.year}`, 660);
  y -= 30;

  const headers = ["#", "Product", "Date", "Qty", "Commission", "Amount", "Party"];
  const xs = [40, 70, 250, 340, 410, 510, 610];
  headers.forEach((header, index) => page.drawText(header, { x: xs[index], y, size: 9, font: bold }));
  y -= 16;

  let total = 0;
  expenses.forEach((expense, index) => {
    if (y < 70) {
      page = pdf.addPage([842, 595]);
      y = 555;
    }
    const amount = expense.qty * expense.commission;
    total += amount;
    const values = [
      String(index + 1),
      expense.product_name.slice(0, 28),
      displayDate(expense.expense_date),
      money(expense.qty),
      money(expense.commission),
      money(amount),
      expense.party_name.slice(0, 26)
    ];
    values.forEach((value, valueIndex) => page.drawText(value, { x: xs[valueIndex], y, size: 8, font }));
    y -= 14;
  });

  y -= 10;
  page.drawText("TOTAL", { x: 40, y, size: 10, font: bold });
  page.drawText(money(total), { x: 510, y, size: 10, font: bold });
  y -= 42;
  page.drawText(`For, ${user.name}`, { x: 40, y, size: 10, font: bold });
  y -= 42;
  page.drawText("Authorized Signatory", { x: 40, y, size: 10, font: bold });

  return {
    filename: reportFilename(userCode, companyCode, reportDate, "pdf"),
    bytes: Buffer.from(await pdf.save())
  };
}

export function selectedCsvDownload(expenses: Expense[], userCode: UserCode, companyCode: CompanyCode, reportDate: string) {
  return {
    filename: reportFilename(userCode, companyCode, reportDate, "csv"),
    bytes: Buffer.from(selectedCsv(expenses), "utf8")
  };
}
