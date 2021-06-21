import { ethers } from 'hardhat';

async function main() {
  // We get the contract to deploy
  const MultiSender = await ethers.getContractFactory('MultiSender');
  const res = await MultiSender.deploy();

  console.log('MultiSender deployed to:', res.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
