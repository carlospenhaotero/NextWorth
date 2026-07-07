"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          backgroundColor: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              marginTop: "1rem",
              fontSize: "1rem",
              color: "#a3a3a3",
              lineHeight: 1.6,
            }}
          >
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: "2rem",
              padding: "0.9rem 2rem",
              fontSize: "1rem",
              fontWeight: 700,
              color: "#171717",
              backgroundColor: "#fafafa",
              border: "none",
              borderRadius: "0.75rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
