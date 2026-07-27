import { useEffect, useMemo, useRef, useState } from 'react'
import { Link2, ScanLine } from 'lucide-react'

import { FormField, ModalFormActions } from '../../../../core/components/FormField'
import { Modal } from '../../../../core/components/Modal'
import { ModalSection } from '../../../../core/components/ModalSection'
import { alertError, alertSuccess } from '../../../../core/utils/alerts'
import { useCreateTransaction, useIsIntegrationEnabled, useUpdateTransaction, useVoucherOcr } from '../../application/hooks/useFinance'
import type { CatalogItem, LoanRecord, MovementType, OcrExtractResult, SavingsGoal, Transaction } from '../../domain/models/finance.types'
import { extractVoucherImage } from '../../application/utils/voucherOcrLocal'
import { todayIsoDate, currentTimeInLima } from '../../application/utils/formatters'

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  banks: CatalogItem[]
  paymentTypes: CatalogItem[]
  categories: CatalogItem[]
  savingsGoals: SavingsGoal[]
  loanRecords: LoanRecord[]
  editing?: Transaction | null
}

function emptyFormDefaults(banks: CatalogItem[], paymentTypes: CatalogItem[], categories: CatalogItem[]) {
  return {
    transaction_date: todayIsoDate(),
    transaction_time: currentTimeValue(),
    movement_type: 'Ingreso' as MovementType,
    concept: '',
    bank: banks[0]?.name ?? 'BCP',
    payment_type: paymentTypes[0]?.name ?? 'TRANSFERENCIA',
    recipient: '',
    operation_number: '',
    amount: '',
    category: categories[0]?.name ?? 'Otros',
    savings_goal_id: '',
    loan_record_id: '',
  }
}

function formatTimeForInput(time: string | null | undefined): string {
  if (!time) return currentTimeValue()
  return time.length >= 8 ? time.slice(0, 8) : time
}

function currentTimeValue() {
  return currentTimeInLima()
}

