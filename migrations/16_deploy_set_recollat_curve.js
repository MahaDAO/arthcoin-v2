const BigNumber = require('bignumber.js');
const ArthController = artifacts.require("ArthController");
const RecollateralDiscountCurve = artifacts.require("RecollateralDiscountCurve");

module.exports = async function (deployer) {

  await deployer.deploy(RecollateralDiscountCurve);

  const arthControllerInstance = await ArthController.deployed();
  const recollateralizationDiscountCurveInstance = await RecollateralDiscountCurve.deployed();

  await arthControllerInstance.setRecollateralizationCurve(
    recollateralizationDiscountCurveInstance.address,
  );

  const initalRecollateralizeDiscount = new BigNumber(await arthControllerInstance.getRecollateralizationDiscount());
  console.log(" NOTE: - initial_recollat_discount: ", initalRecollateralizeDiscount.toString());
  console.log(" NOTE: - initial_recollat_discount: ", initalRecollateralizeDiscount.div(1e6).toString());
}
