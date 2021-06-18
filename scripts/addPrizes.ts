import { network, ethers } from 'hardhat';

require('dotenv').config();
const prizes = require('./prizes');

async function main() {
  const deployements = require(`../output/${network.name}.json`);
  const instance = await ethers.getContractAt(
    'LotteryRaffle',
    deployements.LotteryRaffle.address
  );

  for (let i = 0; i < prizes.length; i++) {
    console.log('Setting prize ', i);
    const data = prizes[i];

    await instance.setPrizes(
      data.name,
      data.description,
      data.criteria,
      data.address,
      data.tokenId,
      data.image
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
