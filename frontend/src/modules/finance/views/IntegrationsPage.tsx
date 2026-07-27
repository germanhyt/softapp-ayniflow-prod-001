import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FileSpreadsheet, Mail, Plug, ScanLine, ShieldAlert, Webhook } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { HealthBadge } from '../../../core/components/HealthBadge'
import { IntegrationPanel } from '../../../core/components/IntegrationPanel'
import { PageHeader } from '../../../core/components/PageHeader'
import { ProgressBar } from '../../../core/components/ProgressBar'
import { StatSummary } from '../../../core/components/StatSummary'
import { ToggleSwitch } from '../../../core/components/ToggleSwitch'
import { alertError, alertSuccess, confirmAction } from '../../../core/utils/alerts'
import { getApiErrorMessage } from '../../../core/utils/apiError'
import { formatDateTimeWithSeconds } from '../../../core/utils/datetime'
import {
  hasAnyPermission,
  hasPermission,
  useCurrentUser,
} from '../../auth/application/hooks/useAuth'
import {
  useConnectGmail,
  useDisconnectGmail,
  useGmailConnection,
  useGmailPollStatus,
  useIntegrationSettingsList,
  useIntegrationsStatus,
  usePollGmailNew,
  useSyncGmailHistorical,
  useSyncGoogleSheets,
  useUpdateIntegrationSetting,
} from '../application/hooks/useFinance'
import type { IntegrationSettingItem } from '../domain/models/finance.types'
import { isGmailOAuthResultMessage } from './GmailOAuthCallbackPage'

function StatusCard({
  label,
  description,
  configured,
}: {
  label: string
  description: string
  configured: boolean
}) {
  return (
    <article className={`budget-card space-y-2 !rounded-xl !p-4 ${configured ? 'stat-summary--success' : ''}`}>
      <div className="flex items-center gap-2">
        <span className={`integration-dot ${configured ? 'on' : 'off'}`} />
        <h4 className="font-medium">{label}</h4>
        <HealthBadge
          className="ml-auto"
          label={configured ? 'Configurado' : 'Pendiente'}
          tone={configured ? 'success' : 'warning'}
        />
      </div>
      <p className="text-sm text-muted">{description}</p>
    </article>
  )
}

function FeatureToggleRow({
  item,
  onToggle,
  disabled,
  saving,
}: {
  item: IntegrationSettingItem
  onToggle: (enabled: boolean) => void
  disabled?: boolean
  saving?: boolean
}) {
  return (
    <div className="integration-toggle-row">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{item.label}</p>
        <p className="text-sm text-muted">{item.description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-muted">
          {saving ? 'Guardando...' : item.is_enabled ? 'Activo' : 'Inactivo'}
        </span>
        <ToggleSwitch
          id={`integration-toggle-${item.key}`}
          checked={item.is_enabled}
          disabled={disabled}
          onChange={onToggle}
        />
      </div>
    </div>
  )
}

function ConfigField({
  item,
  onSave,
  disabled,
}: {
  item: IntegrationSettingItem
  onSave: (value: string) => void
  disabled?: boolean
}) {
  const isSecret = item.value_type === 'secret'
  const [value, setValue] = useState(isSecret ? '' : (item.config_value ?? ''))

  useEffect(() => {
    if (!isSecret) {
      setValue(item.config_value ?? '')
    }
  }, [item.config_value, isSecret])

  const placeholder = isSecret
    ? item.effective_value || item.env_default || 'Pega tu API key'
    : item.env_default || 'Valor desde .env'
  const effective = item.effective_value || item.env_default || '—'

  return (
    <div className="integration-config-field">
      <label>
        <span className="font-medium">{item.label}</span>
        <input
          type={isSecret ? 'password' : 'text'}
          className="input-field mt-1"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={isSecret ? 'off' : undefined}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (isSecret) {
              if (value.trim()) {
                onSave(value.trim())
                setValue('')
              }
              return
            }
            if ((item.config_value ?? '') !== value) {
              onSave(value)
            }
          }}
        />
      </label>
      <p className="env-hint mt-1">
        {isSecret ? (
          <>
            Estado:{' '}
            <code className="font-mono text-xs">{effective !== '—' ? `Configurada (${effective})` : 'Sin clave'}</code>
          </>
        ) : (
          <>
            Default .env: <code className="font-mono text-xs">{item.env_default || '(vacío)'}</code>
            {' · '}
            Efectivo: <code className="font-mono text-xs">{effective}</code>
          </>
        )}
      </p>
    </div>
  )
}

