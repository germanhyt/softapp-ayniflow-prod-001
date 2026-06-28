import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'

import { ToggleSwitch } from '../../../core/components/ToggleSwitch'
import { alertError, alertSuccess, confirmAction } from '../../../core/utils/alerts'
import { getApiErrorMessage } from '../../../core/utils/apiError'
import { formatDateTimeWithSeconds } from '../../../core/utils/datetime'
import { hasPermission, useCurrentUser } from '../../auth/application/hooks/useAuth'
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
    <article className={`integration-status-card${configured ? ' configured' : ''}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className={`integration-dot ${configured ? 'on' : 'off'}`} />
        <h4 className="font-medium">{label}</h4>
        <span className="ml-auto text-xs text-muted">{configured ? 'Configurado' : 'Pendiente'}</span>
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
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-3"
      style={{ borderColor: 'var(--premium-border)' }}
    >
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
  const canWrite = hasPermission(user, 'finance:write')
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

  const saveIntegrationToggle = (item: IntegrationSettingItem, enabled: boolean) => {
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
    if (!item) return null
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
    if (!item) return null
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

    void refetchStatus()
    void refetchGmail()
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams, refetchGmail, refetchStatus])

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

  if (!canWrite) {
    return <p className="text-sm text-muted">No tienes permisos para gestionar integraciones.</p>
  }

  return (
    <div className="integrations-page space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Integraciones</h2>
        <p className="text-sm text-muted">
          Activa funciones y ajusta parámetros operativos. Los toggles se guardan al instante; los campos de
          texto al salir del input. Los secretos de infraestructura (OAuth, cuentas de
          servicio, webhook secret) siguen en <code>.env</code>; aquí defines toggles y valores editables.
        </p>
      </div>

      {status && (
        <section className="card space-y-3">
          <h3 className="font-medium">Estado de integraciones</h3>
          <div className="integration-status-grid">
            <StatusCard {...status.gmail} />
            <StatusCard {...status.google_sheets} />
            <StatusCard {...status.gemini_ocr} />
            <StatusCard {...status.webhook_inbound} />
            <StatusCard {...status.webhook_notification} />
          </div>
        </section>
      )}

      <section className="card space-y-4">
        <h3 className="font-medium">Gmail BCP/Yape</h3>
        <p className="text-sm text-muted">
          OAuth web e importación de correos. El polling en background respeta los toggles y el intervalo configurado.
        </p>

        {gmailPollStatus && (
          <div className="rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--premium-border)' }}>
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

        <div className="space-y-3">
          {feature('gmail_historical')}
          {feature('gmail_realtime')}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {config('gmail_query')}
          {config('gmail_poll_interval_seconds')}
        </div>

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

        <div className="flex flex-wrap gap-2">
          {!gmailConnected ? (
            <button
              type="button"
              onClick={() => {
                setMessage(null)
                connectGmail.mutate()
              }}
              disabled={connectGmail.isPending || gmailConnection?.oauth_app_configured === false}
              className="btn-primary"
            >
              {connectGmail.isPending ? 'Redirigiendo...' : 'Conectar Gmail'}
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
          )}
          <button
            type="button"
            onClick={handleGmailHistorical}
            disabled={syncGmailHistorical.isPending || !gmailConnected || !isSettingEnabled('gmail_historical')}
            className="btn-primary"
          >
            {syncGmailHistorical.isPending ? 'Importando histórico...' : 'Importar correos históricos'}
          </button>
          <button
            type="button"
            onClick={handleGmailPoll}
            disabled={pollGmailNew.isPending || !gmailConnected || !isSettingEnabled('gmail_realtime')}
            className="btn-secondary"
          >
            {pollGmailNew.isPending ? 'Procesando...' : 'Procesar correos nuevos'}
          </button>
        </div>

        {gmailConnection?.redirect_uri && (
          <p className="text-xs text-muted">
            Redirect URI en Google Cloud:{' '}
            <code className="font-mono">{gmailConnection.redirect_uri}</code>
          </p>
        )}
      </section>

      <section className="card space-y-4">
        <h3 className="font-medium">Google Sheets</h3>
        <p className="text-sm text-muted">
          Credenciales de cuenta de servicio en <code>.env</code>. ID y rango configurables abajo.
        </p>
        {feature('google_sheets')}
        <div className="grid gap-3 md:grid-cols-2">
          {config('google_spreadsheet_id')}
          {config('google_spreadsheet_range')}
        </div>
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
          {syncSheets.isPending ? 'Sincronizando...' : 'Sincronizar ahora'}
        </button>
      </section>

      <section className="card space-y-4">
        <h3 className="font-medium">Webhooks</h3>
        <p className="text-sm text-muted">
          <code>WEBHOOK_SECRET</code> permanece en <code>.env</code>. La URL de alertas es configurable.
        </p>
        <div className="space-y-3">
          {feature('webhook_inbound')}
          {feature('webhook_notifications')}
        </div>
        {config('webhook_notification_url')}
      </section>

      <section className="card space-y-4">
        <h3 className="font-medium">OCR vouchers (Gemini)</h3>
        <p className="text-sm text-muted">
          Con Gemini activo se usa la API (clave aquí o <code>GEMINI_API_KEY</code> en <code>.env</code>).
          Si lo desactivas, el escaneo usa OCR local en el navegador (Tesseract), sin llamadas al servidor.
        </p>
        {feature('gemini_ocr')}
        {config('gemini_api_key')}
      </section>

      {message && <p className="alert-info">{message}</p>}
    </div>
  )
}