export function TransactionModal({
  isOpen,
  onClose,
  banks,
  paymentTypes,
  categories,
  savingsGoals,
  loanRecords,
  editing,
}: TransactionModalProps) {
  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const isEditing = Boolean(editing)
  const isPending = createTransaction.isPending || updateTransaction.isPending
  const voucherOcr = useVoucherOcr()
  const { enabled: geminiOcrEnabled } = useIsIntegrationEnabled('gemini_ocr', false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocrMessage, setOcrMessage] = useState<string | null>(null)
  const [ocrScanning, setOcrScanning] = useState(false)

  const [form, setForm] = useState({
    transaction_date: todayIsoDate(),
    transaction_time: currentTimeValue(),
    movement_type: 'Ingreso' as MovementType,
    concept: '',
    bank: '',
    payment_type: '',
    recipient: '',
    operation_number: '',
    amount: '',
    category: '',
    savings_goal_id: '',
    loan_record_id: '',
  })

  const payableLoans = useMemo(
    () => loanRecords.filter((loan) => (loan.loan_type ?? 'payable') === 'payable'),
    [loanRecords],
  )
  const receivableLoans = useMemo(
    () => loanRecords.filter((loan) => loan.loan_type === 'receivable'),
    [loanRecords],
  )

  const clearIncompatibleLoan = (movementType: MovementType, loanId: string) => {
    if (!loanId) return ''
    const loan = loanRecords.find((item) => String(item.id) === loanId)
    if (!loan) return ''
    if (movementType === 'Ingreso' && (loan.loan_type ?? 'payable') === 'payable') return ''
    return loanId
  }

  useEffect(() => {
    if (!isOpen) return

    if (editing) {
      setForm({
        transaction_date: editing.transaction_date,
        transaction_time: formatTimeForInput(editing.transaction_time),
        movement_type: editing.movement_type,
        concept: editing.concept,
        bank: editing.bank,
        payment_type: editing.payment_type,
        recipient: editing.recipient ?? '',
        operation_number: editing.operation_number ?? '',
        amount: editing.amount,
        category: editing.category ?? categories[0]?.name ?? 'Otros',
        savings_goal_id: editing.savings_goal_id ? String(editing.savings_goal_id) : '',
        loan_record_id: editing.loan_record_id ? String(editing.loan_record_id) : '',
      })
      return
    }

    setForm(emptyFormDefaults(banks, paymentTypes, categories))
  }, [isOpen, editing, banks, paymentTypes, categories])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      const payload = {
        transaction_date: form.transaction_date,
        transaction_time: form.transaction_time || undefined,
        movement_type: form.movement_type,
        concept: form.concept,
        bank: form.bank,
        payment_type: form.payment_type,
        recipient: form.recipient || undefined,
        operation_number: form.operation_number || undefined,
        amount: Number(form.amount),
        category: form.category || undefined,
        savings_goal_id: form.savings_goal_id ? Number(form.savings_goal_id) : null,
        loan_record_id: form.loan_record_id ? Number(form.loan_record_id) : null,
      }

      if (isEditing && editing) {
        await updateTransaction.mutateAsync({ id: editing.id, payload })
        await alertSuccess('Transacción actualizada')
      } else {
        await createTransaction.mutateAsync(payload)
        await alertSuccess('Transacción registrada')
      }

      onClose()
      setForm(emptyFormDefaults(banks, paymentTypes, categories))
    } catch {
      setError(isEditing ? 'No se pudo actualizar la transacción.' : 'No se pudo guardar la transacción.')
      await alertError(
        'Error',
        isEditing ? 'No se pudo actualizar la transacción.' : 'No se pudo guardar la transacción.',
      )
    }
  }

  const applyOcrToForm = (data: OcrExtractResult) => {
    setForm((prev) => ({
      ...prev,
      transaction_date: data.fecha || prev.transaction_date,
      transaction_time: data.hora?.slice(0, 8) || prev.transaction_time,
      movement_type: (data.movimiento === 'Ingreso' ? 'Ingreso' : 'Egreso') as MovementType,
      concept: data.concepto || prev.concept,
      bank: data.banco || prev.bank,
      payment_type: data.tipo || prev.payment_type,
      recipient: data.destinatario || prev.recipient,
      operation_number: data.num_operacion || prev.operation_number,
      amount: data.monto != null ? String(data.monto) : prev.amount,
    }))
  }

  const handleOcrUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError(null)
    setOcrMessage(null)
    setOcrScanning(true)
    try {
      const { data, source } = await extractVoucherImage(file, {
        geminiEnabled: geminiOcrEnabled,
        extractRemote: (upload) => voucherOcr.mutateAsync(upload),
      })
      applyOcrToForm(data)
      setOcrMessage(
        source === 'gemini'
          ? 'Datos extraídos con Gemini. Revisa antes de guardar.'
          : 'Datos extraídos con OCR del navegador (Tesseract). Revisa antes de guardar.',
      )
    } catch {
      const hint = geminiOcrEnabled
        ? 'Verifica la API key en Integraciones → OCR o prueba desactivar Gemini para usar OCR local.'
        : 'No se detectaron datos legibles. Usa una imagen nítida del voucher.'
      setError(`No se pudo procesar el voucher. ${hint}`)
    } finally {
      setOcrScanning(false)
    }
  }

  const showLinkSection =
    (form.movement_type === 'Ingreso' && receivableLoans.length > 0) ||
    (form.movement_type === 'Egreso' &&
      (savingsGoals.length > 0 || payableLoans.length > 0 || receivableLoans.length > 0))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar transacción' : 'Nueva transacción'}
      subtitle={
        isEditing
          ? 'Actualiza los datos del movimiento registrado.'
          : 'Registra manualmente o escanea un voucher BCP/Yape.'
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="modal-form space-y-4">
        {!isEditing && (
          <ModalSection
            title="Escanear voucher"
            description={
              geminiOcrEnabled
                ? 'Extracción con Gemini. Revisa los campos antes de guardar.'
                : 'OCR local en el navegador (Tesseract).'
            }
            icon={ScanLine}
            actions={
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleOcrUpload}
                />
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={ocrScanning || voucherOcr.isPending}
                >
                  <ScanLine size={16} />
                  {ocrScanning || voucherOcr.isPending ? 'Escaneando…' : 'Subir imagen'}
                </button>
              </>
            }
          >
            {ocrMessage ? <p className="alert-info rounded-lg px-3 py-2 text-sm">{ocrMessage}</p> : null}
          </ModalSection>
        )}

        <ModalSection title="Tipo de movimiento" description="Define si es ingreso o egreso.">
          <div className="movement-toggle">
          <button
            type="button"
            className={`movement-toggle-btn${
              form.movement_type === 'Ingreso' ? ' movement-toggle-btn-active-ingreso' : ''
            }`}
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                movement_type: 'Ingreso',
                savings_goal_id: '',
                loan_record_id: clearIncompatibleLoan('Ingreso', prev.loan_record_id),
              }))
            }
          >
            INGRESO
          </button>
          <button
            type="button"
            className={`movement-toggle-btn${
              form.movement_type === 'Egreso' ? ' movement-toggle-btn-active-egreso' : ''
            }`}
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                movement_type: 'Egreso',
                loan_record_id: clearIncompatibleLoan('Egreso', prev.loan_record_id),
              }))
            }
          >
            EGRESO
          </button>
          </div>
        </ModalSection>

        <ModalSection title="Datos del movimiento" description="Información principal del registro.">
        <div className="modal-form-grid">
          <FormField label="Fecha">
            <input
              type="date"
              value={form.transaction_date}
              onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
              className="input-field"
              required
            />
          </FormField>
          <FormField label="Hora">
            <input
              type="time"
              step={1}
              value={form.transaction_time}
              onChange={(e) => setForm({ ...form, transaction_time: e.target.value })}
              className="input-field"
            />
          </FormField>
          <FormField label="Monto (S/)">
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="input-field"
              placeholder="0.00"
              required
            />
          </FormField>
          <FormField label="Banco">
            <select
              value={form.bank}
              onChange={(e) => setForm({ ...form, bank: e.target.value })}
              className="input-field"
              required
            >
              {banks.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Tipo de pago">
            <select
              value={form.payment_type}
              onChange={(e) => setForm({ ...form, payment_type: e.target.value })}
              className="input-field"
              required
            >
              {paymentTypes.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Categoría">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input-field"
            >
              {categories.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="N° operación">
            <input
              type="text"
              value={form.operation_number}
              onChange={(e) => setForm({ ...form, operation_number: e.target.value })}
              className="input-field"
              placeholder="Num. operación"
            />
          </FormField>
          <FormField label="Concepto">
            <input
              type="text"
              value={form.concept}
              onChange={(e) => setForm({ ...form, concept: e.target.value })}
              className="input-field"
              placeholder="Ej: Pago de servicios"
              required
            />
          </FormField>
          <FormField label="Destinatario" className="md:col-span-2">
            <input
              type="text"
              value={form.recipient}
              onChange={(e) => setForm({ ...form, recipient: e.target.value })}
              className="input-field"
              placeholder="Nombre o entidad"
            />
          </FormField>
        </div>
        </ModalSection>

        {showLinkSection && (
          <ModalSection
            title="Vínculos opcionales"
            description="Asocia el movimiento a metas de ahorro o créditos activos."
            icon={Link2}
          >
            <div className="modal-form-grid">
          {form.movement_type === 'Ingreso' && receivableLoans.length > 0 && (
            <FormField label="Vincular cobro (me deben)" className="md:col-span-2">
              <select
                value={form.loan_record_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    loan_record_id: e.target.value,
                    savings_goal_id: '',
                  })
                }
                className="input-field"
              >
                <option value="">Sin vínculo</option>
                {receivableLoans.map((loan) => (
                  <option key={loan.id} value={loan.id}>
                    {loan.lender} — pend. {loan.outstanding_amount}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          {form.movement_type === 'Egreso' && (
            <>
              {savingsGoals.length > 0 && (
                <FormField label="Vincular a meta de ahorro">
                  <select
                    value={form.savings_goal_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        savings_goal_id: e.target.value,
                        loan_record_id: e.target.value ? '' : form.loan_record_id,
                      })
                    }
                    className="input-field"
                  >
                    <option value="">Sin vínculo</option>
                    {savingsGoals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
              {(payableLoans.length > 0 || receivableLoans.length > 0) && (
                <FormField label="Vincular crédito" className={savingsGoals.length > 0 ? undefined : 'md:col-span-2'}>
                  <select
                    value={form.loan_record_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        loan_record_id: e.target.value,
                        savings_goal_id: e.target.value ? '' : form.savings_goal_id,
                      })
                    }
                    className="input-field"
                  >
                    <option value="">Sin vínculo</option>
                    {payableLoans.length > 0 && (
                      <optgroup label="Debo (pagar deuda)">
                        {payableLoans.map((loan) => (
                          <option key={loan.id} value={loan.id}>
                            {loan.lender} — pend. {loan.outstanding_amount}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {receivableLoans.length > 0 && (
                      <optgroup label="Me deben (desembolsar)">
                        {receivableLoans.map((loan) => (
                          <option key={loan.id} value={loan.id}>
                            {loan.lender} — pend. {loan.outstanding_amount}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </FormField>
              )}
            </>
          )}
            </div>
          </ModalSection>
        )}

        {error && <p className="alert-error rounded-lg px-3 py-2 text-sm">{error}</p>}

        <ModalFormActions>
          <button type="button" onClick={onClose} className="btn-secondary" disabled={isPending}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar transacción'}
          </button>
        </ModalFormActions>
      </form>
    </Modal>
  )
}
