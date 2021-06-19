const fs = require('fs');
const path = require('path');
const util = require('util');
const { getUSDC, getUSDT, getWETH, getMahaToken, getUniswapFactory, getUniswapRouter, getWMATIC, getWBTC, isMainnet } = require('./helpers');

const knownContracts = require('./known-contracts');

const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);
const Multicall = artifacts.require('Multicall');
const ARTHStablecoin = artifacts.require('ARTHStablecoin');
const ARTHShares = artifacts.require('ARTHShares');

/**
 * Main migrations
 */
module.exports = async (callback) => {
  const network = process.argv[5];

  const contracts = [
    { abi: 'ArthController', contract: 'ArthController' },
    { abi: 'LotteryRaffle', contract: 'LotteryRaffle' },
    { abi: 'ArthPoolRouter', contract: 'ArthPoolRouter' },

    { abi: 'PoolToken', contract: 'PoolToken' },
    { abi: 'BasicStaking', contract: 'StakeARTHMAHA' },
    { abi: 'BasicStaking', contract: 'StakeARTH' },
    { abi: 'BasicStaking', contract: 'StakeARTHWETH' },
    { abi: 'BasicStaking', contract: 'StakeARTHX' },
    { abi: 'BasicStaking', contract: 'StakeARTHXWETH' },

    { abi: 'Oracle', contract: 'Oracle_USDC' },
    { abi: 'Oracle', contract: 'Oracle_USDT' },
    { abi: 'Oracle', contract: 'Oracle_WBTC' },
    { abi: 'Oracle', contract: 'Oracle_WMATIC' },
    { abi: 'Oracle', contract: 'Oracle_WETH' },
    { abi: 'GMUOracle', contract: 'GMUOracle' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_ARTH_WETH' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_ARTHX_WETH' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_MAHA_ARTH' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_USDC_WETH' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_USDT_WETH' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_WBTC_WETH' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_WMATIC_WETH' },

    { abi: 'Genesis', contract: 'GenesisUSDC' },
    { abi: 'Genesis', contract: 'GenesisUSDT' },
    { abi: 'Genesis', contract: 'GenesisWBTC' },
    { abi: 'Genesis', contract: 'GenesisWMATIC' },
    { abi: 'Genesis', contract: 'GenesisWETH' },

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

    const weth = (await getWETH(network, null, artifacts)).address;
    const usdc = (await getUSDC(network, null, artifacts)).address;
    const usdt = (await getUSDT(network, null, artifacts)).address;
    const wbtc = (await getWBTC(network, null, artifacts)).address;
    const wmatic = (await getWMATIC(network, null, artifacts)).address;

    const arth = (await ARTHStablecoin.deployed()).address;
    contracts.push({ abi: 'ARTHStablecoin', contract: 'ARTHStablecoin' })

    const arthx = (await ARTHShares.deployed()).address;
    contracts.push({ abi: 'ARTHShares', contract: 'ARTHShares' })

    const mahaToken = (await getMahaToken(network, null, artifacts)).address;
    contracts.push({ contract: 'MahaToken', address: mahaToken, abi: 'MahaToken' });

    contracts.push({ contract: 'UniswapV2Factory', address: factory, abi: 'UniswapV2Factory' });
    contracts.push({ contract: 'UniswapV2Router02', address: router, abi: 'UniswapV2Router02' });
    contracts.push({ contract: 'USDT', address: usdt, abi: 'IERC20' });
    contracts.push({ contract: 'USDC', address: usdc, abi: 'IERC20' });
    contracts.push({ contract: 'WETH', address: weth, abi: 'IWETH' });
    contracts.push({ contract: 'WBTC', address: wbtc, abi: 'IERC20' });
    contracts.push({ contract: 'WMATIC', address: wmatic, abi: 'IERC20' });
    contracts.push({ contract: 'MahaToken', address: mahaToken, abi: 'MahaToken' });

    const arthMahaLP = await factoryInstance.getPair(arth, mahaToken)
    const arthEthLP = await factoryInstance.getPair(arth, weth)
    const arthxEthLP = await factoryInstance.getPair(arthx, weth)

    contracts.push({ contract: 'ArthMahaLP', address: arthMahaLP, abi: 'UniswapV2Pair' });
    contracts.push({ contract: 'ArthxWethLP', address: arthxEthLP, abi: 'UniswapV2Pair' });
    contracts.push({ contract: 'ArthWethLP', address: arthEthLP, abi: 'UniswapV2Pair' });
    // contracts.push({ contract: 'MahaWethLP', address: multicall, abi: 'UniswapV2Pair' });

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
