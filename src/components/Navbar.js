import './Navbar.css';
import { FaTwitter } from 'react-icons/fa';
import opensea from "../assets/opensea.svg";

const Navbar = () => {
  return (
    <div className='navbar'>
        <a href='https://twitter.com/NiftyCitiesnft' target="_blank" rel="noreferrer" className='navbar-item'>
            <FaTwitter color="#ffffff" />
        </a>
        <a href='https://opensea.io/collection/nifty-cities' target="_blank" rel="noreferrer" className='navbar-item'>
            <img src={opensea} alt="open" width={24}/>
        </a>
    </div>
  );
}

export default Navbar;
