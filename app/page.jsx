"use client";

import { useEffect, useState } from "react";

const principles = [
  {
    eyebrow: "No house edge",
    title: "The dealer disappears",
    copy:
      "Private Poker is built around peer-to-peer play. Game state moves between players instead of through a central poker server that can see the deck."
  },
  {
    eyebrow: "Mental poker",
    title: "Cards stay private by design",
    copy:
      "The Crumble protocol uses BLS cryptography so players can shuffle, mask, reveal, and verify cards without handing trust to one operator."
  },
  {
    eyebrow: "Chain as referee",
    title: "Settlement, not surveillance",
    copy:
      "The blockchain is planned as the vault and stateless judge. Normal play stays fast and private; final results can be checked for fairness."
  }
];

const storyBlocks = [
  {
    label: "1979 problem",
    title: "Mental Poker, made practical.",
    copy:
      "The original challenge was simple to state and hard to build: can people play a fair card game remotely without trusting a dealer? Private Poker turns that question into a modern product surface."
  },
  {
    label: "Competitive format",
    title: "Structured play over open-ended wagering.",
    copy:
      "The experience is framed around committed tables, fixed rules, and bounded participation, so the focus stays on skill, strategy, and transparent outcomes."
  },
  {
    label: "Zero-trust engine",
    title: "Fairness that does not ask for belief.",
    copy:
      "Cards, actions, and outcomes are designed to be checked through cryptography and settlement logic rather than hidden server authority."
  }
];

const differenceItems = [
  ["Traditional online poker", "A central house shuffles, hosts, tracks balances, and asks players to trust the server."],
  ["Private Poker", "Players coordinate directly, the deck is protected cryptographically, and contracts act as referee and vault."],
  ["Why it matters", "The table becomes inspectable: no hidden dealer, no opaque game logic, and no server with privileged card knowledge."]
];

const roadmapItems = [
  ["First game", "Heads-up and tabled Texas Hold'em before Omaha and draw variants."],
  ["P2P network", "Players exchange signed state directly instead of asking a house server."],
  ["Verifiable hands", "BLS masking makes the deck private while still leaving an audit trail."],
  ["Competition rails", "Lobbies, tables, tournaments, leaderboards, and achievement proofs grow from the same protocol base."]
];

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setFadeSplash(true), 2200);
    const hideTimer = window.setTimeout(() => setShowSplash(false), 2800);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <main className="site-shell">
      {showSplash ? <SplashScreen isFading={fadeSplash} /> : <WelcomeScreen />}
    </main>
  );
}

function SplashScreen({ isFading }) {
  return (
    <section className={`splash ${isFading ? "splash--fade" : ""}`}>
      <img className="splash__image" src="/splash.jpg" alt="" />
      <div className="splash__wash" />
      <div className="splash__content">
        <p className="kicker">Imperfect Protocol presents</p>
        <h1>Private Poker</h1>
        <div className="splash__rule" />
        <p className="splash__status">Dealerless poker is loading</p>
      </div>
    </section>
  );
}

