const BigNumber = require('bignumber.js');
const ArthController = artifacts.require("ArthController");
const ARTHControllerProxy = artifacts.require("ArthControllerProxy");
const RecollateralDiscountCurve = artifacts.require("RecollateralDiscountCurve");


module.exports = async function (deployer) {
  await deployer.deploy(RecollateralDiscountCurve);

  const arthControllerInstance = await ArthController.deployed();
  const arthControllerProxyInstance = await ArthController.deployed();

  const recollateralizationDiscountCurveInstance = await RecollateralDiscountCurve.deployed();

  await arthControllerInstance.setRecollateralizationCurve(
    recollateralizationDiscountCurveInstance.address,
  );

  const initalRecollateralizeDiscount = new BigNumber(await arthControllerInstance.getRecollateralizationDiscount());
  console.log(" NOTE: - initial_recollat_discount: ", initalRecollateralizeDiscount.toString());
  console.log(" NOTE: - initial_recollat_discount: ", initalRecollateralizeDiscount.div(1e6).toString());

  console.log('\nProxy should return the same values')
  const initalRecollateralizeDiscount_proxy = new BigNumber(await arthControllerInstance.getRecollateralizationDiscount());
  console.log(" NOTE: - initial_recollat_discount_proxy: ", initalRecollateralizeDiscount_proxy.toString());
  console.log(" NOTE: - initial_recollat_discount:_proxy ", initalRecollateralizeDiscount_proxy.div(1e6).toString());
}
