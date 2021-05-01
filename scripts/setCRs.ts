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

  const arth = await ethers.getContractAt(
    'ARTHStablecoin',
    deployements.ARTHStablecoin.address
  );

  const ARTHETHOracle = await ethers.getContractAt(
    'UniswapPairOracle_ARTH_WETH',
    deployements.UniswapPairOracle_ARTH_WETH.address
  );

  const GMUOracle = await ethers.getContractAt(
    'GMUOracle',
    deployements.GMUOracle.address
  );


  // await instance.setRedeemCollateralRatio(80 * 10000);
  // await instance.setMintCollateralRatio(90 * 10000);
  console.log((await ARTHETHOracle.consult(deployements.WETH.address, 1e6)).toString())
  console.log((await pool.getCollateralPrice()).toString())
  console.log((await GMUOracle.getPrice()).toString())
  console.log((await GMUOracle.setPrice(1e6)).toString())

  console.log((await instance.getETHGMUPrice()).toString())
  console.log((await instance.getARTHPrice()).toString())

  // 1000000/ 2200000000
  // console.log(await pool.getAvailableExcessCollateralDV())
  // // console.log(await pool.getCollateralGMUBalance())
  // await instance.setGlobalCollateralRatio(0 * 10000);
  // console.log(await pool.getAvailableExcessCollateralDV())
  // // await instance.toggleUseGlobalCRForRecollateralize(false);
  // await instance.toggleUseGlobalCRForRedeem(true);
  // // await instance.toggleUseGlobalCRForMint(false);

  // console.log(await pool.getAvailableExcessCollateralDV())
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
