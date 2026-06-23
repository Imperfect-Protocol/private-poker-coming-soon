import "./globals.css";

export const metadata = {
  title: "Join Private Poker",
  description: "A peer-to-peer poker game with settlement on blockchain",
  authors: [{ name: "Imperfect Protocol" }],
  icons: {
    icon: "/favicon.jpg"
  },
  openGraph: {
    type: "website",
    url: "https://private-poker.wasmer.app/",
    title: "Join Private Poker",
    description: "A peer-to-peer poker game with settlement on blockchain",
    images: ["https://private-poker.wasmer.app/preview.jpg"]
  },
  twitter: {
    card: "summary_large_image",
    title: "Join Private Poker",
    description: "A peer-to-peer poker game with settlement on blockchain",
    images: ["https://private-poker.wasmer.app/preview.jpg"]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
