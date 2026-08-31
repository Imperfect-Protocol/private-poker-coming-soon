import SiteNav from "../SiteNav";
import DemoDisclaimerFooter from "../DemoDisclaimerFooter";

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
          <h2>Contact Our Team</h2>
          <p>
            Send us email to:{" "}
            <a href="mailto:imperfect-protocol@protonmail.com?subject=Private%20Poker%20Membership">
              <strong>imperfect-protocol@protonmail.com</strong>
            </a>
          </p>
          <p>
            or visit our GitHub repository:{" "}
            <a
              href="https://github.com/Imperfect-Protocol"
              rel="noreferrer"
              target="_blank"
            >
              github.com/Imperfect-Protocol
            </a>
          </p>
          <div className="contact-actions contact-actions--lower">
            <a
              className="contact-button"
              href="mailto:imperfect-protocol@protonmail.com?subject=Private%20Poker%20Membership"
            >
              Contact Us
            </a>
          </div>
        </section>
        <DemoDisclaimerFooter />
      </section>
    </main>
  );
}
