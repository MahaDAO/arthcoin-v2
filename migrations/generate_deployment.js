const fs = require('fs');
const path = require('path');
const util = require('util');
const { getDAI, getUSDC, getUSDT, getWETH, getMahaToken, getUniswapFactory, getUniswapRouter } = require('./helpers');

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
  const isMainnet = process.argv.includes('mainnet');

  // Set the main account, you'll be using accross all the files for various
  // important activities to your desired address in the .env file.
  // accounts[0] = process.env.WALLET_KEY;

  const contracts = [
    { abi: 'ArthController', contract: 'ArthController' },
    //{ abi: 'ARTHShares', contract: 'ARTHShares' },


    { abi: 'BoostedStaking', contract: 'StakeARTHMAHA' },
    { abi: 'BoostedStaking', contract: 'StakeARTH' },
    { abi: 'BoostedStaking', contract: 'StakeARTHWETH' },
    { abi: 'BoostedStaking', contract: 'StakeARTHX' },
    { abi: 'BoostedStaking', contract: 'StakeARTHXWETH' },

    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_ARTH_WETH' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_ARTHX_WETH' },

    { abi: 'GMUOracle', contract: 'GMUOracle' },
    { abi: 'SimpleOracle', contract: 'ARTHMAHAOracle' },

    { abi: 'Oracle', contract: 'Oracle_USDC' },
    { abi: 'Oracle', contract: 'Oracle_USDT' },
    { abi: 'ArthPoolLibrary', contract: 'ArthPoolLibrary' },
    { abi: 'MockChainlinkAggregatorV3', contract: 'MockChainlinkAggregatorV3' },
    { abi: 'MockChainlinkAggregatorV3', contract: 'MockUSDCChainlinkAggregator' },
    { abi: 'MockChainlinkAggregatorV3', contract: 'MockUSDTChainlinkAggregator' },

    { abi: 'PoolToken', contract: 'PoolToken' },

    { abi: 'ArthPool', contract: 'Pool_USDC' },
    { abi: 'ArthPool', contract: 'Pool_USDT' },
    { abi: 'ArthPoolRouter', contract: 'ArthPoolRouter' },
  ];

  const deployments = {};

  try {
    if (!isMainnet) contracts.push({ abi: 'Faucet', contract: 'Faucet' });

    //const mahaToken = (await getMahaToken(network, null, artifacts)).address;
    const dai = (await getDAI(network, null, artifacts)).address;
    const factoryInstance = (await getUniswapFactory(network, null, artifacts));
    const factory = factoryInstance.address;
    const router = (await getUniswapRouter(network, null, artifacts)).address;

    const weth = (await getWETH(network, null, artifacts)).address;
    const usdc = (await getUSDC(network, null, artifacts)).address;
    const usdt = (await getUSDT(network, null, artifacts)).address;
    // const wbtc = (await getWB(network, null, artifacts)).address;

    let arth
    let arthx
    let mahaToken

    arth = (await ARTHStablecoin.deployed()).address;
    contracts.push({ abi: 'ARTHStablecoin', contract: 'ARTHStablecoin' })

    arthx = (await ARTHShares.deployed()).address;
    contracts.push({ abi: 'ARTHShares', contract: 'ARTHShares' })

    mahaToken = (await getMahaToken(network, null, artifacts)).address;
    contracts.push({ contract: 'MahaToken', address: mahaToken, abi: 'MahaToken' });

    const multicall = knownContracts.Multicall[network] ?
      knownContracts.Multicall[network] :
      (await Multicall.deployed()).address;

    contracts.push({ contract: 'UniswapV2Factory', address: factory, abi: 'UniswapV2Factory' });
    contracts.push({ contract: 'UniswapV2Router02', address: router, abi: 'UniswapV2Router02' });
    contracts.push({ contract: 'DAI', address: dai, abi: 'IERC20' });
    contracts.push({ contract: 'USDT', address: usdt, abi: 'IERC20' });
    contracts.push({ contract: 'USDC', address: usdc, abi: 'IERC20' });
    contracts.push({ contract: 'WETH', address: weth, abi: 'IWETH' });
    contracts.push({ contract: 'WBTC', address: dai, abi: 'IERC20' });
    //contracts.push({ contract: 'MahaToken', address: mahaToken, abi: 'MahaToken' });
    contracts.push({ contract: 'Multicall', address: multicall, abi: 'Multicall' });

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
