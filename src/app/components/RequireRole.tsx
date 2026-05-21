import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../data/authSession";

export function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const allowed = roles.includes(session.role);

  useEffect(() => {
    if (!allowed) navigate("/", { replace: true });
  }, [allowed, navigate]);

  if (!allowed) return null;
  return <>{children}</>;
}
