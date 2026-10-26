import { Link } from 'react-router-dom';
import { NftArt } from './NftArt.jsx';

export default function NftCard({ nft, view = 'grid' }) {
  return (
    <article className={`nft-card glass ${view === 'list' ? 'list' : ''}`}>
      <Link to={`/item/${nft.id}`} className="nft-media" aria-label={`View ${nft.name}`}>
        <NftArt nft={nft} />
      </Link>
      <div className="nft-body">
        <div className="row between">
          <span className="chip">{nft.category}</span>
          <span className="muted small">♥ {nft.likes}</span>
        </div>
        <Link to={`/item/${nft.id}`} className="nft-title">{nft.name}</Link>
        <p className="muted small">{nft.collection}</p>
        <div className="row between price-row">
          <div>
            <span className="muted tiny">Price</span>
            <div className="price">{nft.price} ETH</div>
          </div>
          <Link to={`/item/${nft.id}`} className="btn btn-ghost btn-sm">
            {nft.listed ? 'View' : 'Not listed'}
          </Link>
        </div>
      </div>
    </article>
  );
}
