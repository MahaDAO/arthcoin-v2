const chalk = require('chalk');
const BigNumber = require('bignumber.js');

const knownContracts = require('./known-contracts');

const ONE = new BigNumber('1e18');
const ONEE6 = new BigNumber('1e6');
const ONEE8 = new BigNumber('1e8');
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

const getDAI = async (network, deployer, artifacts) => {
  const IERC20 = artifacts.require('IERC20');
  const MockDai = artifacts.require('MockDAI');

  const addr = knownContracts.DAI && knownContracts.DAI[network];
  if (addr) return IERC20.at(addr);
  if (MockDai.isDeployed()) return MockDai.deployed();

  console.log(chalk.yellow(`\nDeploying mock dai on ${network} network...`));
  await deployer.deploy(MockDai);

  return MockDai.deployed();
}

const getARTH = async (network, deployer, artifacts) => {
  const ARTH = artifacts.require('Arth/ARTHStablecoin');

  const addr = knownContracts.ARTH && knownContracts.ARTH[network];
  if (addr) return ARTH.at(addr);
  if (ARTH.isDeployed()) return ARTH.deployed();

  console.log(chalk.yellow(`\nDeploying arth on ${network} network...`));
  await deployer.deploy(ARTH);

  return ARTH.deployed();
}

const getARTHX = async (network, deployer, artifacts) => {
  const ARTHX = artifacts.require('ARTHX/ARTHShares');

  const addr = knownContracts.ARTHX && knownContracts.ARTHX[network];
  if (addr) return ARTHX.at(addr);
  if (ARTHX.isDeployed()) return ARTHX.deployed();

  console.log(chalk.yellow(`\nDeploying arthx on ${network} network...`));
  await deployer.deploy(ARTHX);

  return ARTHX.deployed();
}

const getWBTC = async (network, deployer, artifacts) => {
  const IERC20 = artifacts.require('IERC20');
  const MockWBTC = artifacts.require('MockWBTC');

  const addr = knownContracts.WBTC && knownContracts.WBTC[network];
  if (addr) return IERC20.at(addr);
  if (MockWBTC.isDeployed()) return MockWBTC.deployed();

  console.log(chalk.yellow(`\nDeploying mock wbtc on ${network} network...`));
  await deployer.deploy(MockWBTC);

  return MockWBTC.deployed();
}

const getWMATIC = async (network, deployer, artifacts) => {
  const IERC20 = artifacts.require('IERC20');
  const MockWMATIC = artifacts.require('MockWMATIC');

  const addr = knownContracts.WMATIC && knownContracts.WMATIC[network];
  if (addr) return IERC20.at(addr);
  if (MockWMATIC.isDeployed()) return MockWMATIC.deployed();

  console.log(chalk.yellow(`\nDeploying mock wmatic on ${network} network...`));
  await deployer.deploy(MockWMATIC);
  return MockWMATIC.deployed();
};

const getWETH = async (network, deployer, artifacts) => {
  const IWETH = artifacts.require('IWETH');
  const MockWETH = artifacts.require('WETH');

  const addr = knownContracts.WETH && knownContracts.WETH[network];
  if (addr) return IWETH.at(addr);
  if (MockWETH.isDeployed()) return MockWETH.deployed();

  console.log(chalk.yellow(`\nDeploying mock weth on ${network} network...`));
  await deployer.deploy(MockWETH);

  return MockWETH.deployed();
}

const getUSDC = async (network, deployer, artifacts) => {
  const IERC20 = artifacts.require('IERC20');
  const MockUSDC = artifacts.require('MockUSDC');

  const addr = knownContracts.USDC && knownContracts.USDC[network];
  if (addr) return IERC20.at(addr);
  if (MockUSDC.isDeployed()) return MockUSDC.deployed();

  console.log(chalk.yellow(`\nDeploying mock usdc on ${network} network...`));
  await deployer.deploy(MockUSDC);

  return MockUSDC.deployed();
}

const getUSDT = async (network, deployer, artifacts) => {
  const IERC20 = artifacts.require('IERC20');
  const MockUSDT = artifacts.require('MockUSDT');

  const addr = knownContracts.USDT && knownContracts.USDT[network];
  if (addr) return IERC20.at(addr);
  if (MockUSDT.isDeployed()) return MockUSDT.deployed();

  console.log(chalk.yellow(`\nDeploying mock dai on ${network} network...`));
  await deployer.deploy(MockUSDT);

  return MockUSDT.deployed();
}

