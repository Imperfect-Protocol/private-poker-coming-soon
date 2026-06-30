import SiteNav from "../SiteNav";

const contactEmail = "imperfect-protocol@protonmail.com";
const mailtoHref = `mailto:${contactEmail}?subject=Private%20Poker%20Membership`;

const walletLinks = [
  ["MetaMask", "https://metamask.io/"],
  ["Rabby", "https://rabby.io/"],
  ["Coinbase Wallet", "https://www.coinbase.com/wallet"],
  ["Rainbow", "https://rainbow.me/"]
];

const faucetLinks = [
  ["Alchemy Sepolia Faucet", "https://www.alchemy.com/faucets/ethereum-sepolia"],
  ["Chainlink Faucets", "https://faucets.chain.link/sepolia"],
  ["Google Cloud Web3 Sepolia Faucet", "https://cloud.google.com/application/web3/faucet/ethereum/sepolia"],
  ["Arbitrum Sepolia Faucet", "https://ethfaucet.com/networks/arbitrum"],
  ["Arbitrum Faucet List", "https://docs.arbitrum.io/for-devs/dev-tools-and-resources/chain-info#faucet-list"]
];

const setupSteps = [
  {
    title: "Install a wallet",
    body:
      "Install an Ethereum-compatible wallet. MetaMask is the most common starting point, but Rabby, Coinbase Wallet, and Rainbow are also good options.",
    why:
      "Why: the wallet is your test identity. It holds your test ETH, receives PPDC, and signs actions when you try the Private Poker flow.",
    links: walletLinks
  },
  {
    title: "Add Arbitrum Sepolia network",
    body:
      "Add the Arbitrum Sepolia test network to your wallet. You can use the official Arbitrum chain information or add chain 421614 through ChainList.",
    why:
      "Why: Private Poker testing runs on Arbitrum Sepolia, so your wallet needs to know that network before it can show balances or connect correctly.",
    links: [
      ["Arbitrum chain information", "https://docs.arbitrum.io/for-devs/dev-tools-and-resources/chain-info"],
      ["ChainList Arbitrum Sepolia", "https://chainlist.org/chain/421614"]
    ]
  },
  {
    title: "Top up Sepolia ETH from a faucet",
    body:
      "Use a Sepolia ETH faucet to get test ETH. Some faucets fund Ethereum Sepolia, while Arbitrum faucets can fund Arbitrum Sepolia directly.",
    why:
      "Why: test ETH pays the small gas fees needed to move test tokens and interact with the test network. It has no mainnet cash value.",
    links: faucetLinks
  },
  {
    title: "Bridge Sepolia ETH to Arbitrum Sepolia ETH",
    body:
      "Use the Arbitrum Portal bridge to move your Sepolia ETH from Ethereum Sepolia to Arbitrum Sepolia. You can skip this step if you used an Arbitrum Sepolia faucet such as ethfaucet.com.",
    why:
      "Why: if your faucet gave you ETH on Ethereum Sepolia, the bridge moves it to the Arbitrum Sepolia network where Private Poker testing happens.",
    links: [
      ["Open Arbitrum Portal bridge", "https://portal.arbitrum.io/bridge?amount=0&sourceChain=sepolia&destinationChain=arbitrum-sepolia&tab=bridge&sanitized=true"],
      ["Arbitrum Sepolia Faucet", "https://ethfaucet.com/networks/arbitrum"]
    ]
  },
  {
    title: "Ask us to fund your wallet test PPDC",
    body:
      "Send us an email with your wallet address and we will fund your wallet with test PPDC tokens.",
    why:
      "Why: PPDC is the test chip token for the Private Poker test environment, so we need to send it to the wallet you will use.",
    links: [[contactEmail, mailtoHref]]
  },
  {
    title: "Wait for further instructions",
    body:
      "We will reply with the next steps for joining the Private Poker test flow.",
    why:
      "Why: the test flow is invite-guided for now, so we can make sure your wallet is funded and you have the right table instructions.",
    links: []
  }
];

export const metadata = {
  title: "Set Up Test Wallet | Private Poker",
  description: "Set up a wallet for Private Poker testing on Arbitrum Sepolia."
};

export default function TestWalletPage() {
  return (
    <main className="test-wallet-page">
      <img className="test-wallet-page__image" src="/table.jpg" alt="" />
      <div className="test-wallet-page__shade" />
      <SiteNav />

      <section className="test-wallet-shell">
        <div className="test-wallet-header">
          <p className="section-label">Test wallet setup</p>
          <h1>Get ready for Private Poker testing.</h1>
          <span>
            These steps prepare a wallet for Arbitrum Sepolia, bridge test ETH,
            and request PPDC test tokens from us.
          </span>
        </div>

        <ol className="wallet-steps">
          {setupSteps.map((step, index) => (
            <li className="wallet-step" key={step.title}>
              <strong>{String(index + 1).padStart(2, "0")}</strong>
              <div>
                <h2>{step.title}</h2>
                <p>{step.body}</p>
                <p className="wallet-step__why">{step.why}</p>
                {step.links.length > 0 ? (
                  <div className="wallet-step__links">
                    {step.links.map(([label, href]) => (
                      <a
                        href={href}
                        key={href}
                        rel={href.startsWith("mailto:") ? undefined : "noreferrer"}
                        target={href.startsWith("mailto:") ? undefined : "_blank"}
                      >
                        {label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        <section className="wallet-contact">
          <p className="section-label">Contact</p>
          <h2>Need Test PPDC?</h2>
          <p>
            Send us email to:{" "}
            <a href="mailto:imperfect-protocol@protonmail.com?subject=Private%20Poker%20Membership">
              imperfect-protocol@protonmail.com
            </a>
          </p>
          <div className="contact-actions">
            <a
              className="contact-button"
              href="/contact"
            >
              Contact Us
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
