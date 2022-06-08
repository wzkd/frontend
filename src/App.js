import './App.css';
// import Navbar from './components/Navbar';
import Web3 from "web3";
import { useEffect, useState } from 'react';
import build from "./contracts/WZKD.json";
import allowlist from "./contracts/allowlist.json";
import config from "./config/config";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {ethers} from "ethers";
import keccak256 from "keccak256";
import MerkleTree from "merkletreejs";

function App() {
  const [account, setAccount] = useState({});
  const [amount, setAmount] = useState(1);
  const [supply, setSupply] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [price, setPrice] = useState(ethers.utils.parseEther("0.068"));
  const [wlPrice, setWlPrice] = useState(ethers.utils.parseEther("0.048"));
  const [isMinting, setIsMinting] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);
  const [merkleTree, setMerkleTree] = useState({});

  useEffect(()=>{
    const eth = window.ethereum;
    const web3 = new Web3(eth);

    const wrapper = async () => {
      await eth.request({ method: 'eth_requestAccounts' });
    }
    wrapper().then(async ()=>{
      try {
        eth.on('accountsChanged', async (accounts) => {
          console.log(accounts);
        });
        eth.on('chainChanged', () => {
          window.location.reload();
        });
        const mt = buildMerkleTree();
        setMerkleTree(mt);
        const chainId = await web3.eth.getChainId();
        const contract = new web3.eth.Contract(build.abi, config[chainId].contract_address);
        const s = await contract.methods.totalSupply().call({})
        setSupply(s);
        const p = await contract.methods.price().call({});
        setPrice(p);
        const wp = await contract.methods.wlPrice().call({});
        setWlPrice(wp);
        const priv = await contract.methods.isPrivate().call({});
        setIsPrivate(priv);
        const pub = await contract.methods.isPublic().call({});
        setIsPublic(pub);
        // get address
        let address;
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) address = accounts[0];
        else if (Web3.utils.isAddress(accounts)) address = accounts;

        const proof = mt.getHexProof(keccak256(address))
        const allowed = await contract.methods.isAllowed(proof, address).call({});
        setIsAllowed(allowed);

        setAccount({
          web3,
          chainId,
          address,
          contract,
        });
        // await updateSupplyCounter(c);
      } catch(err) {
        console.log(err)
      }
    })
  }, []);

  const onMintPublic = async () => {
    const { contract, address } = account;
    setIsMinting(true);

    const amt = Web3.utils.toBN(amount);
    const p = Web3.utils.toBN(price);
    try {
      await contract.methods.publicMint(amt).estimateGas({
        from: address,
        value: p.mul(amt)
      });
      contract.methods.publicMint(amt).send({
        from: address,
        value: p.mul(amt)
      }).on('receipt', mintOnReceipt)
      .on('transactionHash', mintOnHash)
      .on('error', mintOnError);
    } catch (err) {
      estimateOnError(err)
    }
  }
  function buildMerkleTree() {
    const leafNodes = allowlist.map((addr) => keccak256(addr));
    const merkleTree = new MerkleTree(leafNodes, keccak256, {
      sortPairs: true,
    });
    return merkleTree;
  }

  const onMintPrivate = async () => {
    const { contract, address } = account;
    const proof = merkleTree.getHexProof(keccak256(address))
    setIsMinting(true);

    const amt = Web3.utils.toBN(amount);
    const p = Web3.utils.toBN(wlPrice);
    try {
      await contract.methods.privateMint(amt, proof).estimateGas({
        from: address,
        value: p.mul(amt)
      });
      contract.methods.privateMint(amt, proof).send({
        from: address,
        value: p.mul(amt)
      }).on('receipt', mintOnReceipt)
      .on('transactionHash', mintOnHash)
      .on('error', mintOnError);
    } catch (err) {
      estimateOnError(err)
    }
  }

  const estimateOnError = (err) => {
    let errMsg = `Error occurred ${err}`;
    if(err.message.includes('Pausable: paused')) {
      errMsg = 'Minting is paused';
    }
    toast.error(errMsg, {
      position: "bottom-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
    setIsMinting(false);
  }

  const mintOnError = (error) => {
    let errMsg = `error occurred ${error}`;
    if(error.code === 4001) {
      errMsg = 'Transaction rejected'
    }
    toast.error(errMsg, {
      position: "bottom-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
    setIsMinting(false);
  }

  const mintOnHash = (hash) => {
    toast.info(<a href={`https://etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer">Processing your mint</a>, {
      position: "bottom-center",
      autoClose: 5000,
      hideProgressBar: true,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    })
    setIsMinting(false);
  };

  const mintOnReceipt = (receipt) => {
    toast.success('Minted!', {
      position: "bottom-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      });
      updateSupply();
      setIsMinting(false);
  }

  const onIncrement = () => {
    if(amount >= 20) return;
    setAmount(amount+1);
  }

  const onDecrement = () => {
    if(amount <= 1) return;
    setAmount(amount-1);
  }

  const onSelectAll = event => {
    event.target.focus();
    event.target.select();
  }

  const onAmountChanged = event => {
    const value = event.target.value;
    if(value > 10) setAmount(10);
    else if(value < 1) setAmount(1);
    else setAmount(value);
  }

  const updateSupply = async () => {
    const { contract } = account;
    const s = await contract.methods.totalSupply().call({})
    setSupply(s - 1);
  }

  const renderPublicMint = () => {
    if(!isPublic) return;
    return (<div>
      <p className='title-text'>Public Mint</p>
      <button onClick={onMintPublic} className='mint-btn' disabled={isMinting}>MINT FOR {
        Web3.utils.fromWei(
          Web3.utils.toBN(price).mul(Web3.utils.toBN(amount)), 
          "ether"
          )} ETH</button>
    </div>)
  }

  const renderPrivateMint = () => {
    if(!isPrivate) return;
    if(!isPublic && !isAllowed) return <p className='title-text' style={{marginBottom: '4vh'}}>You are not whitelisted</p>;
    if(isAllowed) {
      return (<div>
        <p className='title-text'>Private Mint</p>
        <button onClick={onMintPrivate} className='mint-btn' disabled={isMinting}>MINT FOR {
          Web3.utils.fromWei(
            Web3.utils.toBN(wlPrice).mul(Web3.utils.toBN(amount)), 
            "ether"
            )} ETH</button>
      </div>)
    }
  }

  const renderSelector = () => {
    if(!isPrivate && !isPublic) return;
    return (<div className='selector-container'>
      <button onClick={onDecrement} className='selector-btn'>-</button>
      <input onClick={onSelectAll} onChange={onAmountChanged} value={amount} type="number"/>
      <button onClick={onIncrement} className='selector-btn'>+</button>
      </div>)
  }

  const renderMintingSoon = () => {
    if(isPrivate || isPublic) return;
    return <p className='title-text' style={{marginBottom: '4vh'}}>Minting Soon</p>;
  }

  const renderTotalSupply = () => {
    if(!isPrivate && !isPublic) return;
    return <p className='supply-text'>{supply}/5678</p>;
  }

  return (
    <div className='background'>
      {/* <Navbar/> */}
      <div className='mint-container'>
        {renderSelector()}
        {renderMintingSoon()}
        {renderPublicMint()}
        {renderPrivateMint()}
        {renderTotalSupply()}
      </div>
        <ToastContainer />
    </div>
  );
}

export default App;
