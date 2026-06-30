"use client";

import Link from "next/link";

const navItems = [
  ["Who are we", "/who-are-we"],
  ["Get Started", "/test-wallet"],
  ["Contact Us", "/contact"],
  ["The Grid", "/the-grid"],
];

export default function SiteNav() {
  return (
    <nav className="site-nav" aria-label="Private Poker navigation">
      <Link className="site-nav__brand" href="/">
        Private Poker by Imperfect Protocol
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
