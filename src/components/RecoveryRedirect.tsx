import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Password-reset links can land on ANY route (the email provider / auth
 * redirect allowlist may drop the path and send the user to "/"). This
 * listens for recovery tokens in the URL and forwards the user to the
 * /reset-password form, preserving the tokens.
 */
export const RecoveryRedirect = () => {
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/reset-password") return;

    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const search = new URLSearchParams(window.location.search);

    const isRecovery =
      hashParams.get("type") === "recovery" || search.get("type") === "recovery";

    if (!isRecovery) return;

    nav(
      {
        pathname: "/reset-password",
        search: window.location.search,
        hash: window.location.hash,
      },
      { replace: true }
    );
  }, [location.pathname, nav]);

  return null;
};
