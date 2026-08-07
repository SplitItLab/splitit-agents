export type InsufficientDataReport = {
  resumenEjecutivo: string;
  avance: "amarillo";
  tareasCompletadas: [];
  tareasEnCurso: [];
  tareasAtrasadas: [];
  pullRequestsPendientes: [];
  bloqueos: [];
  riesgos: [];
  proximasAcciones: string[];
  decisiones: string[];
  estado: "datos-insuficientes";
};

export function insufficientDataReport(reason: string): InsufficientDataReport {
  return {
    resumenEjecutivo: `No hay datos suficientes para generar el reporte: ${reason}. No se generó información inventada.`,
    avance: "amarillo",
    tareasCompletadas: [],
    tareasEnCurso: [],
    tareasAtrasadas: [],
    pullRequestsPendientes: [],
    bloqueos: [],
    riesgos: [],
    proximasAcciones: ["Autorizar/conectar Linear y reintentar."],
    decisiones: ["Confirmar el acceso al workspace de Linear."],
    estado: "datos-insuficientes",
  };
}
