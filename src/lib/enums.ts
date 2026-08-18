export const ROLES = {
  SUPERADMIN: "Superadmin",
  PIMPINAN: "Pimpinan",
  MANAGER: "Manager",
  STAFF: "Staff",
} as const;

export const UNIT_TYPES = {
  SEDERHANA: "Sederhana",
  RETAIL: "Retail",
} as const;

export const TX_TYPES = {
  DEBIT: "Debit",
  KREDIT: "Kredit",
} as const;

export const TX_METHODS = {
  TUNAI: "Tunai",
  TRANSFER: "Transfer",
} as const;

export const TX_STATUS = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
} as const;
