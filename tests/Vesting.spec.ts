import { ethers } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";

let deployer: tsEthers.Signer;
let user: tsEthers.Wallet;
let token: tsEthers.Contract;
let vesting: tsEthers.Contract;

describe("Vesting Contract", () => {
  before(async () => {
    deployer = (await ethers.getSigners())[0];
    user = new ethers.Wallet(
      "0xbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeef",
      deployer.provider
    );
    const vestingAmount = ethers.utils.parseEther("10000000");
    const vestingPeriod = 604_800 * 52;
    const blockNumber = await deployer.provider.getBlockNumber();
    const start = (await deployer.provider.getBlock(blockNumber)).timestamp;

    token = await (
      await ethers.getContractFactory("Token")
    ).deploy("Token", "TKN", 18);

    const claimInterval = 604_800;

    vesting = await (
      await ethers.getContractFactory("Vesting")
    ).deploy(
      [user.address],
      [vestingAmount],
      [vestingPeriod],
      start,
      token.address,
      claimInterval
    );
    // Send ETH to user from signer.
    await deployer.sendTransaction({
      to: user.address,
      value: ethers.utils.parseEther("69")
    });
    await token.mint(vesting.address, ethers.constants.MaxUint256);
  });

  it("Should be a beneficiary", async () => {
    expect(vesting.claim()).to.be.revertedWith("User is not a beneficiary");
  });

  it("Should have no balance", async () => {
    expect(await vesting.accruedBalanceOf(user.address)).to.equal(0);
  });

  it("Should not claim", async () => {
    expect(vesting.connect(user).claim()).to.be.revertedWith(
      "No balance accrued yet"
    );
  });

  it("Should have balance after one week", async () => {
    const blockNumber = await deployer.provider.getBlockNumber();
    const blockTimeStamp = (await deployer.provider.getBlock(blockNumber))
      .timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      blockTimeStamp + 604_800
    ]);
    await ethers.provider.send("evm_mine", []);
    expect(await vesting.accruedBalanceOf(user.address)).to.gt(0);
  });

  it("Should be able to claim", async () => {
    const userBalance = await token.balanceOf(user.address);
    expect(userBalance).to.equal(0);
    await vesting.connect(user).claim();
    const newUserBalance = await token.balanceOf(user.address);
    expect(newUserBalance).to.gt(0);
  });

  it("Should claim everything after one year", async () => {
    const blockNumber = await deployer.provider.getBlockNumber();
    const blockTimeStamp = (await deployer.provider.getBlock(blockNumber))
      .timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      blockTimeStamp + 31_536_000
    ]);
    await ethers.provider.send("evm_mine", []);
    await vesting.connect(user).claim();
    const fullUserBalance = await token.balanceOf(user.address);
    expect(fullUserBalance).to.equal(ethers.utils.parseEther("10000000"));
  });
});
