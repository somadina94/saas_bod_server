import Company from "../models/Company.model.js";
import Customer from "../models/Customer.model.js";
import Invoice from "../models/Invoice.model.js";
import Quotation from "../models/Quotation.model.js";
import User from "../models/User.model.js";
import { env } from "../config/env.js";
import { sendTemplatedMail, isEmailConfigured } from "../utils/email.js";
import { signPublicLinkToken } from "../utils/publicLink.js";
import { createSimplePdf } from "../utils/simplePdf.js";

const formatMoney = (amount: number, currency: string): string => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Administrator",
  manager: "Manager",
  sales: "Sales",
  inventory: "Inventory",
  accountant: "Accountant",
  support: "Support",
  viewer: "Viewer",
};

const formatDateOnly = (value?: Date): string =>
  value
    ? value.toLocaleDateString(undefined, {
        dateStyle: "long",
      })
    : "—";

const buildInvoicePdfBuffer = (params: {
  companyName: string;
  customerName: string;
  currency: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  status: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  total: number;
  paidAmount: number;
  balance: number;
  notes?: string;
}): Promise<Buffer> => {
  const lines: string[] = [
    `${params.companyName} - CUSTOMER INVOICE`,
    "",
    `Invoice Number: ${params.invoiceNumber}`,
    `Customer: ${params.customerName}`,
    `Status: ${params.status}`,
    `Issue Date: ${formatDateOnly(params.issueDate)}`,
    `Due Date: ${formatDateOnly(params.dueDate)}`,
    "",
    "ITEMS",
  ];
  params.items.forEach((item, i) => {
    lines.push(
      `${i + 1}. ${item.description} | Qty ${item.quantity} | Unit ${formatMoney(item.unitPrice, params.currency)} | Line ${formatMoney(item.lineTotal, params.currency)}`,
    );
  });
  lines.push("");
  lines.push(`Total: ${formatMoney(params.total, params.currency)}`);
  lines.push(`Paid: ${formatMoney(params.paidAmount, params.currency)}`);
  lines.push(`Balance: ${formatMoney(params.balance, params.currency)}`);
  if (params.notes) {
    lines.push("");
    lines.push(`Notes: ${params.notes}`);
  }
  return createSimplePdf(lines);
};

const buildQuotationPdfBuffer = (params: {
  companyName: string;
  customerName: string;
  currency: string;
  quotationNumber: string;
  issueDate: Date;
  validUntil?: Date;
  status: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  total: number;
  notes?: string;
}): Promise<Buffer> => {
  const lines: string[] = [
    `${params.companyName} - CUSTOMER QUOTATION`,
    "",
    `Quotation Number: ${params.quotationNumber}`,
    `Customer: ${params.customerName}`,
    `Status: ${params.status}`,
    `Issue Date: ${formatDateOnly(params.issueDate)}`,
    `Valid Until: ${formatDateOnly(params.validUntil)}`,
    "",
    "ITEMS",
  ];
  params.items.forEach((item, i) => {
    lines.push(
      `${i + 1}. ${item.description} | Qty ${item.quantity} | Unit ${formatMoney(item.unitPrice, params.currency)} | Line ${formatMoney(item.lineTotal, params.currency)}`,
    );
  });
  lines.push("");
  lines.push(`Total: ${formatMoney(params.total, params.currency)}`);
  if (params.notes) {
    lines.push("");
    lines.push(`Notes: ${params.notes}`);
  }
  return createSimplePdf(lines);
};

export const notifyStaffInvitation = async (params: {
  email: string;
  firstName: string;
  lastName: string;
  invitationUrl: string;
  role: string;
}): Promise<void> => {
  if (!isEmailConfigured()) {
    throw new Error("SMTP is not configured for invitation emails.");
  }
  const company = await Company.findOne();
  const name = company?.name ?? env.companyName;
  const subj = `You're invited to ${name}`;
  await sendTemplatedMail({
    to: params.email,
    subject: subj,
    template: "staffInvitation",
    locals: {
      firstName: params.firstName,
      companyName: name,
      subject: subj,
      roleLabel: roleLabels[params.role] ?? params.role,
      invitationUrl: params.invitationUrl,
    },
  });
};