const getMahaToken = async (network, deployer, artifacts) => {
  const IERC20 = artifacts.require('IERC20');
  const MahaToken = artifacts.require('MahaToken');
  const MockMaha = artifacts.require('MockMaha');

  const addr = knownContracts.MahaToken && knownContracts.MahaToken[network];
  if (addr) return IERC20.at(addr);

  if (!isMainnet(network)) {
    if (MockMaha.isDeployed()) return MockMaha.deployed();

    console.log(chalk.yellow(`\nDeploying mahatoken on ${network} network...`));
    await deployer.deploy(MockMaha);

    return MockMaha.deployed();
  } else {
    if (MahaToken.isDeployed()) return MahaToken.deployed();

    console.log(chalk.yellow(`\nDeploying mahatoken on ${network} network...`));
    await deployer.deploy(MahaToken);

    return MahaToken.deployed();
  }
}

const getUniswapFactory = async (network, deployer, artifacts) => {
  const UniswapV2Factory = artifacts.require('UniswapV2Factory');

  const addr = knownContracts.UniswapV2Factory && knownContracts.UniswapV2Factory[network];
  if (addr) return UniswapV2Factory.at(addr);
  if (UniswapV2Factory.isDeployed()) return UniswapV2Factory.deployed();

  console.log(chalk.yellow(`\nDeploying uniswap factory on ${network} network...`));
  await deployer.deploy(UniswapV2Factory, '0x0000000000000000000000000000000000000000');

  return UniswapV2Factory.deployed();
}

const getUniswapRouter = async (network, deployer, artifacts) => {
  const UniswapV2Router02 = artifacts.require('UniswapV2Router02');

  const addr = knownContracts.UniswapV2Router02 && knownContracts.UniswapV2Router02[network];
  if (addr) return UniswapV2Router02.at(addr);
  if (UniswapV2Router02.isDeployed()) return UniswapV2Router02.deployed();

  console.log(chalk.yellow(`\nDeploying uniswap router on ${network} network...`));
  const factory = await getUniswapFactory(network, deployer, artifacts);
  const weth = await getWETH(network, deployer, artifacts);
  await deployer.deploy(UniswapV2Router02, factory.address, weth.address);

  return UniswapV2Router02.deployed();
}

const getUSDCOracle = async (network, deployer, artifacts, ownerAddress) => {
  const UniversalGMUOracle = artifacts.require('Oracle_USDC');
  if (UniversalGMUOracle.isDeployed()) return UniversalGMUOracle.deployed();

  const chainlinkFeed = knownContracts.ChainlinkFeedUSDC && knownContracts.ChainlinkFeedUSDC[network];

  const gmuOracle = await getGMUOracle(network, deployer, artifacts);
  const chainlinkFeedAddr = await getChainlinkOracle(network, deployer, artifacts, chainlinkFeed);

  const base = await getUSDC(network, deployer, artifacts);
  const quote = await getWETH(network, deployer, artifacts);
  const uniswapOracle = knownContracts.UniswapUSDCWETHOracle && knownContracts.UniswapUSDCWETHOracle[network] || ZERO_ADDR;

  await deployer.deploy(
    UniversalGMUOracle,
    base.address,
    quote.address,
    uniswapOracle,
    chainlinkFeedAddr,
    gmuOracle.address
  );

  return UniversalGMUOracle.deployed();
};

const getWBTCOracle = async (network, deployer, artifacts, ownerAddress) => {
  const UniversalGMUOracle = artifacts.require('Oracle_WBTC');
  if (UniversalGMUOracle.isDeployed()) return UniversalGMUOracle.deployed();

  const chainlinkFeed = knownContracts.ChainlinkFeedWBTC && knownContracts.ChainlinkFeedWBTC[network];

  const gmuOracle = await getGMUOracle(network, deployer, artifacts);
  const chainlinkFeedAddr = await getChainlinkOracle(network, deployer, artifacts, chainlinkFeed, 30000);

  const base = await getWBTC(network, deployer, artifacts);
  const quote = await getWETH(network, deployer, artifacts);
  const uniswapOracle = knownContracts.UniswapUSDCWETHOracle && knownContracts.UniswapUSDCWETHOracle[network] || ZERO_ADDR;

  await deployer.deploy(
    UniversalGMUOracle,
    base.address,
    quote.address,
    uniswapOracle,
    chainlinkFeedAddr,
    gmuOracle.address
  );

  return UniversalGMUOracle.deployed();
};

const getWMATICOracle = async (network, deployer, artifacts, ownerAddress) => {
  const UniversalGMUOracle = artifacts.require('Oracle_WMATIC');
  if (UniversalGMUOracle.isDeployed()) return UniversalGMUOracle.deployed();

  const chainlinkFeed = knownContracts.ChainlinkFeedMATIC && knownContracts.ChainlinkFeedMATIC[network];

  const gmuOracle = await getGMUOracle(network, deployer, artifacts);
  const chainlinkFeedAddr = await getChainlinkOracle(network, deployer, artifacts, chainlinkFeed, 2);

  const base = await getWMATIC(network, deployer, artifacts);
  const quote = await getWETH(network, deployer, artifacts);
  const uniswapOracle = knownContracts.UniswapMATICUSDCHOracle && knownContracts.UniswapMATICUSDCHOracle[network] || ZERO_ADDR;

  await deployer.deploy(
    UniversalGMUOracle,
    base.address,
    quote.address,
    uniswapOracle,
    chainlinkFeedAddr,
    gmuOracle.address
  );

  return UniversalGMUOracle.deployed();
};

