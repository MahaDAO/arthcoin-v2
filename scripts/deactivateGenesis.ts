import { network, ethers } from 'hardhat';
require('dotenv').config();

async function main() {
  // Fetch already deployed contracts.
  const deployements = require(`../output/${network.name}.json`);
  const instance = await ethers.getContractAt(
    'ArthController',
    deployements.ArthController.address
  );

  await instance.deactivateGenesis();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
