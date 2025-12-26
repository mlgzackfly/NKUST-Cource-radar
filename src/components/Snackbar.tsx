"use client";

import { useEffect } from "react";

type SnackbarProps = {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
  duration?: number;
};

export function Snackbar({ message, type = "success", onClose, duration = 3000 }: SnackbarProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "var(--ts-positive-500)";
      case "error":
        return "var(--ts-negative-500)";
      case "info":
        return "var(--ts-info-500)";
      default:
        return "var(--ts-gray-800)";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "info":
        return "ⓘ";
      default:
        return "";
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}} />
      <div
        style={{
          position: "fixed",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2000,
          animation: "slideUp 0.3s ease-out"
        }}
      >
        <div
          style={{
            backgroundColor: getBackgroundColor(),
            color: "white",
            padding: "1rem 1.5rem",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            minWidth: "300px",
            maxWidth: "500px"
          }}
        >
          {getIcon() && (
            <span style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
              {getIcon()}
            </span>
          )}
          <span style={{ flex: 1 }}>{message}</span>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "1.25rem",
              padding: "0",
              opacity: 0.8,
              lineHeight: 1
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "0.8"}
          >
            ×
          </button>
        </div>
      </div>
    </>
  );
}
