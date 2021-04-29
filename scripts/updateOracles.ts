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
  'UniswapPairOracle_ARTH_WETH'
]

async function main() {
  // Fetch the provider.
  const { provider } = ethers;

  const estimateGasPrice = await provider.getGasPrice();
  const gasPrice = estimateGasPrice.mul(3).div(2);
  console.log(`Gas Price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);

  // Fetch already deployed contracts.
  const deployements = require(`../output/${network.name}.json`);

  for (let i = 0; i < oracles.length; i++) {
    console.log('updating oracle', i)
    const instance = await ethers.getContractAt('UniswapPairOracle', deployements[oracles[i]].address);

    if (await instance.canUpdate()) await instance.update()
  }

  // // Execute them transactions.
  // // NOTE: Operate has to be accounts[0] used while migrations and deploying.
  // for await (const queue of calldatas) {
  //   const tx = await timelock
  //     .connect(operator)
  //     .executeTransaction(...queue.calldata, override);

  //   await wait(ethers, tx.hash, `\ntimelock.queueTransaction => ${queue.desc}`);
  // }
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
