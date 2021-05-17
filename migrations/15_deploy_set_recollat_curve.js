const ArthController = artifacts.require("ArthController");
const RecollateralDiscountCurve = artifacts.require("RecollateralDiscountCurve");


module.exports = async function (deployer) {
  await deployer.deploy(RecollateralDiscountCurve);

  const arthControllerInstance = await ArthController.deployed();
  const recollateralizationDiscountCurveInstance = await RecollateralDiscountCurve.deployed();

  await arthControllerInstance.setRecollateralizationCurve(
    recollateralizationDiscountCurveInstance.address,
  );
}
