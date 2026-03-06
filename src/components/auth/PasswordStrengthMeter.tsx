"use client";

const MIN_LENGTH = 8;

function strength(pwd: string): 0 | 1 | 2 | 3 | 4 {
  if (!pwd.length) return 0;
  let score = 0;
  if (pwd.length >= MIN_LENGTH) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}

const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-emerald-500"];

export function PasswordStrengthMeter({ password }: { password: string }) {
  const level = strength(password);
  return (
    <div className="mt-1.5 space-y-1" role="progressbar" aria-valuenow={level} aria-valuemin={0} aria-valuemax={4} aria-label="Password strength">
      <div className="flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= level ? colors[level] : "bg-white/10"}`}
          />
        ))}
      </div>
      {password.length > 0 && (
        <p className="text-xs text-slate-500">{labels[level]}</p>
      )}
    </div>
  );
}