function useSettingsMap(settings: IntegrationSettingItem[] | undefined) {
  return useMemo(() => {
    const map = new Map<string, IntegrationSettingItem>()
    settings?.forEach((item) => map.set(item.key, item))
    return map
  }, [settings])
}

export function IntegrationsPage() {
  const { data: user } = useCurrentUser()
  const canAccess = hasAnyPermission(user, [
    'integrations:read',
    'integrations:write',
    'integrations:gmail_connect',
  ])
  const canWrite = hasPermission(user, 'integrations:write')
  const canGmail = hasAnyPermission(user, ['integrations:gmail_connect', 'integrations:write'])

  const { data: status, refetch: refetchStatus } = useIntegrationsStatus()
  const { data: gmailConnection, refetch: refetchGmail } = useGmailConnection()
  const { data: gmailPollStatus } = useGmailPollStatus()
  const { data: integrationSettings } = useIntegrationSettingsList()
  const updateIntegrationSetting = useUpdateIntegrationSetting()
  const queryClient = useQueryClient()
  const settingsMap = useSettingsMap(integrationSettings)
  const connectGmail = useConnectGmail()
  const disconnectGmail = useDisconnectGmail()
  const syncSheets = useSyncGoogleSheets()
  const syncGmailHistorical = useSyncGmailHistorical()
  const pollGmailNew = usePollGmailNew()
  const [searchParams, setSearchParams] = useSearchParams()
  const [message, setMessage] = useState<string | null>(null)

  const gmailConnected = gmailConnection?.connected ?? status?.gmail.configured ?? false
  const settingsReady = integrationSettings !== undefined
  const isSettingEnabled = (key: string) => {
    if (!settingsReady) return false
    return settingsMap.get(key)?.is_enabled ?? false
  }
  const pendingSettingKey = updateIntegrationSetting.isPending
    ? updateIntegrationSetting.variables?.key
    : undefined

  const refreshGmailState = () => {
    void refetchStatus()
    void refetchGmail()
    void queryClient.invalidateQueries({ queryKey: ['finance', 'integrations'] })
  }

  const saveIntegrationToggle = (item: IntegrationSettingItem, enabled: boolean) => {
    if (!canWrite) return
    updateIntegrationSetting.mutate(
      { key: item.key, isEnabled: enabled },
      {
        onSuccess: () => {
          void refetchStatus()
          if (item.key.startsWith('gmail')) {
            void queryClient.invalidateQueries({ queryKey: ['finance', 'integrations', 'gmail'] })
          }
        },
        onError: (error) => {
          void alertError(
            'No se guardó el cambio',
            getApiErrorMessage(error, `No se pudo actualizar «${item.label}».`),
          )
        },
      },
    )
  }

  const getSetting = (key: string) => settingsMap.get(key)

  const feature = (key: string) => {
    const item = getSetting(key)
    if (!item || !canWrite) return null
    return (
      <FeatureToggleRow
        key={item.key}
        item={item}
        saving={pendingSettingKey === item.key}
        disabled={pendingSettingKey !== undefined && pendingSettingKey !== item.key}
        onToggle={(enabled) => saveIntegrationToggle(item, enabled)}
      />
    )
  }

  const config = (key: string) => {
    const item = getSetting(key)
    if (!item || !canWrite) return null
    return (
      <ConfigField
        key={item.key}
        item={item}
        disabled={pendingSettingKey !== undefined}
        onSave={(value) =>
          updateIntegrationSetting.mutate(
            { key: item.key, configValue: value },
            {
              onSuccess: () => {
                if (item.value_type === 'secret') {
                  void alertSuccess('API key guardada', 'La clave se aplicará en el próximo escaneo OCR.')
                }
              },
              onError: () => {
                void alertError('Error', `No se pudo guardar «${item.label}».`)
              },
            },
          )
        }
      />
    )
  }

  useEffect(() => {
    const gmailResult = searchParams.get('gmail')
    if (!gmailResult) return

    if (gmailResult === 'connected') {
      const email = searchParams.get('email')
      setMessage(email ? `Gmail conectado: ${email}` : 'Gmail conectado correctamente.')
    } else if (gmailResult === 'error') {
      const reason = searchParams.get('reason')
      setMessage(reason ? `No se pudo conectar Gmail: ${reason}` : 'No se pudo conectar Gmail.')
    }

    refreshGmailState()
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (!isGmailOAuthResultMessage(event.data)) return

      if (event.data.status === 'connected') {
        setMessage(
          event.data.email
            ? `Gmail conectado: ${event.data.email}`
            : 'Gmail conectado correctamente.',
        )
        void alertSuccess(
          'Gmail conectado',
          event.data.email ? `Cuenta: ${event.data.email}` : 'La cuenta se vinculó correctamente.',
        )
      } else {
        const reason = event.data.reason
        setMessage(reason ? `No se pudo conectar Gmail: ${reason}` : 'No se pudo conectar Gmail.')
        void alertError('Error', reason || 'No se pudo conectar Gmail.')
      }
      refreshGmailState()
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSheetsSync = async () => {
    setMessage(null)
    try {
      const result = await syncSheets.mutateAsync()
      const msg = `Sincronización Sheets: ${result.created} creadas, ${result.skipped} omitidas.`
      setMessage(msg)
      await alertSuccess('Google Sheets sincronizado', msg)
    } catch {
      setMessage('No se pudo sincronizar Google Sheets. Verifica credenciales en .env del backend.')
      await alertError('Error', 'No se pudo sincronizar Google Sheets.')
    }
  }

  const handleGmailHistorical = async () => {
    setMessage(null)
    try {
      const result = await syncGmailHistorical.mutateAsync()
      const msg = `Correos históricos: ${result.created} creadas, ${result.skipped} omitidas, ${result.invalid} inválidas (${result.total} revisados).`
      setMessage(msg)
      await alertSuccess('Importación Gmail histórica', msg)
    } catch {
      setMessage('No se pudo importar correos históricos. Conecta Gmail primero.')
      await alertError('Error', 'No se pudo importar correos históricos.')
    }
  }

  const handleGmailPoll = async () => {
    setMessage(null)
    try {
      const result = await pollGmailNew.mutateAsync(50)
      const msg = `Correos nuevos: ${result.created} creadas, ${result.skipped} omitidas, ${result.invalid} inválidas (${result.total} revisados).`
      setMessage(msg)
      await alertSuccess('Chequeo Gmail completado', msg)
    } catch {
      setMessage('No se pudieron procesar correos nuevos. Conecta Gmail primero.')
      await alertError('Error', 'No se pudieron procesar correos nuevos.')
    }
  }

  if (!canAccess) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">
          <ShieldAlert size={28} />
        </div>
        <p className="text-sm text-muted">No tienes permisos para ver integraciones.</p>
      </div>
    )
  }

  const configuredCount = status ? Object.values(status).filter((item) => item.configured).length : 0
  const totalCount = status ? Object.keys(status).length : 0
  const configPct = totalCount > 0 ? Math.round((configuredCount / totalCount) * 100) : 0

  return (
    <div className="integrations-page module-page">
      <PageHeader
        title="Integraciones"
        description={
          canWrite
            ? 'Activa funciones y ajusta parámetros operativos. Los toggles se guardan al instante; los campos de texto al salir del input.'
            : 'Puedes vincular tu correo Gmail. La configuración avanzada la gestiona un administrador.'
        }
        icon={Plug}
      />

      {canWrite && status && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatSummary label="Configuradas" value={`${configuredCount}/${totalCount}`} tone="success" />
          <StatSummary label="Progreso" value={`${configPct}%`} tone={configPct >= 100 ? 'success' : 'info'} />
          <StatSummary
            label="Gmail"
            value={status.gmail.configured ? 'Conectado' : 'Pendiente'}
            tone={status.gmail.configured ? 'success' : 'warning'}
          />
          <StatSummary
            label="Sheets"
            value={status.google_sheets.configured ? 'Listo' : 'Pendiente'}
            tone={status.google_sheets.configured ? 'success' : 'warning'}
          />
        </section>
      )}

      {canWrite && status && (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">Estado de integraciones</h3>
            <HealthBadge label={`${configuredCount} activas`} tone="info" />
          </div>
          <ProgressBar value={configPct} variant={configPct >= 100 ? 'ok' : 'primary'} showLabel />
          <div className="integration-status-grid">
            <StatusCard {...status.gmail} />
            <StatusCard {...status.google_sheets} />
            <StatusCard {...status.gemini_ocr} />
            <StatusCard {...status.webhook_inbound} />
            <StatusCard {...status.webhook_notification} />
          </div>
        </section>
      )}

      {(canGmail || canWrite) && (
        <IntegrationPanel
          title="Gmail BCP/Yape"
          description="Vincula tu cuenta de Gmail en una ventana emergente para importar correos BCP/Yape."
          icon={Mail}
          badge={
            gmailConnected ? (
              <HealthBadge label="Conectado" tone="success" />
            ) : (
              <HealthBadge label="Pendiente" tone="warning" />
            )
          }
        >
          {canWrite && gmailPollStatus && (
            <div className="integration-status-box">
              <p className="font-medium">Estado realtime efectivo</p>
              <p className="mt-1 text-muted">
                Loop: <strong>{gmailPollStatus.loop_running ? 'Activo' : 'Inactivo'}</strong> · Toggle:
                <strong> {gmailPollStatus.realtime_enabled ? 'On' : 'Off'}</strong> · Intervalo:
                <strong> {gmailPollStatus.interval_seconds}s</strong>
              </p>
              <p className="text-muted">
                Query: <code>{gmailPollStatus.query || '(vacía)'}</code> · Filtro correos nuevos:
                <strong> {gmailPollStatus.mark_unread_only ? 'UNREAD' : 'Todos'}</strong>
              </p>
              <p className="text-muted">
                Último chequeo:{' '}
                <strong>
                  {formatDateTimeWithSeconds(
                    gmailPollStatus.last_checked_at,
                    'aún sin ejecución',
                  )}
                </strong>
              </p>
              {gmailPollStatus.last_result && (
                <p className="text-muted">
                  Último resultado: <code>{JSON.stringify(gmailPollStatus.last_result)}</code>
                </p>
              )}
              {gmailPollStatus.last_error && (
                <p className="alert-error text-sm">Último error polling: {gmailPollStatus.last_error}</p>
              )}
            </div>
          )}

          {canWrite && (
            <>
              <div className="space-y-3">
                {feature('gmail_historical')}
                {feature('gmail_realtime')}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {config('gmail_query')}
                {config('gmail_poll_interval_seconds')}
              </div>
            </>
          )}

          {gmailConnection && !gmailConnection.oauth_app_configured && (
            <p className="alert-error text-sm">
              Falta configurar <strong>GMAIL_CLIENT_ID</strong> y <strong>GMAIL_CLIENT_SECRET</strong> en el backend.
            </p>
          )}

          {gmailConnected && gmailConnection?.connected_email && (
            <p className="text-sm">
              Conectado como: <strong>{gmailConnection.connected_email}</strong>
            </p>
          )}

          <div className="integration-actions">
            {canGmail && (
              !gmailConnected ? (
                <button
                  type="button"
                  onClick={() => {
                    setMessage(null)
                    connectGmail.mutate(undefined, {
                      onError: (error) => {
                        void alertError(
                          'No se pudo abrir Google',
                          getApiErrorMessage(error, 'No se pudo iniciar la vinculación con Gmail.'),
                        )
                      },
                    })
                  }}
                  disabled={connectGmail.isPending || gmailConnection?.oauth_app_configured === false}
                  className="btn-primary"
                >
                  {connectGmail.isPending ? 'Abriendo Google...' : 'Conectar Gmail'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const confirmed = await confirmAction(
                      'Desconectar Gmail',
                      '¿Desconectar la cuenta de Gmail vinculada?',
                      'Desconectar',
                    )
                    if (!confirmed) return
                    setMessage(null)
                    try {
                      await disconnectGmail.mutateAsync()
                      setMessage('Gmail desconectado.')
                      await alertSuccess('Gmail desconectado')
                    } catch {
                      setMessage('No se pudo desconectar Gmail.')
                      await alertError('Error', 'No se pudo desconectar Gmail.')
                    }
                  }}
                  disabled={disconnectGmail.isPending}
                  className="btn-secondary"
                >
                  Desconectar Gmail
                </button>
              )
            )}
            {canGmail && (
              <>
                <button
                  type="button"
                  onClick={handleGmailHistorical}
                  disabled={
                    syncGmailHistorical.isPending ||
                    !gmailConnected ||
                    !isSettingEnabled('gmail_historical')
                  }
                  className="btn-primary"
                >
                  {syncGmailHistorical.isPending ? 'Importando histórico...' : 'Importar correos históricos'}
                </button>
                <button
                  type="button"
                  onClick={handleGmailPoll}
                  disabled={
                    pollGmailNew.isPending ||
                    !gmailConnected ||
                    !isSettingEnabled('gmail_realtime')
                  }
                  className="btn-secondary"
                >
                  {pollGmailNew.isPending ? 'Procesando...' : 'Procesar correos nuevos'}
                </button>
              </>
            )}
          </div>

          {gmailConnection?.redirect_uri && canWrite && (
            <p className="text-xs text-muted">
              Redirect URI en Google Cloud:{' '}
              <code className="font-mono">{gmailConnection.redirect_uri}</code>
            </p>
          )}
        </IntegrationPanel>
      )}

      {canWrite && (
        <>
          <IntegrationPanel
            title="Google Sheets"
            description={
              <>
                Credenciales de cuenta de servicio en <code>.env</code>. ID y rango configurables abajo.
              </>
            }
            icon={FileSpreadsheet}
            badge={
              status?.google_sheets.configured ? (
                <HealthBadge label="Listo" tone="success" />
              ) : (
                <HealthBadge label="Pendiente" tone="warning" />
              )
            }
          >
            {feature('google_sheets')}
            <div className="grid gap-3 md:grid-cols-2">
              {config('google_spreadsheet_id')}
              {config('google_spreadsheet_range')}
            </div>
            <div className="integration-actions">
              <button
                type="button"
                onClick={handleSheetsSync}
                disabled={
                  syncSheets.isPending ||
                  status?.google_sheets.configured === false ||
                  !isSettingEnabled('google_sheets')
                }
                className="btn-secondary"
              >
                {syncSheets.isPending ? 'Sincronizando…' : 'Sincronizar ahora'}
              </button>
            </div>
          </IntegrationPanel>

          <IntegrationPanel
            title="Webhooks"
            description={
              <>
                <code>WEBHOOK_SECRET</code> permanece en <code>.env</code>. La URL de alertas es configurable.
              </>
            }
            icon={Webhook}
          >
            <div className="space-y-3">
              {feature('webhook_inbound')}
              {feature('webhook_notifications')}
            </div>
            {config('webhook_notification_url')}
          </IntegrationPanel>

          <IntegrationPanel
            title="OCR vouchers (Gemini)"
            description={
              <>
                Con Gemini activo se usa la API (clave aquí o <code>GEMINI_API_KEY</code> en <code>.env</code>).
                Si lo desactivas, el escaneo usa OCR local en el navegador (Tesseract).
              </>
            }
            icon={ScanLine}
            badge={
              status?.gemini_ocr.configured ? (
                <HealthBadge label="Configurado" tone="success" />
              ) : (
                <HealthBadge label="Opcional" tone="info" />
              )
            }
          >
            {feature('gemini_ocr')}
            {config('gemini_api_key')}
          </IntegrationPanel>
        </>
      )}

      {message && <p className="alert-info rounded-lg px-4 py-3 text-sm">{message}</p>}
    </div>
  )
}
