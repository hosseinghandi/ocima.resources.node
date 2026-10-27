export interface DepartmentActivities {
  reparto: string;
  attivita: string[];
}

const departmentLabels: Record<string, string> = {
  Assemb_Meccanico: "Assemblaggio meccanico",
  Officina_Elettrica: "Officina elettrica",
  Officina_Meccanica: "Officina meccanica",
};

export function departmentLabel(reparto: string): string {
  return departmentLabels[reparto] ?? reparto.replace(/_/g, " ");
}
