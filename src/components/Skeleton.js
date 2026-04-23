import './Skeleton.css';

export const PostCardSkeleton = () => (
  <div className="skeleton-card">
    <div className="skeleton-top">
      <div className="skel skel-circle" />
      <div className="skeleton-meta">
        <div className="skel skel-line w60" />
        <div className="skel skel-line w40" />
      </div>
    </div>
    <div className="skel skel-line w80 mb8" />
    <div className="skel skel-line w100 mb8" />
    <div className="skel skel-line w70 mb12" />
    <div className="skeleton-tags">
      <div className="skel skel-tag" />
      <div className="skel skel-tag" />
      <div className="skel skel-tag" />
    </div>
    <div className="skeleton-actions">
      <div className="skel skel-btn" />
      <div className="skel skel-btn" />
    </div>
  </div>
);

export const ProfileHeaderSkeleton = () => (
  <div className="skeleton-card skeleton-profile-header">
    <div className="skel skel-avatar-lg" />
    <div className="skeleton-profile-info">
      <div className="skel skel-line w40 mb8" />
      <div className="skel skel-line w30 mb16" />
      <div className="skeleton-stats">
        <div className="skel skel-stat" />
        <div className="skel skel-stat" />
        <div className="skel skel-stat" />
      </div>
    </div>
  </div>
);

export const ConversationSkeleton = () => (
  <div className="skeleton-conv">
    <div className="skel skel-circle" />
    <div className="skeleton-conv-meta">
      <div className="skel skel-line w50 mb6" />
      <div className="skel skel-line w80" />
    </div>
  </div>
);