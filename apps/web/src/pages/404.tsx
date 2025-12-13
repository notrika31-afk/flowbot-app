import React from "react";

export default function NotFoundPage() {
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      height: "100vh", 
      textAlign: "center",
      fontFamily: "sans-serif"
    }}>
      <h1>404 - Page Not Found</h1>
      <p>We apologize for the inconvenience.</p>
    </div>
  );
}
