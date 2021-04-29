import { network, ethers } from 'hardhat';

require('dotenv').config();

const oracles = [
  'UniswapPairOracle_ARTH_USDC',
  'UniswapPairOracle_ARTH_USDT',
  'UniswapPairOracle_USDC_WETH',
  'UniswapPairOracle_USDT_WETH',
  'UniswapPairOracle_ARTH_ARTHX',
  'UniswapPairOracle_ARTHX_WETH',
  'UniswapPairOracle_ARTHX_USDC',
  'UniswapPairOracle_ARTHX_USDT',
  'UniswapPairOracle_ARTH_WETH',
];

async function main() {
  console.log('network', network.name);

  // Fetch already deployed contracts.
  const deployements = require(`../output/${network.name}.json`);

  for (let i = 0; i < oracles.length; i++) {
    console.log('updating oracle', i, deployements[oracles[i]].address);
    const instance = await ethers.getContractAt(
      'UniswapPairOracle',
      deployements[oracles[i]].address
    );

    if (await instance.canUpdate()) await instance.update();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
