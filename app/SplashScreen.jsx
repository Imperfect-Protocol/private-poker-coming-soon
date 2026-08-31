"use client";

import { useEffect, useState } from "react";
import AgeGateDialog from "./AgeGateDialog";
import { PRIVATE_POKER_DEMO_DISCLAIMER } from "./constants";

export default function SplashScreen({ onDone }) {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [fadeLogo, setFadeLogo] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [fadeAgeGate, setFadeAgeGate] = useState(false);
  const [fadeDisclaimer, setFadeDisclaimer] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);

  useEffect(() => {
    const showDisclaimerTimer = window.setTimeout(() => setShowDisclaimer(true), 1400);
    const fadeLogoTimer = window.setTimeout(() => setFadeLogo(true), 5200);
    const showAgeGateTimer = window.setTimeout(() => setShowAgeGate(true), 5900);

    return () => {
      window.clearTimeout(showDisclaimerTimer);
      window.clearTimeout(fadeLogoTimer);
      window.clearTimeout(showAgeGateTimer);
    };
  }, []);

  function handleConfirmAdult() {
    setFadeAgeGate(true);
    setFadeDisclaimer(true);
    window.setTimeout(() => onDone?.(), 950);
  }

  function handleReject() {
    setIsRestricted(true);
  }

  if (isRestricted) {
    return (
      <section className="splash splash--restricted">
        <img className="splash__image" src="/splash.jpg" alt="" />
        <div className="splash__wash" />
        <h1>Access Restricted</h1>
      </section>
    );
  }

  const disclaimerClassName = [
    "splash__disclaimer",
    showDisclaimer ? "splash__disclaimer--show" : "",
    fadeDisclaimer ? "splash__disclaimer--fade" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="splash">
      <img className="splash__image" src="/splash.jpg" alt="" />
      <div className="splash__wash" />
      <div className={`splash__content ${fadeLogo ? "splash__content--fade" : ""}`}>
        <p className="kicker"></p>
        <h1>Private Poker</h1>
        <div className="splash__rule" />
        <p className="splash__status">by Imperfect Protocol</p>
      </div>
      {showAgeGate ? (
        <AgeGateDialog
          isFading={fadeAgeGate}
          onConfirmAdult={handleConfirmAdult}
          onReject={handleReject}
        />
      ) : null}
      <p className={disclaimerClassName}>{PRIVATE_POKER_DEMO_DISCLAIMER}</p>
    </section>
  );
}
