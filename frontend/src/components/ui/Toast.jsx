import { useEffect } from "react";

/**
 * Toast — transient notification at bottom-center of screen.
 * Props:
 *   message   {string}
 *   onDismiss {function}
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
