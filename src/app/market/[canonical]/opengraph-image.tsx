import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Chaotix Market";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ canonical: string }> };

export default async function OGImage({ params }: Props) {
  const { canonical } = await params;
  const decoded = decodeURIComponent(canonical).replace(/\s+/g, " ");
  const displayName =
    decoded.charAt(0).toUpperCase() + decoded.slice(1).toLowerCase();

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0f",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
        }}
      >
        <div
          style={{
            color: "#00ff9d",
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: 4,
          }}
        >
          CHAOTIX
        </div>
        <div
          style={{
            color: "#e5e7eb",
            fontSize: 56,
            fontWeight: 700,
            marginTop: 24,
            textAlign: "center",
          }}
        >
          {displayName}
        </div>
        <div
          style={{
            color: "#6b7280",
            fontSize: 24,
            marginTop: 16,
          }}
        >
          Trade Nothing. Trade Everything.
        </div>
      </div>
    ),
    { ...size }
  );
}
