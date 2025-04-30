
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {props.title && <ToastTitle>{props.title}</ToastTitle>}
              {props.description && (
                <ToastDescription>{props.description}</ToastDescription>
              )}
            </div>
            {props.action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
