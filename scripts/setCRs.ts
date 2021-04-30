import { network, ethers } from 'hardhat';

require('dotenv').config();

async function main() {
  console.log('network', network.name);

  // Fetch already deployed contracts.
  const deployements = require(`../output/${network.name}.json`);
  const instance = await ethers.getContractAt(
    'ArthController',
    deployements.ArthController.address
  );

  const pool = await ethers.getContractAt(
    'Pool_USDT',
    deployements.Pool_USDT.address
  );


  // await instance.setRedeemCollateralRatio(80 * 10000);
  // await instance.setMintCollateralRatio(90 * 10000);
  await instance.setGlobalCollateralRatio(90 * 10000);
  // await instance.toggleUseGlobalCRForRecollateralize(false);
  await instance.toggleUseGlobalCRForRedeem(true);
  // await instance.toggleUseGlobalCRForMint(false);

  console.log(await pool.getAvailableExcessCollateralDV())
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
