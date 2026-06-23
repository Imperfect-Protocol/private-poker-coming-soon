import Link from "next/link";
import JoinForm from "./JoinForm";

export const metadata = {
  title: "Join the Game | Private Poker",
  description: "Join the Private Poker early access table."
};

export default function JoinPage() {
  return (
    <main className="join-page">
      <section className="join-hero" aria-labelledby="join-title">
        <img className="join-hero__image" src="/table.jpg" alt="" />
        <div className="join-hero__shade" />

        <div className="join-hero__content">
          <Link className="join-back" href="/">
            Private Poker
          </Link>

          <div className="join-card">
            <div className="join-card__header">
              <p className="section-label">Private Poker Membership</p>
              <h1 id="join-title">Join the game</h1>
              <span>
                Request your invite to join our private club. It’s free to apply
                and simply lets us know you’re interested. No buy in required.
              </span>
            </div>

            <JoinForm />
          </div>
        </div>
      </section>
    </main>
  );
}
