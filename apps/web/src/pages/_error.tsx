import React from "react";

export default function ErrorPage() {
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
      <h1>Error Occurred</h1>
      <p>We apologize for the inconvenience.</p>
    </div>
  );
}
