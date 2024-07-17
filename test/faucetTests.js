const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');

describe('Faucet', function () {
  async function deployContractAndSetVariables() {
    const Faucet = await ethers.getContractFactory('Faucet');
    const faucet = await Faucet.deploy();

    const [owner, nonOwner] = await ethers.getSigners();

    console.log('Owner address: ', owner.address);
    console.log('Non-owner address: ', nonOwner.address);
    return { faucet, owner, nonOwner };
  }

  it('should deploy and set the owner correctly', async function () {
    const { faucet, owner } = await loadFixture(deployContractAndSetVariables);

    expect(await faucet.owner()).to.equal(owner.address);
  });

  it('should not allow withdrawals above .1 ETH at a time', async function () {
    const { faucet, owner } = await loadFixture(deployContractAndSetVariables);

    await expect(faucet.withdraw(ethers.utils.parseEther("0.2"))).to.be.revertedWith("Cannot withdraw more than 0.1 ETH at a time");
  });

  it('should allow only the owner to destroy the faucet', async function () {
    const { faucet, owner, nonOwner } = await loadFixture(deployContractAndSetVariables);

    // Attempt to destroy the faucet as the owner
    await expect(faucet.connect(owner).destroyFaucet()).to.not.be.reverted;

    // Attempt to destroy the faucet as a non-owner
    await expect(faucet.connect(nonOwner).destroyFaucet()).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it('should self-destruct the contract when destroyFaucet is called by the owner', async function () {
    const { faucet, owner } = await loadFixture(deployContractAndSetVariables);

    await faucet.connect(owner).destroyFaucet();

    // Check that the contract code is now empty (i.e., the contract is destroyed)
    const code = await ethers.provider.getCode(faucet.address);
    expect(code).to.equal('0x');
  });

  it('should allow only the owner to withdraw all funds', async function () {
    const { faucet, owner, nonOwner } = await loadFixture(deployContractAndSetVariables);

    // Fund the contract with some ether
    await owner.sendTransaction({ to: faucet.address, value: ethers.utils.parseEther("1") });

    // Get initial balance of the owner
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);

    // Attempt to withdraw all funds as the owner
    await expect(faucet.connect(owner).withdrawAll()).to.not.be.reverted;

    // Check the owner's balance after withdrawal
    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
    expect(finalOwnerBalance).to.be.above(initialOwnerBalance);

    // Attempt to withdraw all funds as a non-owner
    await owner.sendTransaction({ to: faucet.address, value: ethers.utils.parseEther("1") });
    await expect(faucet.connect(nonOwner).withdrawAll()).to.be.revertedWith("Ownable: caller is not the owner");
  });
});
