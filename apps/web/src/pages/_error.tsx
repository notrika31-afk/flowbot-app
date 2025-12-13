import React from "react";

export default function ErrorPage() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      textAlign: "center",
      fontFamily: "sans-serif",
      padding: "20px"
    }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Error</h1>
      <p>Something went wrong or the page was not found.</p>
    </div>
  );
}
