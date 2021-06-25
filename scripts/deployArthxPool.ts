import { network, ethers } from 'hardhat';

require('dotenv').config();

async function main() {
  const deployements = require(`../output/${network.name}.json`);
  const instance = await ethers.getContractAt(
    'LotteryRaffle',
    deployements.LotteryRaffle.address
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
