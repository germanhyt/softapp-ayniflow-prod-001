declare global {
  interface Window {
    Swal: typeof import('sweetalert2').default
  }
}

export {}
