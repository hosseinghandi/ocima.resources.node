export const employeeStatuses = ["Attivo", "In ferie", "Inattivo"] as const;
export type EmployeeStatus = (typeof employeeStatuses)[number];

export interface Employee {
  id: number;
  name: string;
  department: string;
  email: string;
  phone: string;
  status: EmployeeStatus;
  resetRequested: boolean;
  /** UTC "YYYY-MM-DD HH:MM:SS" when a reset was requested, otherwise null. */
  resetRequestedAt: string | null;
  /** UTC timestamp of the last admin reset; cleared once the person changes password. */
  passwordResetAt: string | null;
}

export type EmployeeInput = Omit<
  Employee,
  "id" | "resetRequested" | "resetRequestedAt" | "passwordResetAt"
>;

export interface Administrator {
  id: number;
  name: string;
  resetRequested: boolean;
  resetRequestedAt: string | null;
  passwordResetAt: string | null;
}

export type LoginRole = "admin" | "employee";

export interface ChangePasswordRequest {
  role: LoginRole;
  id: number;
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  role: LoginRole;
  id: number;
  adminId: number;
  adminPassword: string;
}

export interface LoginRequest {
  role: LoginRole;
  id: number;
  password: string;
}

export interface Session {
  role: LoginRole;
  id: number;
  name: string;
}