function WelcomeScreen() {
  return (
    <section className="welcome">
      <div className="welcome__hero">
        <img className="welcome__image" src="/table.jpg" alt="" />
        <div className="welcome__shade" />
        <div className="welcome__copy">
          <p className="kicker">Coming soon</p>
          <h1>Welcome to Private Poker!</h1>
          <p className="lead">
            We are building a peer-to-peer poker room where the deck is
            protected by cryptography, not by promises from a central house.
          </p>
        </div>
      </div>

      <div className="content-band">
        <section className="intro">
          <p className="section-label">The idea</p>
          <h2>Poker with privacy as the table stakes.</h2>
          <p>
            Private Poker takes the old mental-poker question seriously: can
            people play a fair hand over a communications channel without a
            trusted third party? The answer here is a frontend-first poker
            experience powered by peer networking, BLS card masking, and
            verifiable settlement.
          </p>
        </section>

        <section className="story-grid" aria-label="Private Poker product story">
          {storyBlocks.map((item) => (
            <article className="story-card" key={item.title}>
              <p>{item.label}</p>
              <h3>{item.title}</h3>
              <span>{item.copy}</span>
            </article>
          ))}
        </section>

        <section className="table-section" aria-label="Mock Private Poker table">
          <div className="section-heading">
            <p className="section-label">Experience Poker like never before</p>
            <h2>Peer To Peer Poker Experience.</h2>
            <span>
              A fully decentralized, serverless table where players coordinate
              directly and the house is replaced by verifiable protocol logic.
            </span>
          </div>
          <PokerTableMockup />
        </section>

        <section className="difference">
          <div>
            <p className="section-label">How it is different</p>
            <h2>The house becomes a protocol.</h2>
          </div>
          <div className="difference__rows">
            {differenceItems.map(([title, copy]) => (
              <article key={title}>
                <strong>{title}</strong>
                <span>{copy}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="principles" aria-label="Private Poker principles">
          {principles.map((item) => (
            <article className="principle" key={item.title}>
              <p>{item.eyebrow}</p>
              <h3>{item.title}</h3>
              <span>{item.copy}</span>
            </article>
          ))}
        </section>

        <section className="roadmap">
          <div>
            <p className="section-label">What we are building</p>
            <h2>A poker room where fairness is something you can verify.</h2>
          </div>
          <div className="roadmap__grid">
            {roadmapItems.map(([title, copy]) => (
              <article className="roadmap__item" key={title}>
                <p>{title}</p>
                <span>{copy}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function PokerTableMockup() {
  return (
    <div className="mock-table">
      <div className="mock-table__title">
        <h3>Blue Lagoon</h3>
        <p>00:05</p>
      </div>

      <div className="mock-table__surface" aria-hidden="true">
        <img className="mock-table__image" src="/table.jpg" alt="" />
        <div className="mock-table__shade" />

        <div className="mock-table__center">
          <div className="mock-pot">
            <span>Current Pot</span>
            <strong><CoinIcon />240</strong>
          </div>
          <div className="community">
            <Card rank="Q" suit="h" size="community" />
            <Card rank="9" suit="s" size="community" />
            <Card rank="4" suit="d" size="community" />
            <Card hidden size="community" />
            <Card hidden size="community" />
          </div>
        </div>

        <Seat
          position="opponent"
          name="Cipher"
          initials="CI"
          stack="1,840"
          state="Connected"
          isTurn={false}
          cards={[null, null]}
        />

        <Seat
          position="hero"
          name="You"
          initials="YO"
          stack="2,160"
          state="Connected"
          isMe
          isTurn
          cards={["Ah", "Ac"]}
        />
      </div>

      <div className="mock-action-bar">
        <div className="mock-slider">
          <div className="mock-slider__labels">
            <span>Raise Amount</span>
            <strong><CoinIcon />120</strong>
          </div>
          <div className="mock-slider__track">
            <span />
          </div>
        </div>
        <div className="mock-actions">
          <button type="button" disabled>Fold</button>
          <button type="button" disabled>Check</button>
          <button type="button" disabled>
            <span>Raise</span>
            <strong><CoinIcon />120</strong>
          </button>
        </div>
      </div>
    </div>
  );
}

function Seat({ position, name, initials, stack, state, isMe = false, isTurn = false, cards }) {
  return (
    <div className={`pp-seat pp-seat--${position} ${isMe ? "pp-seat--me" : ""}`}>
      <div className={`pp-seat__cards ${isMe ? "pp-seat__cards--me" : ""}`}>
        {cards.map((card, index) => (
          card ? (
            <Card
              key={`${card}-${index}`}
              rank={card[0]}
              suit={card[1].toLowerCase()}
              size={isMe ? "lg" : "md"}
            />
          ) : (
            <Card key={`hidden-${index}`} hidden size={isMe ? "lg" : "md"} />
          )
        ))}
      </div>

      <div className="pp-seat__stack">
        <div className={`pp-avatar ${isTurn ? "pp-avatar--turn" : ""}`}>
          <span>{initials}</span>
          {isTurn ? <i /> : null}
        </div>

        <div className="pp-seat__panel">
          <p>{name}</p>
          <div className="pp-seat__chips">
            <CoinIcon />
            <strong>{stack}</strong>
          </div>
          <div className="pp-meter">
            {Array.from({ length: 12 }, (_, index) => (
              <span key={index} className={index < (isMe ? 12 : 10) ? "filled" : ""} />
            ))}
          </div>
          <small>{state}</small>
        </div>
      </div>
    </div>
  );
}

function Card({ rank, suit, hidden = false, size = "sm" }) {
  if (hidden) {
    return (
      <div className={`pp-card pp-card--${size} pp-card--hidden`}>
        <span />
      </div>
    );
  }

  const isRed = suit === "h" || suit === "d";
  const suitSymbol = { s: "♠", h: "♥", d: "♦", c: "♣" }[suit];

  return (
    <div className={`pp-card pp-card--${size}`}>
      <strong className={isRed ? "red" : ""}>{rank === "T" ? "10" : rank}</strong>
      <em className={isRed ? "red" : ""}>{suitSymbol}</em>
    </div>
  );
}

function CoinIcon() {
  return <span className="coin-icon" />;
}
