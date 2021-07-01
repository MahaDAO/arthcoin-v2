import { network, ethers } from 'hardhat';

require('dotenv').config();

async function main() {
  const deployments = require(`../output/${network.name}.json`);
  const [deployer] = await ethers.getSigners();

  const StakeARTHXRMAHA = await ethers.getContractFactory("StakeARTHXRMAHA");

  console.log('Deploying Genesis Staking Contract..');
  const instance = await StakeARTHXRMAHA.deploy(
    deployer.address,
    deployments.MahaToken.address,
    deployments.ARTHShares.address
  );

  // TODO: transfer rewards tokens before initializing.

  console.log('Initializing staking');
  await instance.initializeDefault();

  console.log('Contract deployed at address :-', instance.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
