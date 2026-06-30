import SiteNav from "../SiteNav";
import GridClient from "./GridClient";

export const metadata = {
  title: "The Grid | Private Poker",
  description: "Private Poker mesh activity over the last 48 hours."
};

export default function TheGridPage() {
  return (
    <main className="grid-page">
      <div className="grid-page__matrix" />
      <SiteNav />
      <section className="grid-shell">
        <GridClient />
      </section>
    </main>
  );
}
