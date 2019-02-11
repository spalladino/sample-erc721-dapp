import React, { Component } from 'react';
import './ERC721.css';
import './Token.js';
import { getBlockNumber } from '../eth/network';
import BigNumber from 'bignumber.js';
import { getGasPrice } from '../eth/gasPrice';
import Token from './Token.js';
import Mint from './Mint';

// TODO: Include note on dev.period in dev nodes subchapter

class ERC721 extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      tokens: [], 
      loading: true
    };

    this.mint = this.mint.bind(this);
    this.canMint = this.canMint.bind(this);
  }

  async heavyLoadTokens() {
    const currentBlock = await getBlockNumber();
    const olderBlock = Math.max(currentBlock - 6, 0);
    
    const [pendingTokens, currentTokens, confirmedTokens] = 
      await Promise.all([
        this.getTokensAtBlock(null),
        this.getTokensAtBlock(currentBlock),
        this.getTokensAtBlock(olderBlock)
      ]);
    
    const tokens = pendingTokens.map(id => {
      const latestBlock = currentTokens.includes(id) ? currentBlock : null;
      const oldestBlock = confirmedTokens.includes(id) ? olderBlock : latestBlock;
      return { id, latestBlock, oldestBlock };
    });

    this.setState({ tokens, loading: false });
  }

  async loadTokens() {
    const currentBlock = await getBlockNumber();
    const tokenIds = await this.getTokensAtBlock(currentBlock);
    const tokens = tokenIds.map(id => ({ id, confirmed: true }));
    this.setState({ tokens, loading: false });
  }

  async getTokensAtBlock(blockNumber) {
    const { contract, owner } = this.props;
    const balance = parseInt(await contract.methods.balanceOf(owner).call({}, blockNumber));
    return await Promise.all(Array.from({ length: balance }, (_x, index) => (
      contract.methods.tokenOfOwnerByIndex(owner, index).call({}, blockNumber)
    )));
  }

  async canMint(id) {
    const { contract } = this.props;
    const exists = await contract.methods.exists(id).call();
    return !exists;
  }

  async mint(id) {
    const { contract, owner } = this.props;
    const from = owner;
    const value = (new BigNumber(id)).shiftedBy(12).toString(10);
    console.log("VALUE", value);
    const gas = await contract.methods.mint(owner, id).estimateGas({ value, from });
    console.log("GAS", gas)
    const gasPrice = await getGasPrice();

    contract.methods.mint(owner, id).send({ value, gas, gasPrice, from })
      .on('transactionHash', () => {
        this.addToken(id);
      })
      .on('receipt', () => {
        this.confirmToken(id, 0);
      })
      .on('confirmation', (number) => {
        this.confirmToken(id, number);
      })
      .on('error', (error) => {
        this.failToken(id, error)
      });
  }

  addToken(id) {
    console.log("ADDING TOKEN", id)
    this.setState(state => ({
      ...state,
      tokens: [ ...state.tokens, { id }]
    }));
  }

  confirmToken(id, confirmations) {
    this.setState(state => ({
      ...state,
      tokens: state.tokens.map(token => (
        token.id === id ? { id, confirmations } : token
      ))
    }));
  }

  failToken(id, error) {
    this.setState(state => ({
      ...state,
      tokens: state.tokens.map(token => (
        token.id === id ? { id, error } : token
      ))
    }));
  }

  async componentDidMount() {
    this.loadTokens();
  }

  render() {
    const { tokens, loading } = this.state;
    const { contract } = this.props;
    if (loading) return "Loading";

    return (
      <div className="ERC721">
        <h1>
          Collectible Numbers
        </h1>
        <div className="ERC721-address">Address: { contract.options.address }</div>
        <div className="ERC721-tokens">
          { tokens.map(token => (
            <Token key={token.id.toString()} token={token} />
          ))}
        </div>
        <Mint canMint={this.canMint} mint={this.mint} />
      </div>
    );
  }
}

export default ERC721;