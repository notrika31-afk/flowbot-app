import React from "react";
import Link from "next/link";

export default function ErrorPage() {
  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "sans-serif",
      textAlign: "center"
    }}>
      <h1>Error</h1>
      <p>Something went wrong.</p>
      <Link href="/" style={{ marginTop: "20px", color: "blue" }}>
        Go back home
      </Link>
    </div>
  );
}