export const notifyInvoiceSent = async (params: {
  customerId: string;
  invoiceNumber: string;
  total: number;
  currency: string;
  dueDate: Date;
  notes?: string;
  invoiceId: string;
}): Promise<void> => {
  if (!isEmailConfigured()) return;
  try {
    const [company, customer, invoice] = await Promise.all([
      Company.findOne(),
      Customer.findById(params.customerId),
      Invoice.findById(params.invoiceId),
    ]);
    if (!company?.notificationSettings.emailEnabled) return;
    if (!customer?.email?.trim()) return;
    if (!invoice) return;

    const subj = `Invoice ${params.invoiceNumber} from ${company.name}`;
    const token = signPublicLinkToken({
      resource: "invoice",
      docId: params.invoiceId,
      customerId: params.customerId,
    });
    const viewUrl = env.frontendUrl
      ? `${env.frontendUrl.replace(/\/$/, "")}/public/invoice/${encodeURIComponent(token)}`
      : undefined;
    const paymentUrl =
      invoice.paystackPaymentUrl?.trim() || invoice.paymentLinkUrl?.trim() || undefined;

    const invoicePdf = await buildInvoicePdfBuffer({
      companyName: company.name,
      customerName: customer.name,
      currency: params.currency,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      total: invoice.total,
      paidAmount: invoice.paidAmount,
      balance: invoice.balance,
      notes: invoice.notes,
    });

    await sendTemplatedMail({
      to: customer.email,
      subject: subj,
      template: "invoiceSent",
      locals: {
        customerName: customer.name,
        companyName: company.name,
        subject: subj,
        invoiceNumber: params.invoiceNumber,
        currency: params.currency,
        formattedTotal: formatMoney(params.total, params.currency),
        dueDateLabel: params.dueDate.toLocaleDateString(undefined, {
          dateStyle: "long",
        }),
        notes: params.notes,
        viewUrl,
        paymentUrl,
      },
      attachments: [
        {
          filename: `invoice-${params.invoiceNumber}.pdf`,
          content: invoicePdf,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (err) {
    console.error("[email] invoiceSent failed", err);
  }
};

export const notifyPaymentReceived = async (params: {
  customerId: string;
  amount: number;
  currency: string;
  paymentNumber: string;
  reference?: string;
  receiptNumber?: string;
  invoiceNumbers: string[];
}): Promise<void> => {
  if (!isEmailConfigured()) return;
  try {
    const [company, customer] = await Promise.all([
      Company.findOne(),
      Customer.findById(params.customerId),
    ]);
    if (!company?.notificationSettings.emailEnabled) return;
    if (!company.notificationSettings.sendPaymentConfirmations) return;
    if (!customer?.email?.trim()) return;

    const invLabel =
      params.invoiceNumbers.length === 1
        ? params.invoiceNumbers[0]!
        : params.invoiceNumbers.join(", ");

    const subj = `Payment received — ${company.name}`;

    await sendTemplatedMail({
      to: customer.email,
      subject: subj,
      template: "paymentReceived",
      locals: {
        customerName: customer.name,
        companyName: company.name,
        subject: subj,
        currency: params.currency,
        formattedAmount: formatMoney(params.amount, params.currency),
        paymentNumber: params.paymentNumber,
        invoiceNumber: invLabel,
        reference: params.reference,
        receiptNumber: params.receiptNumber,
        // Customer-facing payment emails should not link to internal dashboard.
        viewUrl: undefined,
      },
    });
  } catch (err) {
    console.error("[email] paymentReceived failed", err);
  }
};

export const notifyQuotationSent = async (params: {
  customerId: string;
  quotationNumber: string;
  total: number;
  currency: string;
  validUntil?: Date;
  quotationId: string;
}): Promise<void> => {
  if (!isEmailConfigured()) return;
  try {
    const [company, customer, quotation] = await Promise.all([
      Company.findOne(),
      Customer.findById(params.customerId),
      Quotation.findById(params.quotationId),
    ]);
    if (!company?.notificationSettings.emailEnabled) return;
    if (!customer?.email?.trim()) return;
    if (!quotation) return;

    const subj = `Quotation ${params.quotationNumber} from ${company.name}`;
    const quotationPdf = await buildQuotationPdfBuffer({
      companyName: company.name,
      customerName: customer.name,
      currency: params.currency,
      quotationNumber: quotation.quotationNumber,
      issueDate: quotation.issueDate,
      validUntil: quotation.validUntil,
      status: quotation.status,
      items: quotation.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      total: quotation.total,
      notes: quotation.notes,
    });
    await sendTemplatedMail({
      to: customer.email,
      subject: subj,
      template: "quotationSent",
      locals: {
        customerName: customer.name,
        companyName: company.name,
        subject: subj,
        quotationNumber: params.quotationNumber,
        currency: params.currency,
        formattedTotal: formatMoney(params.total, params.currency),
        validUntil: params.validUntil,
        validUntilLabel: params.validUntil
          ? params.validUntil.toLocaleDateString(undefined, {
              dateStyle: "long",
            })
          : undefined,
        viewUrl: env.frontendUrl
          ? `${env.frontendUrl.replace(/\/$/, "")}/public/quotation/${encodeURIComponent(
              signPublicLinkToken({
                resource: "quotation",
                docId: params.quotationId,
                customerId: params.customerId,
              }),
            )}`
          : undefined,
      },
      attachments: [
        {
          filename: `quotation-${params.quotationNumber}.pdf`,
          content: quotationPdf,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (err) {
    console.error("[email] quotationSent failed", err);
  }
};

export const notifyExpenseStatus = async (params: {
  submittedByUserId: string;
  title: string;
  amount: number;
  currency: string;
  status: "approved" | "rejected";
  reason?: string;
  expenseDate: Date;
}): Promise<void> => {
  if (!isEmailConfigured()) return;
  try {
    const company = await Company.findOne();
    if (!company?.notificationSettings.emailEnabled) return;

    const user = await User.findById(params.submittedByUserId);
    if (!user?.email?.trim()) return;
    if (user.notificationPreferences?.email === false) return;

    const subj =
      params.status === "approved"
        ? `Expense approved — ${company.name}`
        : `Expense update — ${company.name}`;

    await sendTemplatedMail({
      to: user.email,
      subject: subj,
      template: "expenseStatus",
      locals: {
        firstName: user.firstName,
        companyName: company.name,
        subject: subj,
        title: params.title,
        currency: params.currency,
        formattedAmount: formatMoney(params.amount, params.currency),
        status: params.status,
        reason: params.reason,
        submittedAtLabel: params.expenseDate.toLocaleDateString(undefined, {
          dateStyle: "long",
        }),
      },
    });
  } catch (err) {
    console.error("[email] expenseStatus failed", err);
  }
};
