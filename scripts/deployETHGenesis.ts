import { network, ethers } from 'hardhat';
require('dotenv').config();

const helpers = require('../migrations/helpers');
const knownContracts = require('../migrations/known-contracts');

async function main() {
  console.log(network.name);

  const [deployer] = await ethers.getSigners();

  // Deploying the curve
  const curveContract = await ethers.getContractFactory("RecollateralDiscountCurve");
  const curve = await curveContract.deploy()

  // Testing with DaiETHGenesis
  const ethGenesisDaiContract = await ethers.getContractFactory("ETHGenesisDAI");
  const daiAddress = knownContracts.DAI && knownContracts.DAI[network.name];
  console.log('daiAddress', daiAddress);

  const gmuOracle = await ethers.getContractFactory("GMUOracle");
  const daiGmuOracle = await gmuOracle.deploy('DaiGmuOracle', 1e6);
  console.log('daiGmuOracle', daiGmuOracle.address);

  const ethGenesisDai = await ethGenesisDaiContract.deploy(daiAddress, deployer.address, deployer.address, daiGmuOracle.address);
  console.log("ethGenesisDai", ethGenesisDai.address);

  /*
    set arthSupply, arthxPrice, recollateralizeDiscountCruve, setGlobalCollateralRatio,
    setGlobalCollateralValue in ethGenesisDai
  */
  await ethGenesisDai.setArthSupply(21e10); // Need to fetch arthsupply from matic network
  await ethGenesisDai.setArthxPrice(1e6); // Need to fetch arthxprice from matic network
  await ethGenesisDai.setRecollateralizationCurve(curve.address);
  await ethGenesisDai.setGlobalCollateralRatio(11e5);
  await ethGenesisDai.setGlobalCollateralValue(0);
  // setCollateralRaisedOnMatic - Thinking about it to set 0

  // const checkArthSupply = await ethGenesisDai.getArthSupply()
  // console.log(checkArthSupply.toString());

  // Testing with USDCETHGenesis
  const ethGenesisUSDCContract = await ethers.getContractFactory("ETHGenesisUSDC");
  const usdcAddress = knownContracts.USDC && knownContracts.USDC[network.name];
  console.log('usdcAddress', usdcAddress);

  const gmuOracleUSDC = await ethers.getContractFactory("GMUOracle");
  const usdcGmuOracle = await gmuOracle.deploy('USDCGmuOracle', 1e6);
  console.log('usdcGmuOracle', usdcGmuOracle.address);

  const ethGenesisUSDC = await ethGenesisUSDCContract.deploy(daiAddress, deployer.address, deployer.address, usdcGmuOracle.address);
  console.log("ethGenesisUSDC", ethGenesisUSDC.address);

  /*
    set arthSupply, arthxPrice, recollateralizeDiscountCruve, setGlobalCollateralRatio,
    setGlobalCollateralValue in ethGenesisDai
  */
  await ethGenesisDai.setArthSupply(21e10); // Need to fetch arthsupply from matic network
  await ethGenesisDai.setArthxPrice(1e6); // Need to fetch arthxprice from matic network
  await ethGenesisDai.setRecollateralizationCurve(curve.address);
  await ethGenesisDai.setGlobalCollateralRatio(11e5);
  await ethGenesisDai.setGlobalCollateralValue(0);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
