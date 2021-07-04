import { network, ethers } from 'hardhat';

const oracles = [
  'UniswapPairOracle_ARTH_ARTHX',
  'UniswapPairOracle_ARTH_MAHA',
  'UniswapPairOracle_ARTH_USDC',
];

async function main() {
  console.log('network', network.name);

  // Fetch already deployed contracts.
  const deployements = require(`../output/${network.name}.json`);

  const addresses = oracles.map((p) => deployements[p].address);

  console.log(addresses);
  const OracleUpdater = await ethers.getContractFactory('OracleUpdater');
  const res = await OracleUpdater.deploy(addresses);

  console.log(res.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
