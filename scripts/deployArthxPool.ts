import { network, ethers } from 'hardhat';

require('dotenv').config();

async function main() {
  const deployments = require(`../output/${network.name}.json`);
  const [deployer] = await ethers.getSigners();

  const instance = await ethers.getContractFactory(
    "StakeARTHXRMAHA"
  );


  console.log('deploying stakearthxrmaha contract..');

  const stakearthxrmaha =  await instance.deploy(
    deployer.address,
    deployments.MahaToken.address,
    deployments.ARTHShares.address
  )

  console.log('stakearthxrmaha address :-', stakearthxrmaha.address);

  await stakearthxrmaha.initializeDefault()

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
