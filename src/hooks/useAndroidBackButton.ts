import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";

export function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const listenerPromise = CapacitorApp.addListener("backButton", () => {
      if (location.pathname === "/" || location.pathname === "/home") {
        CapacitorApp.exitApp();
      } else {
        navigate(-1);
      }
    });

    return () => {
      listenerPromise.then((listener) => listener.remove());
    };
  }, [navigate, location]);
}
