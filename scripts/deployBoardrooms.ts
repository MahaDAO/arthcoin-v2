import { network, ethers } from 'hardhat';

require('dotenv').config();

async function main() {
  const deployments = require(`../output/${network.name}.json`);
  const [deployer] = await ethers.getSigners();

  console.log('deploying TokenStore contract..');

  // const tokenstore = await ethers.getContractFactory('TokenStore');
  // const tokenstoreInstance = await tokenstore.deploy(
  //   deployments.ARTHShares.address
  // );

  // console.log('TokenStore address :-', tokenstoreInstance.address);
  console.log('deploying Boardroom contract..');

  const boardroom = await ethers.getContractFactory('Boardroom');
  const boardroomInstance = await boardroom.deploy(
    deployments.USDC.address,
    deployments.ARTHShares.address
  );

  console.log('Boardroom address :-', boardroomInstance.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
