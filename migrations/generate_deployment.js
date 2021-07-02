const fs = require('fs');
const path = require('path');
const util = require('util');
const { getUSDC, getUSDT, getARTH, getARTHX, getWETH, getMahaToken, getUniswapFactory, getUniswapRouter, getWMATIC, getWBTC, isMainnet } = require('./helpers');

const knownContracts = require('./known-contracts');

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
    // { abi: 'LotteryRaffle', contract: 'LotteryRaffle' },
    { abi: 'ArthPoolRouter', contract: 'ArthPoolRouter' },

    { abi: 'PoolToken', contract: 'PoolToken' },
    { abi: 'BasicStaking', contract: 'StakeARTH' },
    { abi: 'BasicStaking', contract: 'StakeARTHMAHA' },
    { abi: 'BasicStaking', contract: 'StakeARTHUSDC' },
    { abi: 'BasicStaking', contract: 'StakeARTHX' },
    { abi: 'BasicStaking', contract: 'StakeARTHXARTH' },
    { abi: 'BasicStaking', contract: 'StakeMAHA' },

    { abi: 'UniversalGMUOracle', contract: 'Oracle_USDC' },
    { abi: 'UniversalGMUOracle', contract: 'Oracle_USDT' },
    { abi: 'UniversalGMUOracle', contract: 'Oracle_WBTC' },
    { abi: 'UniversalGMUOracle', contract: 'Oracle_WMATIC' },
    { abi: 'UniversalGMUOracle', contract: 'Oracle_WETH' },
    { abi: 'GMUOracle', contract: 'GMUOracle' },

    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_ARTH_ARTHX' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_ARTH_MAHA' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_ARTH_USDC' },

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
    if (!isMainnet(network)) contracts.push({ abi: 'Faucet', contract: 'Faucet' });

    const factoryInstance = (await getUniswapFactory(network, null, artifacts));
    const factory = factoryInstance.address;
    const router = (await getUniswapRouter(network, null, artifacts)).address;

    const arth = (await getARTH(network, null, artifacts)).address;
    const arthx = (await getARTHX(network, null, artifacts)).address;
    const maha = (await getMahaToken(network, null, artifacts)).address;
    const usdc = (await getUSDC(network, null, artifacts)).address;
    const usdt = (await getUSDT(network, null, artifacts)).address;
    const wbtc = (await getWBTC(network, null, artifacts)).address;
    const weth = (await getWETH(network, null, artifacts)).address;
    const wmatic = (await getWMATIC(network, null, artifacts)).address;

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

    const arthMahaLP = await factoryInstance.getPair(arth, maha);
    const arthArthxLP = await factoryInstance.getPair(arth, arthx);
    const arthUsdcLP = await factoryInstance.getPair(arth, usdc);

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
