import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAlert } from '../hooks/useAlert'
import { useServiceWorker } from '../hooks/useServiceWorker'

export default function ServiceWorkerUpdater(): null {
  const { needRefresh, updateServiceWorker } = useServiceWorker()
  const { show } = useAlert()
  const { t } = useTranslation()

  useEffect(() => {
    if (!needRefresh) return
    void show({
      header: t('alert_sw_update_title'),
      message: t('alert_sw_update_message'),
      backdropDismiss: false,
      buttons: [
        {
          text: t('buttons_reload'),
          handler: () => {
            void updateServiceWorker(true)
          },
        },
      ],
    })
  }, [needRefresh, show, t, updateServiceWorker])

  return null
}
