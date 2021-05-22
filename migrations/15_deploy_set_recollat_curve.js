const BigNumber = require('bignumber.js');
const ArthController = artifacts.require("ArthController");
const ArthControllerProxy = artifacts.require("ArthControllerProxy");
const RecollateralDiscountCurve = artifacts.require("RecollateralDiscountCurve");


module.exports = async function (deployer) {
  await deployer.deploy(RecollateralDiscountCurve);

  const arthControllerInstance = await ArthController.deployed();
  const arthControllerProxy = await ArthController.deployed();
  const recollateralizationDiscountCurveInstance = await RecollateralDiscountCurve.deployed();

  await arthControllerProxy.setRecollateralizationCurve(
    recollateralizationDiscountCurveInstance.address,
  );

  const initalRecollateralizeDiscount = new BigNumber(await arthControllerProxy.getRecollateralizationDiscount());
  console.log(" NOTE: - initial_recollat_discount: ", initalRecollateralizeDiscount.toString());
  console.log(" NOTE: - initial_recollat_discount: ", initalRecollateralizeDiscount.div(1e6).toString());
}
