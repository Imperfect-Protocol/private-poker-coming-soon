import "./globals.css";

export const metadata = {
  title: "Private Poker | Coming Soon",
  description:
    "A mock coming-soon frontend for Private Poker by Imperfect Protocol."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
