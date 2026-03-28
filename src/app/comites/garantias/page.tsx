import { redirect } from 'next/navigation'

// Garantías ahora vive como tab dentro del comité de Finanzas
export default function GarantiasRedirect() {
  redirect('/comites/finanzas')
}
