function getSwal() {
  if (typeof window === 'undefined' || !window.Swal) {
    throw new Error('SweetAlert2 no está cargado')
  }
  return window.Swal
}

export async function alertSuccess(title: string, text?: string) {
  await getSwal().fire({
    icon: 'success',
    title,
    text,
    timer: 2200,
    showConfirmButton: false,
  })
}

export async function alertError(title: string, text?: string) {
  await getSwal().fire({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Entendido',
  })
}

export async function confirmAction(
  title: string,
  text: string,
  confirmText = 'Confirmar',
): Promise<boolean> {
  const result = await getSwal().fire({
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
  })
  return result.isConfirmed
}
