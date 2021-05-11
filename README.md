# Arth V2 – Solidity Implementation

<p align="center">

🖥 **Website** – https://arth.finance

📖 **Documentation** – https://docs.arth.finance

📲 **Telegram** – https://t.me/arthfinance
</p>

## What is Arth?
Arth is the first fractional-algorithmic stablecoin protocol. Arth is open-source, permissionless, and entirely on-chain – currently implemented on Ethereum (with possible cross chain implementations in the future). The end goal of the Arth protocol is to provide a highly scalable, decentralized, algorithmic money in place of fixed-supply digital assets like BTC.

<b> Arth is a new paradigm in stablecoin design. It brings together familiar concepts into a never before seen protocol: </b>

  * <b>Fractional-Algorithmic</b> – Arth is the first and only stablecoin with parts of its supply backed by collateral and parts of the supply algorithmic. The ratio of collateralized and algorithmic depends on the market's pricing of the ARTH stablecoin. If ARTH is trading at above $1, the protocol decreases the collateral ratio. If ARTH is trading at under $1, the protocol increases the collateral ratio.

  * <b>Decentralized & Governance-minimized</b> – Community governed and emphasizing a highly autonomous, algorithmic approach with no active management.
Fully on-chain oracles – Arth v1 uses Uniswap (ETH, USDT, USDC time-weighted average prices) and Chainlink (USD price) oracles.

  * <b>Fully on-chain oracles</b> – Arth v1 uses Uniswap (ETH, USDT, USDC time-weighted average prices) and Chainlink (USD price) oracles.

  * <b>Two Tokens</b> – ARTH is the stablecoin targeting a tight band around $1/coin. Arth Shares (ARTHX) is the governance token which accrues fees, seigniorage revenue, and excess collateral value.

  * <b>Swap-based Monetary Policy</b> – Arth uses principles from automated market makers like Uniswap to create swap-based price discovery and real-time stabilization incentives through arbitrage.

## Local Development

We recommend using Truffle to set up a development environment and Ganache to run a chain.
