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
}

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
  const Oracle = artifacts.require('Oracle_USDC');
  const USDC_WETH = artifacts.require('UniswapPairOracle_USDC_WETH');

  const addr = knownContracts.OracleUSDC && knownContracts.OracleUSDC[network];
  if (addr) return Oracle.at(addr);
  if (Oracle.isDeployed()) return Oracle.deployed();

  const base = await getUSDC(network, deployer, artifacts);
  const quote = await getWETH(network, deployer, artifacts);
  const ethGMUOracle = await getETHGMUOracle(network, deployer, artifacts);
  const usdcGMUOracle = await getUSDCGMUOracle(network, deployer, artifacts);

  let usdcWETHAddr = knownContracts.UniswapUSDCWETHOracle && knownContracts.UniswapUSDCWETHOracle[network];
  if (!usdcWETHAddr) {
    const Timelock = artifacts.require("Timelock");
    const timelock = await Timelock.deployed();
    const factory = await getUniswapFactory(network, deployer, artifacts);

    await deployer.deploy(
      USDC_WETH,
      factory.address,
      base.address,
      quote.address,
      ownerAddress,
      timelock.address
    );

    usdcWETHAddr = (await USDC_WETH.deployed()).address;
  }

  await deployer.deploy(
    Oracle,
    base.address,
    quote.address,
    usdcWETHAddr,
    usdcGMUOracle ? usdcGMUOracle.address : ZERO_ADDR,
    ethGMUOracle.address
  );

  return Oracle.deployed();
}

const getWBTCOracle = async (network, deployer, artifacts, ownerAddress) => {
  const Oracle = artifacts.require('Oracle_WBTC');
  const WBTC_WETH = artifacts.require('UniswapPairOracle_WBTC_WETH');

  const addr = knownContracts.OracleWBTC && knownContracts.OracleWBTC[network];
  if (addr) return Oracle.at(addr);
  if (Oracle.isDeployed()) return Oracle.deployed();

  const base = await getWBTC(network, deployer, artifacts);
  const quote = await getWETH(network, deployer, artifacts);
  const ethGMUOracle = await getETHGMUOracle(network, deployer, artifacts);
  const wbtcGMUOracle = await getWBTCGMUOracle(network, deployer, artifacts);

  let wbtcWETHAddr = knownContracts.UniswapWBTCWETHOracle && knownContracts.UniswapWBTCWETHOracle[network];
  if (!wbtcWETHAddr) {
    const Timelock = artifacts.require("Timelock");
    const timelock = await Timelock.deployed();
    const factory = await getUniswapFactory(network, deployer, artifacts);

    await deployer.deploy(
      WBTC_WETH,
      factory.address,
      base.address,
      quote.address,
      ownerAddress,
      timelock.address
    );

    wbtcWETHAddr = (await WBTC_WETH.deployed()).address;
  }

  await deployer.deploy(
    Oracle,
    base.address,
    quote.address,
    wbtcWETHAddr,
    wbtcGMUOracle ? wbtcGMUOracle.address : ZERO_ADDR,
    ethGMUOracle.address
  );

  return Oracle.deployed();
}

const getWMATICOracle = async (network, deployer, artifacts, ownerAddress) => {
  const Oracle = artifacts.require('Oracle_WMATIC');
  const WMATIC_WETH = artifacts.require('UniswapPairOracle_WMATIC_WETH');

  const addr = knownContracts.OracleWMATIC && knownContracts.OracleWMATIC[network];
  if (addr) return Oracle.at(addr);
  if (Oracle.isDeployed()) return Oracle.deployed();

  const base = await getWMATIC(network, deployer, artifacts);
  const quote = await getWETH(network, deployer, artifacts);
  const ethGMUOracle = await getETHGMUOracle(network, deployer, artifacts);
  const maticGMUOracle = await getWMATICGMUOracle(network, deployer, artifacts);

  let maticWETHAddr = knownContracts.UniswapWBTCWETHOracle && knownContracts.UniswapWBTCWETHOracle[network];
  if (!maticWETHAddr) {
    const Timelock = artifacts.require("Timelock");
    const timelock = await Timelock.deployed();
    const factory = await getUniswapFactory(network, deployer, artifacts);

    await deployer.deploy(
      WMATIC_WETH,
      factory.address,
      base.address,
      quote.address,
      ownerAddress,
      timelock.address
    );

    maticWETHAddr = (await WMATIC_WETH.deployed()).address;
  }

  await deployer.deploy(
    Oracle,
    base.address,
    quote.address,
    maticWETHAddr,
    maticGMUOracle ? maticGMUOracle.address : ZERO_ADDR,
    ethGMUOracle.address
  );

  return Oracle.deployed();
}

