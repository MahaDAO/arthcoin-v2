const Migrations = artifacts.require("Util/Migrations")


module.exports = function (deployer, network, accounts) {

  console.log("Using following accounts: ")
  console.log(accounts)

  deployer.deploy(Migrations)
}
