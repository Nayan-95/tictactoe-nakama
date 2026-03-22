import { useEffect } from "react";

/**
 * Toast — amber-tinted notification at bottom-center.
 * Props unchanged: message, onDismiss
 */
export default function Toast({ message, onDismiss }) {
  useEffect(function() {
    var timer = setTimeout(onDismiss, 4000);
    return function() { clearTimeout(timer); };
  }, [message, onDismiss]);

  return (
    <div
      id="toast-notification"
      className="toast"
      role="alert"
      onClick={onDismiss}
    >
      <span>{message}</span>
      <button className="toast__close" type="button" aria-label="Dismiss">✕</button>
    </div>
  );
}
