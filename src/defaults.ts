import { CompanyDetails, ClientDetails, InvoiceData, EWayBillData, ReceiptData } from './types';

export const COASTAL_TECH_HUB: CompanyDetails = {
  name: "Coastal Tech Hub",
  address: "123 Oceanfront Drive, Silicon Harbor, CA 90210",
  phone: "+1 (555) 123-4567",
  email: "billing@coastaltechhub.io",
  taxId: "CTH-98765432"
};

export const DEFAULT_CLIENT: ClientDetails = {
  name: "Acme Corp",
  address: "456 Enterprise Blvd, Inland City, NY 10001",
  phone: "+1 (555) 987-6543",
  email: "accounts@acmecorp.com",
  taxId: "ACM-12345678"
};

export const DEFAULT_INVOICE: InvoiceData = {
  invoiceNumber: "INV-2026-001",
  date: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  company: COASTAL_TECH_HUB,
  client: DEFAULT_CLIENT,
  items: [
    { id: '1', description: "Cloud Infrastructure Setup", quantity: 1, rate: 2500 },
    { id: '2', description: "Monthly DevOps Support", quantity: 1, rate: 1200 },
  ],
  taxRate: 8.5,
  notes: "Thank you for doing business with Coastal Tech Hub."
};

export const DEFAULT_EWAY_BILL: EWayBillData = {
  ewayBillNo: "182736459012",
  date: new Date().toISOString().split('T')[0],
  validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  generator: "Coastal Tech Hub Logistics",
  supplier: COASTAL_TECH_HUB,
  recipient: DEFAULT_CLIENT,
  dispatchFrom: "Silicon Harbor Warehouse",
  shipTo: "Acme Corp HQ",
  hsnCode: "8471",
  goodsValue: 45000,
  vehicleNumber: "CA-12-AB-3456",
  transporterName: "Pacific Freight Co.",
  transportDocNo: "TF-998877",
  transportDocDate: new Date().toISOString().split('T')[0]
};

export const DEFAULT_RECEIPT: ReceiptData = {
  receiptNumber: "RCT-2026-001",
  date: new Date().toISOString().split('T')[0],
  company: COASTAL_TECH_HUB,
  client: DEFAULT_CLIENT,
  amountReceived: 3700,
  paymentMethod: "Bank Transfer",
  paymentReference: "REF-10029384",
  forInvoiceNo: "INV-2026-001",
  notes: "Payment received in full."
};
