"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import SplashScreen from "./SplashScreen";

const SPLASH_EVENT_NAME = "private-poker:show-splash";

export function summonPrivatePokerSplash() {
  window.dispatchEvent(new CustomEvent(SPLASH_EVENT_NAME, {
    detail: { navigateHome: true }
  }));
}

export default function AppSplashController() {
  const pathname = usePathname();
  const router = useRouter();
  const hasHandledInitialHome = useRef(false);
  const [splashRunId, setSplashRunId] = useState(0);
  const [showSplash, setShowSplash] = useState(false);

  const startSplash = useCallback(() => {
    setSplashRunId((currentRunId) => currentRunId + 1);
    setShowSplash(true);
  }, []);

  useEffect(() => {
    if (pathname !== "/" || hasHandledInitialHome.current) {
      return;
    }

    hasHandledInitialHome.current = true;
    startSplash();
  }, [pathname, startSplash]);

  useEffect(() => {
    function handleSplashEvent(event) {
      startSplash();

      if (event.detail?.navigateHome && pathname !== "/") {
        hasHandledInitialHome.current = true;
        router.push("/");
      }
    }

    window.addEventListener(SPLASH_EVENT_NAME, handleSplashEvent);

    return () => {
      window.removeEventListener(SPLASH_EVENT_NAME, handleSplashEvent);
    };
  }, [pathname, router, startSplash]);

  const handleSplashDone = useCallback(() => {
    setShowSplash(false);
  }, []);

  return showSplash ? (
    <SplashScreen key={splashRunId} onDone={handleSplashDone} />
  ) : null;
}
