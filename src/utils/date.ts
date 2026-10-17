// Ecuador continental no usa horario de verano: -05:00 todo el año
export const startOfDay = (d: string) => new Date(`${d}T00:00:00.000-05:00`);
export const endOfDay = (d: string) => new Date(`${d}T23:59:59.999-05:00`);
