import { network, ethers } from 'hardhat';

async function main() {
  console.log('network', network.name);

  console.log('updating oracles using updater');
  const instance = await ethers.getContractAt(
    'OracleUpdater',
    '0x8E98466623E5Af52a7c06045eB1ebE074A2d1eD6'
  );

  await instance.update();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
