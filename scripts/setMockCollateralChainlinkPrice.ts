import { BigNumber } from 'bignumber.js';
import { network, ethers } from 'hardhat';


require('dotenv').config();


const oracles = [
  'MockChainlinkAggregatorV3',  // ETH/USD
  'MockUSDCChainlinkAggregator',  // USDC/USD
  'MockUSDTChainlinkAggregator'  // USDT/USD
];


const newPrices = [
  2200e8,  // ETH/USD = 1
  1e8,  // USDC/USD = 1
  1e8,  // USDT/USD = 1
]


async function main() {
  console.log('Current network: ', network.name);

  // Fetch already deployed contracts.
  const deployements = require(`../output/${network.name}.json`);

  for (let i = 0; i < oracles.length; i++) {
    console.log('Updating oracle: ', i, deployements[oracles[i]].address);
    const instance = await ethers.getContractAt(
      'MockChainlinkAggregatorV3',
      deployements[oracles[i]].address
    );

    await instance.setLatestPrice(newPrices[i]);
  }
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
