import { network, ethers } from 'hardhat';
require('dotenv').config();

const helpers = require('../migrations/helpers');

async function main() {
  // We get the contract to deploy
  const ethGenesisDai = await ethers.getContractFactory("ETHGenesisDAI");
  // const greeter = await Greeter.deploy("Hello, Hardhat!");

  console.log("Greeter deployed to:");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
