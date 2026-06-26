import "./globals.css";

export const metadata = {
  title: "Private Poker by Imperfect Protocol",
  description: "Private Poker by Imperfect Protocol is an early-stage protocol R&D project building private, peer-to-peer poker infrastructure on Arbitrum.",
  authors: [{ name: "Imperfect Protocol" }],
  icons: {
    icon: "/favicon.jpg"
  },
  openGraph: {
    type: "website",
    url: "https://private-poker.wasmer.app/",
    title: "Private Poker by Imperfect Protocol",
    description: "Private Poker by Imperfect Protocol is an early-stage protocol R&D project building private, peer-to-peer poker infrastructure on Arbitrum.",
    images: ["https://private-poker.wasmer.app/preview.png"]
  },
  twitter: {
    card: "summary_large_image",
    title: "Private Poker by Imperfect Protocol",
    description: "Private Poker by Imperfect Protocol is an early-stage protocol R&D project building private, peer-to-peer poker infrastructure on Arbitrum.",
    images: ["https://private-poker.wasmer.app/preview.png"]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
