"use client";

import Link from "next/link";
import { summonPrivatePokerSplash } from "./AppSplashController";

const navItems = [
  ["Our Vision", "/"],
  ["Who are we", "/who-are-we"],
  ["Contact Us", "/contact"],
];

export default function SiteNav() {
  function handleBrandClick(event) {
    event.preventDefault();
    summonPrivatePokerSplash();
  }

  return (
    <nav className="site-nav" aria-label="Private Poker navigation">
      <Link className="site-nav__brand" href="/" onClick={handleBrandClick}>
        <span className="site-nav__wordmark">
          <span className="site-nav__title">Private Poker</span>
          <span className="site-nav__subtitle">Imperfect Protocol</span>
        </span>
      </Link>
      <div className="site-nav__links">
        {navItems.map(([label, href], index) => (
          <span key={href}>
            <Link href={href}>{label}</Link>
            {index < navItems.length - 1 ? <i>|</i> : null}
          </span>
        ))}
      </div>
    </nav>
  );
}
