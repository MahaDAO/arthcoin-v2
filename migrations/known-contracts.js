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
    goerli: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    maticMumbai: '0xc35dadb65012ec5796536bd9864ed8773abc74c4',
    matic: '0xe7fb3e833efe5f9c441105eb65ef8b261266423b',  // DFYN.
  },
  UniswapV2Router02: {
    mainnet: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    ropsten: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    rinkeby: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    kovan: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    goerli: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    maticMumbai: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    matic: '0xA102072A4C07F06EC3B4900FDC4C7B80b6c57429',  // DFYN.
  },
  Multicall: {
    mainnet: '0xeefba1e63905ef1d7acba5a8513c70307c1ce441',
    ropsten: '0x53c43764255c17bd724f74c4ef150724ac50a3ed',
    rinkeby: '0x42ad527de7d4e9d9d011ac45b31d8551f8fe9821',
    kovan: '0x2cc8688c5f75e365aaeeb4ea8d6a480405a48d2a',
    goerli: '0x77dca2c955b15e9de4dbbcf1246b4b85b651e50e',
  },

  WETH: {
    mainnet: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    rinkeby: '0xc778417e063141139fce010982780140aa0cd5ab',
    maticMumbai: '0x5b67676a984807a212b1c59ebfc9b3568a474f0a',
    matic: '0x4c28f48448720e9000907bc2611f73022fdce1fa',  // WMATIC
  },
  USDC: {
    matic: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  },
  USDT: {
    matic: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
  },
  DAI: {
    mainnet: '0x6b175474e89094c44da98b954eedeac495271d0f',
    matic: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
  },
  WBTC: {
    matic: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
  },
  MahaToken: {
    mainnet: '0xb4d930279552397bba2ee473229f89ec245bc365',
  },
  WMATIC: {
    matic: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',  // WETH.
  },

  ChainlinkFeedETH: {
    kovan: '0x9326BFA02ADD2366b30bacB125260Af641031331',
    maticMumbai: '0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada',
    matic: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',  // MATIC/USD.
  },
  ChainlinkFeedUSDT: {
    maticMumbai: '0x92C09849638959196E976289418e5973CC96d645',
    matic: '0x0A6513e40db6EB1b165753AD52E80663aeA50545',
  },
  ChainlinkFeedUSDC: {
    maticMumbai: '0x572dDec9087154dC5dfBB1546Bb62713147e0Ab0',
    matic: '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7',
  },
  ChainlinkFeedWBTC: {
    matic: '0xDE31F8bFBD8c84b5360CFACCa3539B938dd78ae6',
  },
  ChainlinkFeedMATIC: {
    maticMumbai: '0x0715A7794a1dc8e42615F059dD6e406A6594651A',
    matic: '0xF9680D99D6C9589e2a93a78A04A279e509205945'
  },
  ChainlinkFeedDAI: {
    maticMumbai: '0x0FCAa9c899EC5A91eBc3D5Dd869De833b06fB046',
    matic: '0x4746DeC9e833A82EC7C2C1356372CcF2cfcD2F3D'
  },

  USDTETHUniswapPair: {
    matic: '0x9045b1762a0bc4BadD08eE7B1A55c3871DE9B7b4',
  },
  USDCETHUniswapPair: {
    matic: '0x4f5dF10B9991482bCD2DB19DAE1FD0e0184397c2',
  },
  WBTCETHUniswapPair: {
    matic: '0x3318801171F0705781Ab0f97eBCCef73b2486165',
  },
  WMATICETHUniswapPair: {
    matic: ' 0xC3379226AEeF21464d05676305dad1261D6F3FAC',
  }
}
