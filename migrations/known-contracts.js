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
  ARTH: {
    matic: '0xe52509181feb30eb4979e29ec70d50fd5c44d590',
  },
  ARTHX: {
    matic: '0xd354d56dae3588f1145dd664bc5094437b889d6f',
  },
  WETH: {
    mainnet: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    rinkeby: '0xc778417e063141139fce010982780140aa0cd5ab',
    maticMumbai: '0x5b67676a984807a212b1c59ebfc9b3568a474f0a',
    matic: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  },
  USDC: {
    matic: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    mainnet: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  },
  USDT: {
    mainnet: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    matic: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
  },
  DAI: {
    mainnet: '0x6b175474e89094c44da98b954eedeac495271d0f',
    matic: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
    rinkeby: '0xc7ad46e0b8a400bb3c915120d284aafba8fc4735',
  },
  WBTC: {
    matic: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
    mainnet: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
  },
  MahaToken: {
    matic: '0xedd6ca8a4202d4a36611e2fff109648c4863ae19',
    mainnet: '0xb4d930279552397bba2ee473229f89ec245bc365',
  },
  GMUOracle: {
    matic: '0xBe5514E856a4eb971653BcC74475B26b56763FD0'
  },
  Oracle_USDT: {
    matic: '0xD74F644064360FaCe0A46788587FA7065AbA16b4'
  },
  Oracle_WETH: {
    matic: '0x0a06b65046F06363449EBf00348e9EF9C13C66e4'
  },
  Oracle_WMATIC: {
    matic: '0x8CD79F049C8d4d52c01ba12bC586bCCA0dC9cf9c'
  },
  Oracle_WBTC: {
    matic: '0xB4c42119729A299481aD3D06708ED465Fe49b533'
  },
  Oracle_USDC: {
    matic: '0x9073779F951C929BB3641E8379A66E0B77F8E4aF'
  },
  WMATIC: {
    mainnet: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0', // This is matic's address
    matic: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270' // source :- https://www.coingecko.com/en/coins/wmatic
    //matic: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  },
  MATIC: {
    mainnet: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
    matic: '0x0000000000000000000000000000000000001010',
    //matic: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  },
  ChainlinkFeedETH: {
    mainnet: '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419',
    kovan: '0x9326BFA02ADD2366b30bacB125260Af641031331',
    maticMumbai: '0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada',
    matic: '0xf9680d99d6c9589e2a93a78a04a279e509205945',
    rinkeby: '0x8A753747A1Fa494EC906cE90E9f37563A8AF630e',
  },
  ChainlinkFeedUSDT: {
    maticMumbai: '0x92C09849638959196E976289418e5973CC96d645',
    matic: '0x0A6513e40db6EB1b165753AD52E80663aeA50545',
    mainnet: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
    rinkeby: '0xa24de01df22b63d23Ebc1882a5E3d4ec0d907bFB' // No USDT on rinkeby
  },
  ChainlinkFeedUSDC: {
    maticMumbai: '0x572dDec9087154dC5dfBB1546Bb62713147e0Ab0',
    matic: '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7',
    mainnet: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
    rinkeby: '0xa24de01df22b63d23Ebc1882a5E3d4ec0d907bFB'
  },
  ChainlinkFeedWBTC: {
    matic: '0xDE31F8bFBD8c84b5360CFACCa3539B938dd78ae6',
    rinkeby: '0xECe365B379E1dD183B20fc5f022230C044d51404', // No WBTC on rinkeby
    mainnet: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c', // No WBTC on mainnet
  },
  ChainlinkFeedMATIC: {
    maticMumbai: '0x0715A7794a1dc8e42615F059dD6e406A6594651A',
    matic: '0xab594600376ec9fd91f8e885dadf0ce036862de0',
    mainnet: '0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676'
  },
  ChainlinkFeedDAI: {
    maticMumbai: '0x0FCAa9c899EC5A91eBc3D5Dd869De833b06fB046',
    matic: '0x4746DeC9e833A82EC7C2C1356372CcF2cfcD2F3D',
    mainnet: '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
    rinkeby: '0x2bA49Aaa16E6afD2a993473cfB70Fa8559B523cF',
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
