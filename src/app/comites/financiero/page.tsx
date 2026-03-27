import { redirect } from 'next/navigation'

// El control financiero ahora vive dentro del comité de Obras
export default function FinancieroRedirect() {
  redirect('/comites/obras')
}
