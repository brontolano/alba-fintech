// Type guards for string-based "enums" (SQLite doesn't support native enums)

export const ROLES = ["Pimpinan", "Manager", "Staff"] as const
export type Role = (typeof ROLES)[number]

export const UNITS = ["Kantor", "Kantin", "Koperasi", "All"] as const
export type UnitName = (typeof UNITS)[number]

export const UNIT_TYPES = ["Sederhana", "Retail"] as const
export type UnitType = (typeof UNIT_TYPES)[number]

export const TX_TYPES = ["Debit", "Kredit"] as const
export type TxType = (typeof TX_TYPES)[number]

export const TX_METHODS = ["Tunai", "Transfer"] as const
export type TxMethod = (typeof TX_METHODS)[number]

export const TX_STATUSES = ["Draft", "Submitted", "Pending", "Approved", "Rejected"] as const
export type TxStatus = (typeof TX_STATUSES)[number]

export const APPROVAL_LEVELS = ["Manager", "Pimpinan"] as const
export type ApprovalLevel = (typeof APPROVAL_LEVELS)[number]

export function isRole(v: string): v is Role {
  return (ROLES as readonly string[]).includes(v)
}
export function isUnit(v: string): v is UnitName {
  return (UNITS as readonly string[]).includes(v)
}
export function isUnitType(v: string): v is UnitType {
  return (UNIT_TYPES as readonly string[]).includes(v)
}
export function isTxStatus(v: string): v is TxStatus {
  return (TX_STATUSES as readonly string[]).includes(v)
}

// Retail module RBAC: only Staff/Manager in a Retail unit with the toggle on
export function canUseRetail(role: string, retailModuleEnabled: boolean): boolean {
  return retailModuleEnabled && role !== "Pimpinan"
}