const getWETHOracle = async (network, deployer, artifacts, ownerAddress) => {
  const Oracle = artifacts.require('Oracle_WETH');
  const WMATIC_WETH = artifacts.require('UniswapPairOracle_WMATIC_WETH');

  const addr = knownContracts.OracleWETH && knownContracts.OracleWETH[network];
  if (addr) return Oracle.at(addr);
  if (Oracle.isDeployed()) return Oracle.deployed();

  const base = await getWETH(network, deployer, artifacts);
  const quote = await getWMATIC(network, deployer, artifacts);
  const ethGMUOracle = await getETHGMUOracle(network, deployer, artifacts);

  let maticWETHAddr = knownContracts.UniswapWBTCWETHOracle && knownContracts.UniswapWBTCWETHOracle[network];
  if (!maticWETHAddr) {
    const Timelock = artifacts.require("Timelock");
    const timelock = await Timelock.deployed();
    const factory = await getUniswapFactory(network, deployer, artifacts);

    if (!WMATIC_WETH.isDeployed()) {
      await deployer.deploy(
        WMATIC_WETH,
        factory.address,
        base.address,
        quote.address,
        ownerAddress,
        timelock.address
      );
    }

    maticWETHAddr = (await WMATIC_WETH.deployed()).address;
  }

  await deployer.deploy(
    Oracle,
    base.address,
    quote.address,
    maticWETHAddr,
    ethGMUOracle.address,
    ethGMUOracle.address
  );

  return Oracle.deployed();
}

const getUSDTOracle = async (network, deployer, artifacts, ownerAddress) => {
  const Oracle = artifacts.require('Oracle_USDT');
  const USDT_WETH = artifacts.require('UniswapPairOracle_USDT_WETH');

  const addr = knownContracts.OracleUSDT && knownContracts.OracleUSDT[network];
  if (addr) return Oracle.at(addr);
  if (Oracle.isDeployed()) return Oracle.deployed();

  const base = await getUSDT(network, deployer, artifacts);
  const quote = await getWETH(network, deployer, artifacts);
  const ethGMUOracle = await getETHGMUOracle(network, deployer, artifacts);
  const usdtGMUOracle = await getUSDTGMUOracle(network, deployer, artifacts);

  let usdtWETHAddr = knownContracts.UniswapUSDTWETHOracle && knownContracts.UniswapUSDTWETHOracle[network];
  if (!usdtWETHAddr) {
    const Timelock = artifacts.require("Timelock");
    const timelock = await Timelock.deployed();
    const factory = await getUniswapFactory(network, deployer, artifacts);

    await deployer.deploy(
      USDT_WETH,
      factory.address,
      base.address,
      quote.address,
      ownerAddress,
      timelock.address
    );

    usdtWETHAddr = (await USDT_WETH.deployed()).address;
  }

  await deployer.deploy(
    Oracle,
    base.address,
    quote.address,
    usdtWETHAddr,
    usdtGMUOracle ? usdtGMUOracle.address : ZERO_ADDR,
    ethGMUOracle.address
  );

  return Oracle.deployed();
}

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
  await deployer.deploy(GMUOracle, 'GMU/USD', ONEE6);

  return GMUOracle.deployed();
}

