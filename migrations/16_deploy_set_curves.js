const BondingCurve = artifacts.require("BondingCurve");
const ArthController = artifacts.require("ArthController");
const RecollateralDiscountCurve = artifacts.require("RecollateralDiscountCurve");


module.exports = async function (deployer, network) {
  const DEPLOYER_ADDRESS = accounts[0];

  await deployer.deploy(BondingCurve);
  await deployer.deploy(RecollateralDiscountCurve);

  const arthControllerInstance = await ArthController.deplyed()
  const recollateralizationDiscountCurveInstance = await RecollateralDiscountCurve.deplyed();

  await arthControllerInstance.setRecollateralizationCurve(
    recollateralizationDiscountCurveInstance.address,
    { from: DEPLOYER_ADDRESS }
  );

  // TODO: deploy genesis and set bonding curve.
}
