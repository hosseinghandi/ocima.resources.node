import type {
  Administrator,
  ChangePasswordRequest,
  Employee,
  EmployeeInput,
  LoginRequest,
  LoginRole,
  ResetPasswordRequest,
  Session,
} from "../../shared/people";

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body === "object" && body !== null && "error" in body) {
    const message = body.error;
    if (typeof message === "string") return message;
  }
  return `Richiesta non riuscita (${response.status}).`;
}

async function send<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(await readError(response));
  return (response.status === 204 ? undefined : await response.json()) as T;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const getEmployees = (signal?: AbortSignal) =>
  send<Employee[]>("/api/employees", { signal });

export const createEmployee = (input: EmployeeInput) =>
  send<Employee>("/api/employees", jsonInit("POST", input));

export const updateEmployee = (id: number, input: EmployeeInput) =>
  send<Employee>(`/api/employees/${id}`, jsonInit("PUT", input));

export const deleteEmployee = (id: number) =>
  send<void>(`/api/employees/${id}`, { method: "DELETE" });

export const getAdministrators = (signal?: AbortSignal) =>
  send<Administrator[]>("/api/auth/administrators", { signal });

export const login = (request: LoginRequest) =>
  send<Session>("/api/auth/login", jsonInit("POST", request));

export const changePassword = (request: ChangePasswordRequest) =>
  send<void>("/api/auth/change-password", jsonInit("POST", request));

export const forgotPassword = (role: LoginRole, id: number) =>
  send<void>("/api/auth/forgot-password", jsonInit("POST", { role, id }));

export const resetPassword = (request: ResetPasswordRequest) =>
  send<void>("/api/auth/reset-password", jsonInit("POST", request));
