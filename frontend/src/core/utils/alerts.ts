function getSwal() {
  if (typeof window === 'undefined' || !window.Swal) {
    throw new Error('SweetAlert2 no está cargado')
  }
  return window.Swal
}

function getThemeAwareOptions() {
  return {
    customClass: {
      container: 'swal2-ayniflow-container',
      popup: 'swal2-ayniflow',
      title: 'swal2-ayniflow-title',
      htmlContainer: 'swal2-ayniflow-html',
      actions: 'swal2-ayniflow-actions',
      confirmButton: 'btn-primary',
      cancelButton: 'btn-secondary',
    },
    buttonsStyling: false,
    color: getComputedStyle(document.documentElement).getPropertyValue('--premium-text').trim() || undefined,
    background:
      getComputedStyle(document.documentElement).getPropertyValue('--premium-surface').trim() ||
      undefined,
  }
}

export async function alertSuccess(title: string, text?: string) {
  await getSwal().fire({
    ...getThemeAwareOptions(),
    icon: 'success',
    title,
    text,
    timer: 2200,
    showConfirmButton: false,
  })
}

export async function alertError(title: string, text?: string) {
  await getSwal().fire({
    ...getThemeAwareOptions(),
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
    ...getThemeAwareOptions(),
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