const getUSDCGMUOracle = async (network, deployer, artifacts) => {
  const MockChainlinkOracle = artifacts.require('MockUSDCChainlinkAggregator');
  const ChainlinkETHUSDPriceConsumer = artifacts.require('USDC_GMU_Chainlink_Oracle');

  const addr = knownContracts['USDCGMUOracle'] && knownContracts.USDCGMUOracle[network];
  if (addr) return ChainlinkETHUSDPriceConsumer.at(addr);
  if (ChainlinkETHUSDPriceConsumer.isDeployed()) return ChainlinkETHUSDPriceConsumer.deployed();

  let defaultChainlinkConsumerAddr = (
    knownContracts.USDCUSDChainlinkOracleDefault &&
    knownContracts.USDCUSDChainlinkOracleDefault[network]
  );

  if (!defaultChainlinkConsumerAddr && !isMainnet(network)) {
    await deployer.deploy(MockChainlinkOracle);
    const mockUSDCChainlinkAggregator = await MockChainlinkOracle.deployed();
    await mockUSDCChainlinkAggregator.setLatestPrice(ONEE8);
    defaultChainlinkConsumerAddr = mockUSDCChainlinkAggregator.address;
  }

  if (!defaultChainlinkConsumerAddr && isMainnet(network)) {
    return null;
  }


  console.log(chalk.yellow(`\nDeploying Chainlink ETH/USD oracle...`))
  await deployer.deploy(
    ChainlinkETHUSDPriceConsumer,
    defaultChainlinkConsumerAddr,
    (await getGMUOracle(network, deployer, artifacts)).address
  );

  return ChainlinkETHUSDPriceConsumer.deployed();
}

const getUSDTGMUOracle = async (network, deployer, artifacts) => {
  const MockChainlinkOracle = artifacts.require('MockUSDTChainlinkAggregator');
  const ChainlinkETHUSDPriceConsumer = artifacts.require('USDT_GMU_Chainlink_Oracle');

  const addr = knownContracts['USDTGMUOracle'] && knownContracts.USDTGMUOracle[network];
  if (addr) return ChainlinkETHUSDPriceConsumer.at(addr);
  if (ChainlinkETHUSDPriceConsumer.isDeployed()) return ChainlinkETHUSDPriceConsumer.deployed();

  let defaultChainlinkConsumerAddr = (
    knownContracts.USDTUSDChainlinkOracleDefault &&
    knownContracts.USDTUSDChainlinkOracleDefault[network]
  );

  if (!defaultChainlinkConsumerAddr & !isMainnet(network)) {
    await deployer.deploy(MockChainlinkOracle);
    const mockUSDTChainlinkAggregator = await MockChainlinkOracle.deployed();
    await mockUSDTChainlinkAggregator.setLatestPrice(ONEE8);
    defaultChainlinkConsumerAddr = mockUSDTChainlinkAggregator.address;
  }

  if (!defaultChainlinkConsumerAddr && isMainnet(network)) {
    return null;
  }


  console.log(chalk.yellow(`\nDeploying Chainlink ETH/USD oracle...`));
  await deployer.deploy(
    ChainlinkETHUSDPriceConsumer,
    defaultChainlinkConsumerAddr,
    (await getGMUOracle(network, deployer, artifacts)).address
  );

  return ChainlinkETHUSDPriceConsumer.deployed();
}

const getWBTCGMUOracle = async (network, deployer, artifacts) => {
  const MockChainlinkOracle = artifacts.require('MockWBTCChainlinkAggregator');
  const ChainlinkETHUSDPriceConsumer = artifacts.require('WBTC_GMU_Chainlink_Oracle');

  const addr = knownContracts['WBTCGMUOracle'] && knownContracts.WBTCGMUOracle[network];
  if (addr) return ChainlinkETHUSDPriceConsumer.at(addr);
  if (ChainlinkETHUSDPriceConsumer.isDeployed()) return ChainlinkETHUSDPriceConsumer.deployed();

  let defaultChainlinkConsumerAddr = (
    knownContracts.WBTCUSDChainlinkOracleDefault &&
    knownContracts.WBTCUSDChainlinkOracleDefault[network]
  );

  if (!defaultChainlinkConsumerAddr && !isMainnet(network)) {
    await deployer.deploy(MockChainlinkOracle);
    const mockUSDTChainlinkAggregator = await MockChainlinkOracle.deployed();
    await mockUSDTChainlinkAggregator.setLatestPrice(ONEE8);
    defaultChainlinkConsumerAddr = mockUSDTChainlinkAggregator.address;
  }

  if (!defaultChainlinkConsumerAddr && isMainnet(network)) {
    return null;
  }


  console.log(chalk.yellow(`\nDeploying Chainlink ETH/USD oracle...`));
  await deployer.deploy(
    ChainlinkETHUSDPriceConsumer,
    defaultChainlinkConsumerAddr,
    (await getGMUOracle(network, deployer, artifacts)).address
  );

  return ChainlinkETHUSDPriceConsumer.deployed();
}

