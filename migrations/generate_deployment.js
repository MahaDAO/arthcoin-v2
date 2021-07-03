const fs = require('fs');
const path = require('path');
const util = require('util');

const helpers = require('./helpers');
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);
const Multicall = artifacts.require('Multicall');

/**
 * Main migrations
 */
module.exports = async (callback) => {
  const network = process.argv[5];

  const contracts = [
    { abi: 'ArthController', contract: 'ArthController' },
    { abi: 'ArthPoolRouter', contract: 'ArthPoolRouter' },

    { abi: 'PoolToken', contract: 'PoolToken' },
    { abi: 'BasicStaking', contract: 'StakeARTH' },
    { abi: 'BasicStaking', contract: 'StakeARTHMAHA' },
    { abi: 'BasicStaking', contract: 'StakeARTHUSDC' },
    { abi: 'BasicStaking', contract: 'StakeARTHX' },
    { abi: 'BasicStaking', contract: 'StakeARTHXARTH' },
    { abi: 'BasicStaking', contract: 'StakeMAHA' },

    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_ARTH_ARTHX' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_ARTH_MAHA' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_ARTH_USDC' },

    // { abi: 'LotteryRaffle', contract: 'LotteryRaffle' },
    // { abi: 'Genesis', contract: 'GenesisUSDC' },
    // { abi: 'Genesis', contract: 'GenesisUSDT' },
    // { abi: 'Genesis', contract: 'GenesisWBTC' },
    // { abi: 'Genesis', contract: 'GenesisWMATIC' },
    // { abi: 'Genesis', contract: 'GenesisWETH' },

    { abi: 'ArthPoolLibrary', contract: 'ArthPoolLibrary' },

    { abi: 'ArthPool', contract: 'Pool_USDC' },
    { abi: 'ArthPool', contract: 'Pool_USDT' },
    { abi: 'ArthPool', contract: 'Pool_WBTC' },
    { abi: 'ArthPool', contract: 'Pool_WMATIC' },
    { abi: 'ArthPool', contract: 'Pool_WETH' },
  ];

  const deployments = {};

  try {
    if (!helpers.isMainnet(network)) contracts.push({ abi: 'Faucet', contract: 'Faucet' });

    const factoryInstance = (await helpers.getUniswapFactory(network, null, artifacts));
    const factory = factoryInstance.address;
    const router = (await helpers.getUniswapRouter(network, null, artifacts)).address;

    const arth = (await helpers.getARTH(network, null, artifacts)).address;
    const arthx = (await helpers.getARTHX(network, null, artifacts)).address;
    const maha = (await helpers.getMahaToken(network, null, artifacts)).address;
    const usdc = (await helpers.getUSDC(network, null, artifacts)).address;
    const usdt = (await helpers.getUSDT(network, null, artifacts)).address;
    const wbtc = (await helpers.getWBTC(network, null, artifacts)).address;
    const weth = (await helpers.getWETH(network, null, artifacts)).address;
    const wmatic = (await helpers.getWMATIC(network, null, artifacts)).address;

    const oracleMATIC= (await helpers.getUSDCOracle(network, null, artifacts)).address;
    const oracleUSDC= (await helpers.getUSDTOracle(network, null, artifacts)).address;
    const oracleUSDT= (await helpers.getWBTCOracle(network, null, artifacts)).address;
    const oracleWBTC= (await helpers.getWMATICOracle(network, null, artifacts)).address;
    const oracleWETH= (await helpers.getWETHOracle(network, null, artifacts)).address;
    const gmuOracle= (await helpers.getGMUOracle(network, null, artifacts)).address;

    const arthMahaLP = await factoryInstance.getPair(arth, maha);
    const arthArthxLP = await factoryInstance.getPair(arth, arthx);
    const arthUsdcLP = await factoryInstance.getPair(arth, usdc);

    contracts.push({ contract: 'ARTHShares', abi: 'ARTHShares', address: arthx });
    contracts.push({ contract: 'ARTHStablecoin', abi: 'ARTHStablecoin', address: arth });
    contracts.push({ contract: 'MahaToken', address: maha, abi: 'MahaToken' });
    contracts.push({ contract: 'MahaToken', address: maha, abi: 'MahaToken' });
    contracts.push({ contract: 'UniswapV2Factory', address: factory, abi: 'UniswapV2Factory' });
    contracts.push({ contract: 'UniswapV2Router02', address: router, abi: 'UniswapV2Router02' });
    contracts.push({ contract: 'USDC', address: usdc, abi: 'IERC20' });
    contracts.push({ contract: 'USDT', address: usdt, abi: 'IERC20' });
    contracts.push({ contract: 'WBTC', address: wbtc, abi: 'IERC20' });
    contracts.push({ contract: 'WETH', address: weth, abi: 'IWETH' });
    contracts.push({ contract: 'WMATIC', address: wmatic, abi: 'IERC20' });

    contracts.push({ contract: 'Oracle_USDC', address: oracleUSDC, abi: 'UniversalGMUOracle' });
    contracts.push({ contract: 'Oracle_USDT', address: oracleUSDT, abi: 'UniversalGMUOracle' });
    contracts.push({ contract: 'Oracle_WBTC', address: oracleWBTC, abi: 'UniversalGMUOracle' });
    contracts.push({ contract: 'Oracle_WMATIC', address: oracleMATIC, abi: 'UniversalGMUOracle' });
    contracts.push({ contract: 'Oracle_WETH', address: oracleWETH, abi: 'UniversalGMUOracle' });
    contracts.push({ contract: 'GMUOracle', address: gmuOracle, abi: 'GMUOracle' });

    contracts.push({ contract: 'ArthMahaLP', address: arthMahaLP, abi: 'UniswapV2Pair' });
    contracts.push({ contract: 'ArthArthxLP', address: arthArthxLP, abi: 'UniswapV2Pair' });
    contracts.push({ contract: 'ArthUsdcLP', address: arthUsdcLP, abi: 'UniswapV2Pair' });

    const abiDir = path.resolve(__dirname, `../output/abi`);
    const deploymentPath = path.resolve(__dirname, `../output/${network}.json`);

    await mkdir(abiDir, { recursive: true });

    for (const name of contracts) {
      const contractAddress = name.address ? name.address : artifacts.require(name.contract).address;
      const abiContract = artifacts.require(name.abi);

      deployments[name.contract] = {
        address: contractAddress,
        abi: name.abi,
      };

      const abiPath = path.resolve(abiDir, `${name.abi}.json`);
      await writeFile(abiPath, JSON.stringify(abiContract.abi, null, 2));
    }
    await writeFile(deploymentPath, JSON.stringify(deployments, null, 2));
  } catch (error) {
    console.log(error);
  }

  callback();
};
