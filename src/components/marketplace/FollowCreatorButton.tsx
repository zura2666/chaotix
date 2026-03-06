"use client";

import { useState } from "react";
import Link from "next/link";
import { ChaotixButton } from "@/components/ui/ChaotixButton";
import { UserPlus } from "lucide-react";

export function FollowCreatorButton({
  creatorId,
  creatorUsername,
  creatorName,
  className = "",
}: {
  creatorId: string;
  creatorUsername: string | null;
  creatorName?: string | null;
  className?: string;
}) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const csrfMatch = typeof document !== "undefined" ? document.cookie.match(/csrf_token=([^;]+)/) : null;
      if (csrfMatch?.[1]) headers["x-csrf-token"] = decodeURIComponent(csrfMatch[1]);
      const res = await fetch("/api/follow", {
        method: "POST",
        headers,
        body: JSON.stringify({ followingId: creatorId }),
      });
      if (res.ok) setFollowing(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Link
        href={creatorUsername ? `/u/${creatorUsername}` : "#"}
        className="font-medium text-slate-200 hover:text-emerald-400"
      >
        {creatorName || creatorUsername || "Creator"}
      </Link>
      <ChaotixButton
        variant="ghost"
        size="sm"
        onClick={handleFollow}
        disabled={following || loading}
        className="text-xs"
      >
        <UserPlus className="h-3.5 w-3.5" />
        {following ? "Following" : "Follow"}
      </ChaotixButton>
    </span>
  );
}
