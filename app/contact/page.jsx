import SiteNav from "../SiteNav";

export const metadata = {
  title: "Contact Us | Private Poker",
  description: "Contact Imperfect Protocol about Private Poker membership."
};

export default function ContactPage() {
  return (
    <main className="contact-page">
      <img className="contact-page__image" src="/table.jpg" alt="" />
      <div className="contact-page__shade" />
      <SiteNav />

      <section className="contact-page__shell">
        <section className="contact-band" id="contact">
          <p className="section-label">Contact</p>
          <h2>Contact Private Poker Team</h2>
          <p>
            Send us email to:{" "}
            <a href="mailto:imperfect-protocol@protonmail.com?subject=Private%20Poker%20Membership">
              imperfect-protocol@protonmail.com
            </a>
          </p>
          <div className="contact-actions">
            <a
              className="contact-button"
              href="mailto:imperfect-protocol@protonmail.com?subject=Private%20Poker%20Membership"
            >
              Contact Us
            </a>
            <a className="contact-learn-link" href="/test-wallet">
              Learn more about setting up test wallet
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
