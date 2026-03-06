"use client";

import { useEffect } from "react";

export function RefCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref")?.trim().toUpperCase();
    if (ref) sessionStorage.setItem("chaotix_ref", ref);
  }, []);
  return null;
}