const getWMATICGMUOracle = async (network, deployer, artifacts) => {
  const MockChainlinkOracle = artifacts.require('MockWBTCChainlinkAggregator');
  const ChainlinkETHUSDPriceConsumer = artifacts.require('WMATIC_GMU_Chainlink_Oracle');

  const addr = knownContracts['WMATICGMUOracle'] && knownContracts.WMATICGMUOracle[network];
  if (addr) return ChainlinkETHUSDPriceConsumer.at(addr);
  if (ChainlinkETHUSDPriceConsumer.isDeployed()) return ChainlinkETHUSDPriceConsumer.deployed();

  let defaultChainlinkConsumerAddr = (
    knownContracts.WMATICUSDChainlinkOracleDefault &&
    knownContracts.WMATICUSDChainlinkOracleDefault[network]
  );

  if (!defaultChainlinkConsumerAddr && !isMainnet(network)) {
    await deployer.deploy(MockChainlinkOracle);
    const mockUSDTChainlinkAggregator = await MockChainlinkOracle.deployed();
    await mockUSDTChainlinkAggregator.setLatestPrice(ONEE8);
    defaultChainlinkConsumerAddr = mockUSDTChainlinkAggregator.address;
  }

  if (!defaultChainlinkConsumerAddr && isMainnet(network)) {
    return null;
  }

  console.log(chalk.yellow(`\nDeploying Chainlink ETH/USD oracle...`));
  await deployer.deploy(
    ChainlinkETHUSDPriceConsumer,
    defaultChainlinkConsumerAddr,
    (await getGMUOracle(network, deployer, artifacts)).address
  );

  return ChainlinkETHUSDPriceConsumer.deployed();
}

const getETHGMUOracle = async (network, deployer, artifacts) => {
  const MockChainlinkOracle = artifacts.require('MockChainlinkAggregatorV3');
  const ChainlinkETHUSDPriceConsumer = artifacts.require('ChainlinkETHUSDPriceConsumer');

  const addr = knownContracts['ETHGMUOracle'] && knownContracts.ETHGMUOracle[network];
  if (addr) return ChainlinkETHUSDPriceConsumer.at(addr);
  if (ChainlinkETHUSDPriceConsumer.isDeployed()) return ChainlinkETHUSDPriceConsumer.deployed();

  let defaultChainlinkConsumerAddr = knownContracts.ETHUSDChainlinkOracleDefault[network];
  if (!defaultChainlinkConsumerAddr && !isMainnet(network)) {
    await deployer.deploy(MockChainlinkOracle);
    defaultChainlinkConsumerAddr = (await MockChainlinkOracle.deployed()).address;
  }

  console.log(chalk.yellow(`\nDeploying Chainlink ETH/USD oracle...`))
  await deployer.deploy(
    ChainlinkETHUSDPriceConsumer,
    defaultChainlinkConsumerAddr,
    (await getGMUOracle(network, deployer, artifacts)).address
  );

  return ChainlinkETHUSDPriceConsumer.deployed();
}

module.exports = {
  isMainnet,
  getPairAddress,
  getDAI,
  getWETH,
  getWBTC,
  getWMATIC,
  getUSDCOracle,
  getUSDTOracle,
  getUSDC,
  getUSDT,
  getMahaToken,
  approveIfNot,
  getUniswapFactory,
  getUniswapRouter,
  getGMUOracle,
  getETHGMUOracle,
  getUSDTGMUOracle,
  getUSDCGMUOracle,
  getWBTCOracle,
  getWMATICOracle,
  getWETHOracle
}
