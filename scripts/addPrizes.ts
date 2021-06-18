import { network, ethers } from 'hardhat';
const prizes = require('./prizes')
require('dotenv').config();

//console.log(prizes);

async function main() {
  // Fetch already deployed contracts.
  const deployements = require(`../output/${network.name}.json`);
  const instance = await ethers.getContractAt(
    'LotteryRaffle',
    deployements.LotteryRaffle.address
  );

  prizes.forEach(async (data:any) => {
    await instance.setPrizes(
      data.name,
      data.description,
      data.criteria,
      data.address,
      data.tokenId,
      data.image
    );
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
