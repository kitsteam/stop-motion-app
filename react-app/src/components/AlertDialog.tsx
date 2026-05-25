import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import styles from './AlertDialog.module.css'
import type { AlertButton, AlertInput } from '../services/alert-api'

export interface AlertDialogProps {
  header?: string
  message?: string
  buttons: AlertButton[]
  inputs?: AlertInput[]
  backdropDismiss?: boolean
  onResolve(button: AlertButton, inputValues: Record<string, string>): void
}

function initialValues(inputs: AlertInput[]): Record<string, string> {
  const acc: Record<string, string> = {}
  for (const input of inputs) {
    acc[input.name] = input.value ?? ''
  }
  return acc
}

function dismissButton(buttons: AlertButton[]): AlertButton | undefined {
  return buttons.find((b) => b.role === 'cancel') ?? buttons[buttons.length - 1]
}

export default function AlertDialog({
  header,
  message,
  buttons,
  inputs = [],
  backdropDismiss = false,
  onResolve,
}: AlertDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const reactId = useId()
  const headerId = `alert-dialog-header-${reactId}`
  const messageId = `alert-dialog-message-${reactId}`
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(inputs),
  )

  // Latest-callback ref so the cancel listener sees current props.
  const stateRef = useRef({ backdropDismiss, buttons, onResolve, values })
  useEffect(() => {
    stateRef.current = { backdropDismiss, buttons, onResolve, values }
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    // showModal is the supported entry point; fall back to setting `open`
    // for environments where the polyfill is incomplete.
    if (typeof dialog.showModal === 'function') {
      try {
        dialog.showModal()
      } catch {
        dialog.setAttribute('open', '')
      }
    } else {
      dialog.setAttribute('open', '')
    }

    const onCancel = (event: Event) => {
      event.preventDefault()
      const { backdropDismiss: dismissable, buttons: btns, onResolve: resolve, values: vals } =
        stateRef.current
      if (!dismissable) return
      const target = dismissButton(btns)
      if (target) resolve(target, vals)
    }
    dialog.addEventListener('cancel', onCancel)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
    }
  }, [])

  const handleBackdropClick = useCallback(
    (event: ReactMouseEvent<HTMLDialogElement>) => {
      if (!backdropDismiss) return
      if (event.target !== dialogRef.current) return
      const target = dismissButton(buttons)
      if (target) onResolve(target, values)
    },
    [backdropDismiss, buttons, onResolve, values],
  )

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClick={handleBackdropClick}
      aria-labelledby={header ? headerId : undefined}
      aria-describedby={message ? messageId : undefined}
    >
      <div className={styles.body}>
        {header && (
          <h2 id={headerId} className={styles.header}>
            {header}
          </h2>
        )}
        {message && (
          <p id={messageId} className={styles.message}>
            {message}
          </p>
        )}
        {inputs.length > 0 && (
          <div className={styles.inputs}>
            {inputs.map((input) =>
              input.type === 'radio' ? (
                <div key={input.name} role="radiogroup">
                  {input.options.map((option) => (
                    <label key={option.value} className={styles.inputLabel}>
                      <input
                        type="radio"
                        name={input.name}
                        value={option.value}
                        checked={values[input.name] === option.value}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [input.name]: e.target.value,
                          }))
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              ) : (
                <label key={input.name} className={styles.inputLabel}>
                  {input.label && <span>{input.label}</span>}
                  <input
                    type="text"
                    name={input.name}
                    value={values[input.name] ?? ''}
                    placeholder={input.placeholder}
                    className={styles.input}
                    onChange={(event) => {
                      const next = event.target.value
                      setValues((prev) => ({ ...prev, [input.name]: next }))
                    }}
                  />
                </label>
              ),
            )}
          </div>
        )}
        <div className={styles.buttons}>
          {buttons.map((button, idx) => (
            <button
              key={`${button.text}-${idx}`}
              type="button"
              className={
                button.role === 'cancel' ? styles.buttonCancel : styles.button
              }
              onClick={() => onResolve(button, values)}
            >
              {button.text}
            </button>
          ))}
        </div>
      </div>
    </dialog>
  )
}
