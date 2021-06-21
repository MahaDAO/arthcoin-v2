const ARTHPool = artifacts.require("ArthPool");
const ARTHStablecoin = artifacts.require("Arth/ARTHStablecoin");
const Pool_USDC = artifacts.require("Pool_USDC");
const Pool_USDT = artifacts.require("Pool_USDT");
const Pool_WBTC = artifacts.require("Pool_WBTC");
const Pool_WETH = artifacts.require("Pool_WETH");
const Pool_WMATIC = artifacts.require("Pool_WMATIC");
const ArthController = artifacts.require("ArthController");
const ARTHShares = artifacts.require("ARTHShares");
// const ETHGenesisUSDC = artifacts.require("ETHGenesisUSDC");
// const ETHGenesisUSDT = artifacts.require("ETHGenesisUSDT");
// const ETHGenesisWBTC = artifacts.require("ETHGenesisWBTC");
// const ETHGenesisWETH = artifacts.require("ETHGenesisWETH");
const GenesisUSDC = artifacts.require("GenesisUSDC");
const GenesisUSDT = artifacts.require("GenesisUSDT");
const GenesisWBTC = artifacts.require("GenesisWBTC");
const GenesisWETH = artifacts.require("GenesisWETH");
const LotteryRaffle = artifacts.require("LotteryRaffle");

module.exports = async function (deployer, network) {
  const multiSigWallet = '0x775C72FB1C28c46F5E9976FFa08F348298fBCEC0'

  // const poolDai = await Pool_DAI.deployed();
  // await poolDai.setOwner(multiSigWallet);

  const poolUsdc = await Pool_USDC.deployed();
  await poolUsdc.setOwner(multiSigWallet);

  const poolUsdt = await Pool_USDT.deployed();
  await poolUsdt.setOwner(multiSigWallet);

  const poolWbtc = await Pool_WBTC.deployed();
  await poolWbtc.setOwner(multiSigWallet);

  const poolWeth = await Pool_WETH.deployed();
  await poolWeth.setOwner(multiSigWallet);

  const poolWmatic = await Pool_WMATIC.deployed();
  await poolWmatic.setOwner(multiSigWallet);

  const arthStablecoin = await ARTHStablecoin.deployed();
  await arthStablecoin.transferOwnership(multiSigWallet);

  const arthController = await ArthController.deployed();
  await arthController.setOwner(multiSigWallet);

  const arthShares = await ARTHShares.deployed();
  await arthShares.transferOwnership(multiSigWallet);

  // const ethGenesisUSDC = await ETHGenesisUSDC.deployed();
  // await ethGenesisUSDC.setOwner(multiSigWallet);

  // const ethGenesisUSDT = await ETHGenesisUSDT.deployed();
  // await ethGenesisUSDT.setOwner(multiSigWallet);

  // const ethGenesisWBTC = await ETHGenesisWBTC.deployed();
  // await ethGenesisWBTC.setOwner(multiSigWallet);

  // const ethGenesisWETH = await ETHGenesisWETH.deployed();
  // await ethGenesisWETH.setOwner(multiSigWallet);

  const genesisUSDC = await GenesisUSDC.deployed();
  await genesisUSDC.setOwner(multiSigWallet);

  const genesisUSDT = await GenesisUSDT.deployed();
  await genesisUSDT.setOwner(multiSigWallet);

  const genesisWBTC = await GenesisWBTC.deployed();
  await genesisWBTC.setOwner(multiSigWallet);

  const genesisWETH = await GenesisWETH.deployed();
  await genesisWETH.setOwner(multiSigWallet);

  const lotteryRaffle = await LotteryRaffle.deployed();
  await lotteryRaffle.setOwner(multiSigWallet);
};