const getWETHOracle = async (network, deployer, artifacts, ownerAddress) => {
  const UniversalGMUOracle = artifacts.require('Oracle_WETH');
  if (UniversalGMUOracle.isDeployed()) return UniversalGMUOracle.deployed();

  const chainlinkFeed = knownContracts.ChainlinkFeedETH && knownContracts.ChainlinkFeedETH[network];

  const gmuOracle = await getGMUOracle(network, deployer, artifacts);
  const chainlinkFeedAddr = await getChainlinkOracle(network, deployer, artifacts, chainlinkFeed, 2000);

  const usdc = await getUSDC(network, deployer, artifacts);
  const weth = await getWETH(network, deployer, artifacts);
  const uniswapOracle = knownContracts.UniswapUSDCWETHOracle && knownContracts.UniswapUSDCWETHOracle[network] || ZERO_ADDR;

  await deployer.deploy(
    UniversalGMUOracle,
    usdc.address,
    weth.address,
    uniswapOracle,
    chainlinkFeedAddr,
    gmuOracle.address
  );

  return UniversalGMUOracle.deployed();
};

const getUSDTOracle = async (network, deployer, artifacts, ownerAddress) => {
  const UniversalGMUOracle = artifacts.require('Oracle_USDT');
  if (UniversalGMUOracle.isDeployed()) return UniversalGMUOracle.deployed();

  const chainlinkFeed = knownContracts.ChainlinkFeedUSDT && knownContracts.ChainlinkFeedUSDT[network];

  const gmuOracle = await getGMUOracle(network, deployer, artifacts);
  const chainlinkFeedAddr = await getChainlinkOracle(network, deployer, artifacts, chainlinkFeed);

  const base = await getUSDT(network, deployer, artifacts);
  const quote = await getWETH(network, deployer, artifacts);
  const uniswapOracle = knownContracts.UniswapUSDTWETHOracle && knownContracts.UniswapUSDTWETHOracle[network] || ZERO_ADDR;

  await deployer.deploy(
    UniversalGMUOracle,
    base.address,
    quote.address,
    uniswapOracle,
    chainlinkFeedAddr,
    gmuOracle.address
  );

  return UniversalGMUOracle.deployed();
};

const approveIfNot = async (token, spender, amount) => {
  console.log(` - Approving ${token.symbol ? (await token.symbol()) : token.address}`);
  await token.approve(spender, amount);
  console.log(` - Approved ${token.symbol ? (await token.symbol()) : token.address}`);
};

const getPairAddress = async (token1, token2, network, deployer, artifacts) => {
  const factory = await getUniswapFactory(network, deployer, artifacts);
  return await factory.getPair(token1, token2);
};

const isMainnet = (network) => network === 'mainnet' || network === 'bsc' || network === 'matic' || network === 'heco';

const getGMUOracle = async (network, deployer, artifacts) => {
  const GMUOracle = artifacts.require('GMUOracle');

  const addr = knownContracts.GMUOracle && knownContracts.GMUOracle[network];
  if (addr) return GMUOracle.at(addr);
  if (GMUOracle.isDeployed()) return GMUOracle.deployed();

  console.log(chalk.yellow(`\nDeploying GMU/USD oracle...`));
  await deployer.deploy(GMUOracle, 'GMU/USD', ONEE6.mul(2));

  return GMUOracle.deployed();
}

const getChainlinkOracle = async (network, deployer, artifacts, chainlinkConsumerAddr, mockPrice = 1) => {
  const MockChainlinkOracle = artifacts.require('MockUSDCChainlinkAggregator');

  if (!chainlinkConsumerAddr && !isMainnet(network)) {
    console.log(chalk.yellow(`\nDeploying mock Chainlink oracle...`))

    await deployer.deploy(MockChainlinkOracle);
    const mockUSDCChainlinkAggregator = await MockChainlinkOracle.deployed();
    await mockUSDCChainlinkAggregator.setLatestPrice(ONEE8.multipliedBy(mockPrice));
    return mockUSDCChainlinkAggregator.address;
  }

  if (!chainlinkConsumerAddr && isMainnet(network)) {
    return ZERO_ADDR;
  }

  return chainlinkConsumerAddr;
}


module.exports = {
  isMainnet,
  approveIfNot,
  getARTH,
  getARTHX,
  getDAI,
  getGMUOracle,
  getMahaToken,
  getPairAddress,
  getUniswapFactory,
  getUniswapRouter,
  getUSDC,
  getUSDCOracle,
  getUSDT,
  getUSDTOracle,
  getWBTC,
  getWBTCOracle,
  getWETH,
  getWETHOracle,
  getWMATIC,
  getWMATICOracle,
}
