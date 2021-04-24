const fs = require('fs');
const path = require('path');
const util = require('util');
const { getDAI, getUSDC, getUSDT, getWETH, getMahaToken, getUniswapFactory, getUniswapRouter } = require('./helpers');

const knownContracts = require('./known-contracts');

const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);


// Deployment and ABI will be generated for contracts listed on here.
// The deployment thus can be used on frontend.
const exportedContracts = [
  'ARTH',
  'ARTHB',

];


// const Multicall = artifacts.require('Multicall');


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
    { abi: 'ARTHShares', contract: 'ARTHShares' },
    { abi: 'ARTHStablecoin', contract: 'ARTHStablecoin' },

    { abi: 'StakingRewards', contract: 'Stake_ARTH_WETH' },
    { abi: 'StakingRewards', contract: 'Stake_ARTH_USDC' },
    { abi: 'StakingRewards', contract: 'Stake_ARTH_ARTHX' },
    { abi: 'StakingRewards', contract: 'Stake_ARTHX_WETH' },

    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_ARTH_USDC' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_ARTH_USDT' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_USDC_WETH' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_USDT_WETH' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_ARTH_ARTHX' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_ARTHX_WETH' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_ARTHX_USDC' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_ARTHX_USDT' },
    { abi: 'UniswapPairOracle', contract: 'UniswapPairOracle_ARTH_WETH' },



    { abi: 'ArthPool', contract: 'Pool_USDC' },
    { abi: 'ArthPool', contract: 'Pool_USDT' },
  ];

  const deployments = {};

  try {
    const mahaToken = (await getMahaToken(network, null, artifacts)).address;
    const dai = (await getDAI(network, null, artifacts)).address;
    const factory = (await getUniswapFactory(network, null, artifacts)).address;
    const router = (await getUniswapRouter(network, null, artifacts)).address;

    const weth = (await getWETH(network, null, artifacts)).address;
    const usdc = (await getUSDC(network, null, artifacts)).address;
    const usdt = (await getUSDT(network, null, artifacts)).address;
    // const wbtc = (await getWB(network, null, artifacts)).address;

    // const multicall = isMainnet ?
    //   knownContracts.Multicall[network] :
    //   (await Multicall.deployed()).address;

    contracts.push({ contract: 'UniswapV2Factory', address: factory, abi: 'UniswapV2Factory' });
    contracts.push({ contract: 'UniswapV2Router02', address: router, abi: 'UniswapV2Router02' });
    contracts.push({ contract: 'DAI', address: dai, abi: 'IERC20' });
    contracts.push({ contract: 'USDT', address: usdt, abi: 'IERC20' });
    contracts.push({ contract: 'USDC', address: usdc, abi: 'IERC20' });
    contracts.push({ contract: 'WETH', address: weth, abi: 'IWETH' });
    contracts.push({ contract: 'WBTC', address: dai, abi: 'IERC20' });
    contracts.push({ contract: 'MahaToken', address: mahaToken, abi: 'MahaToken' });
    // contracts.push({ contract: 'Multicall', address: multicall, abi: 'Multicall' });


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

