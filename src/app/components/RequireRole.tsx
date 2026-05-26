import { useEffect } from "react";
import { useNavigate } from "react-router";
import { readAuthSession } from "../data/authSession";
import { OWNER_MODE_KEY } from "./BottomNav";
import type { UserRole } from "../data/authSession";

export function RequireRole({
  roles,
  children,
  ownerModeFallback,
}: {
  roles: UserRole[];
  children: React.ReactNode;
  ownerModeFallback?: string;
}) {
  const session = readAuthSession();
  const navigate = useNavigate();
  const ownerMode = localStorage.getItem(OWNER_MODE_KEY) === "true";
  const allowed =
    roles.includes(session.role) ||
    (ownerMode && (session.role === "owner" || session.role === "admin"));

  useEffect(() => {
    if (!allowed) {
      const fallback =
        ownerMode && ownerModeFallback
          ? ownerModeFallback
          : "/";
      navigate(fallback, { replace: true });
    }
  }, [allowed, navigate, ownerMode, ownerModeFallback]);

  if (!allowed) return null;
  return <>{children}</>;
}
