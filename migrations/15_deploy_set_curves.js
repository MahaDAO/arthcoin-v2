const { default: BigNumber } = require("bignumber.js");

const BondingCurve = artifacts.require("BondingCurve");
const ArthController = artifacts.require("ArthController");
const RecollateralDiscountCurve = artifacts.require("RecollateralDiscountCurve");


module.exports = async function (deployer) {
  await deployer.deploy(RecollateralDiscountCurve);
  await deployer.deploy(BondingCurve, new BigNumber('1300e6')); // Fixed price.

  const arthControllerInstance = await ArthController.deployed()
  const recollateralizationDiscountCurveInstance = await RecollateralDiscountCurve.deployed();

  await arthControllerInstance.setRecollateralizationCurve(
    recollateralizationDiscountCurveInstance.address,
  );
}
