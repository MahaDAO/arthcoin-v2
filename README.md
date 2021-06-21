# Arth V2 – Solidity Implementation

<p align="center">

🖥 **Website** – https://arthcoin.com

📖 **Documentation** – https://docs.arthcoin.com

📲 **Telegram** – https://t.me/mahadao

</p>

## What is Arth?

ARTH is a new type of currency designed to not be pegged to government-owned currencies (like US Dollar, Euro, or Chinese Yuan), but still remain relatively stable (unlike Gold and Bitcoin).

Without being influenced by government-owned currencies, ARTH will be immune to inflation. Through stability, ARTH also becomes a superior choice of currency for means of trade. This is unlike Gold or Bitcoin, which are used more as a store of value rather than a medium of exchange.

## Instructions

```
yarn
yarn compile
# setup ganache and set the private key at METAMASK_WALLET_SECRET=...
npx truffle deploy --network development
yarn generate-deployment development
```

## Bugs/Pointers to take care of

- Decimals used in oracles
- Checks & Effects patterns
- Parameter and precondition checks
- Flashloan vulnerabilities w/ Uniswap oracles (12hr twap)
- Ownership & Permissions of all public methods
- Ownership to Timelock contract to Multisig
- Emergency actions need to be revoked
