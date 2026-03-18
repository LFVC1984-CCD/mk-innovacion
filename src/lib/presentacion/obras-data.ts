export interface Obra {
  id: string
  nombre: string
  mandante: string
  ubicacion: string
  inicioContractual: string
  inicioDate: Date
  terminoContractual: string
  terminoDate: Date
  terminoEstimado: string
  terminoEstDate: Date
  notaPlazo?: string
  avanceFisico: number
  avanceProgramado: number
  spi: number
  cpi: number
  presupuestoContrato: number
  ndcAprobadas: number
  ndcEnRevision: number
  ingresosFacturados: number
  margenTermino: number
  flujoMes: number
  presupuestoObra: number
  costoComprometido: number
  costoGastado: number
  saldoOC: number | null
  saldoSC: number | null
  retencionesSC: number | null
  estadoPago: string
  riesgos: number
  administrador: string
  jefe: string
}

export const OBRAS: Obra[] = [
  {
    id: 'petct', nombre: 'PET CT Clínica Alemana', mandante: 'Clínica Alemana de Santiago',
    ubicacion: 'Vitacura, Santiago',
    inicioContractual: '26-01-2026', inicioDate: new Date(2026, 0, 26),
    terminoContractual: '27-03-2026', terminoDate: new Date(2026, 2, 27),
    terminoEstimado: '30-04-2026', terminoEstDate: new Date(2026, 3, 30),
    notaPlazo: 'Atrasos mandante + NDC en cobro. GG.GG en proceso.',
    avanceFisico: 53, avanceProgramado: 53, spi: 0.71, cpi: 0.96,
    presupuestoContrato: 358, ndcAprobadas: 0, ndcEnRevision: 80,
    ingresosFacturados: 125, margenTermino: 6.2, flujoMes: 42,
    presupuestoObra: 273, costoComprometido: 208, costoGastado: 120,
    saldoOC: null, saldoSC: null, retencionesSC: null,
    estadoPago: 'Pendiente', riesgos: 3, administrador: 'Sin administrador', jefe: 'F. Valenzuela',
  },
  {
    id: 'corona', nombre: 'Reconversión Corona MAM', mandante: 'Grupo Corona',
    ubicacion: 'Macul, Santiago',
    inicioContractual: '17-02-2026', inicioDate: new Date(2026, 1, 17),
    terminoContractual: '17-06-2026', terminoDate: new Date(2026, 5, 17),
    terminoEstimado: '15-07-2026', terminoEstDate: new Date(2026, 6, 15),
    notaPlazo: 'Sobreplazo mínimo estimado.',
    avanceFisico: 4, avanceProgramado: 4, spi: 1.11, cpi: 0.99,
    presupuestoContrato: 2316, ndcAprobadas: 0, ndcEnRevision: -11,
    ingresosFacturados: 462, margenTermino: 11.8, flujoMes: 98,
    presupuestoObra: 1832, costoComprometido: 522, costoGastado: 146,
    saldoOC: null, saldoSC: null, retencionesSC: null,
    estadoPago: 'Al día', riesgos: 1, administrador: 'En proceso', jefe: 'F. Valenzuela',
  },
]
