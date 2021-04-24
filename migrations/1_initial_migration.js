const chalk = require('chalk')

const Migrations = artifacts.require("Util/Migrations")
const Multicall = artifacts.require('Multicall')


module.exports = async function (deployer, network, accounts) {

  console.log(chalk.yellow("\nUsing following accounts: "))
  console.log(accounts)

  deployer.deploy(Migrations)
  if (network === 'development') await deployer.deploy(Multicall);
}
