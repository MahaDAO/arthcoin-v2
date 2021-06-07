/**
 * List of known (already deployed and verified) contract addresses on here.
 * NOTE: The ropsten token addresses might not be the actual/correct addresses for the
 * respective token.
 */
module.exports = {
  UniswapV2Factory: {
    mainnet: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    ropsten: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    rinkeby: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    kovan: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    goerli: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
  },
  UniswapV2Router02: {
    mainnet: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    ropsten: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    rinkeby: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    kovan: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    goerli: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
  },
  Multicall: {
    mainnet: '0xeefba1e63905ef1d7acba5a8513c70307c1ce441',
    ropsten: '0x53c43764255c17bd724f74c4ef150724ac50a3ed',
    rinkeby: '0x42ad527de7d4e9d9d011ac45b31d8551f8fe9821',
    kovan: '0x2cc8688c5f75e365aaeeb4ea8d6a480405a48d2a',
    goerli: '0x77dca2c955b15e9de4dbbcf1246b4b85b651e50e'
  },

  WETH: {
    mainnet: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    rinkeby: '0xc778417e063141139fce010982780140aa0cd5ab',
  },
  DAI: {
    mainnet: '0x6b175474e89094c44da98b954eedeac495271d0f',
  },

  MahaToken: {
    mainnet: '0xb4d930279552397bba2ee473229f89ec245bc365',
  },

  ChainlinkETHUSDOracle: {
    kovan: '0x9326BFA02ADD2366b30bacB125260Af641031331',
    maticMumbai: '0x0715A7794a1dc8e42615F059dD6e406A6594651A'
  },
  ETHGMUOracle: {},

  ChainlinkUSDTUSDOracle: {
    maticMumbai: '0x92C09849638959196E976289418e5973CC96d645'
  },
  USDTGMUOracle: {},
  USDTOracle: {},
  UniswapUSDTWETHOracle: {},

  ChainlinkUSDCUSDOracle: {
    maticMumbai: '0x572dDec9087154dC5dfBB1546Bb62713147e0Ab0'
  },
  USDCGMUOracle: {},
  USDCOracle: {},
  UniswapUSDCWETHOracle: {}
}
