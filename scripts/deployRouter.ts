import { network, ethers } from 'hardhat';

async function main() {
  const deployements = require(`../output/${network.name}.json`);

  // We get the contract to deploy.
  const UniswapLiquidityRouter = await ethers.getContractFactory('UniswapLiquidityRouter');

  const wethAddress = deployements.WETH.address
  const arthAddress = deployements.ARTHStablecoin.address;
  const mahaAddress = deployements.MahaToken.address;
  const arthxAddress = deployements.ARTHShares.address;
  const factoryAddress = deployements.UniswapV2Factory.address;

  const instance = await UniswapLiquidityRouter.deploy(
    arthAddress,
    mahaAddress,
    arthxAddress,
    factoryAddress,
    wethAddress
  );

  console.log('Routter has been deployed to:', instance.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
