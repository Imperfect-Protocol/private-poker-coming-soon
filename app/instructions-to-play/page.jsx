import Link from "next/link";
import SiteNav from "../SiteNav";
import DemoDisclaimerFooter from "../DemoDisclaimerFooter";

const ppdcFaucetHref = "https://private-poker-faucet.wasmer.app";
const devnetHref = "https://private-poker-devnet.wasmer.app";

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
    more: (
      <>
        <a className="contact-button-blue"
          href="https://metamask.io/"
          target="_blank"
        >
          Get MetaMask
        </a>
        <p>or another wallet:</p>
      </>
    ),
    links: walletLinks
  },
  {
    title: "Add Arbitrum Sepolia network",
    body:
      (<>
        Add the <b>Arbitrum Sepolia Network to <u>your wallet</u></b>.
      </>),
    why:
      "Why: Private Poker testing runs on Arbitrum Sepolia, so your wallet needs to know that network before it can show balances or connect correctly.",
    more: (
      <>
        <div className="wallet-step__more">
          <p><b>Arbitrum Sepolia</b></p>
          <hr />
          <pre>
            CHAIN_ID = 421614
          </pre>
          <pre>
            RPC_URL = https://sepolia-rollup.arbitrum.io/rpc
          </pre>
        </div>
        <p>or alternative settings:</p>
      </>
    ),
    links: [
      ["Arbitrum Chain Information", "https://docs.arbitrum.io/for-devs/dev-tools-and-resources/chain-info"],
      ["ChainList Arbitrum Sepolia", "https://chainlist.org/chain/421614"]
    ]
  },
  {
    title: "Top up Sepolia ETH from a faucet",
    body:
      "Use a Sepolia ETH faucet to get test ETH. Some faucets fund Ethereum Sepolia, while Arbitrum faucets can fund Arbitrum Sepolia directly.",
    why:
      "Why: test ETH pays the small gas fees needed to move test tokens and interact with the test network. It has no mainnet cash value.",
    more: (
      <>
        <a className="contact-button-blue"
          href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
          target="_blank"
        >
          Google Sepolia Faucet
        </a>
        <p>or another faucet:</p>
      </>
    ),
    links: faucetLinks
  },
  {
    title: "Bridge Sepolia ETH to Arbitrum Sepolia ETH",
    body:
      "Use the Arbitrum Portal bridge to move your Sepolia ETH from Ethereum Sepolia to Arbitrum Sepolia. You can skip this step if you used an Arbitrum Sepolia faucet such as ethfaucet.com.",
    why:
      "Why: if your faucet gave you ETH on Ethereum Sepolia, the bridge moves it to the Arbitrum Sepolia network where Private Poker testing happens.",
    more: (
      <>
        <a className="contact-button-blue"
          href="https://portal.arbitrum.io/bridge?amount=0&sourceChain=sepolia&destinationChain=arbitrum-sepolia&tab=bridge&sanitized=true"
          target="_blank"
        >
          Arbitrum Bridge
        </a>
      </>
    ),
  },
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
          <h1>Instructions how to join Private Poker testing</h1>
          <span>
            <p><b>Private Poker</b> is currently a <b><u>technology demo running on
            the test network</u>&nbsp;<i>(Arbitrum Sepolia)</i></b>.</p>
          </span>
          <span>
            Below are general instructions, which will set you up.
            Once you complete these steps, you will have Arbitrum Sepolia ETH (gas token)
            and PPDC (test token) in your wallet, and you are ready to continue with next steps.
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
                {step.more && (
                  <>
                    <p/>
                    {step.more}
                    <p/>
                  </>
                )}
                {step.links && (
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
                )}
              </div>
            </li>
          ))}
        </ol>

        <section className="wallet-contact">
          <p className="section-label">Devnet</p>
          <h2>Join testing</h2>
          <p>Top-up test token using PPDC Faucet, and then create account on devnet.
          </p>
          <div className="contact-actions">
            <a
              className="contact-button-blue"
              href={ppdcFaucetHref}
              rel="noreferrer"
              target="_blank"
            >
              PPDC Faucet
            </a>
            →
            <a
              className="contact-button"
              href={devnetHref}
              rel="noreferrer"
              target="_blank"
            >
              Create Account
            </a>
          </div>
        </section>
        <DemoDisclaimerFooter />
      </section>
    </main>
  );
}
