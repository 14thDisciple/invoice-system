export type DocumentType = 'invoice' | 'ewaybill' | 'receipt';

export interface CompanyDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  logoUrl?: string;
  signatureUrl?: string;
  accentColor?: string;
}

export interface ClientDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  company: CompanyDetails;
  client: ClientDetails;
  items: LineItem[];
  taxRate: number;
  notes: string;
}

export interface EWayBillData {
  ewayBillNo: string;
  date: string;
  validUntil: string;
  generator: string;
  supplier: CompanyDetails;
  recipient: ClientDetails;
  dispatchFrom: string;
  shipTo: string;
  hsnCode: string;
  goodsValue: number;
  vehicleNumber: string;
  transporterName: string;
  transportDocNo: string;
  transportDocDate: string;
}

export interface ReceiptData {
  receiptNumber: string;
  date: string;
  company: CompanyDetails;
  client: ClientDetails;
  amountReceived: number;
  paymentMethod: string;
  paymentReference: string;
  forInvoiceNo: string;
  notes: string;
}

export interface DocumentHistoryEntry {
  id: string;
  docType: DocumentType;
  date: string;
  clientName: string;
  documentNumber: string;
  totalAmount?: number;
  data: any;
}
