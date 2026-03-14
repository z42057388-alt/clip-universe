import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface VideoCardProps {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  channelName: string;
  views: number;
  createdAt: string;
  userId?: string | null;
}

const formatViews = (views: number): string => {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)} млн`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)} тыс.`;
  return `${views}`;
};

export const VideoCard = ({ id, title, thumbnailUrl, channelName, views, createdAt, userId }: VideoCardProps) => {
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: ru });

  return (
    <div className="group cursor-pointer">
      <Link to={`/watch/${id}`}>
        <div className="relative aspect-video rounded-xl overflow-hidden bg-surface mb-3">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-4xl">🎬</span>
            </div>
          )}
        </div>
      </Link>
      <div className="flex gap-3">
        {userId ? (
          <Link to={`/channel/${userId}`} className="w-9 h-9 rounded-full bg-primary flex-shrink-0 flex items-center justify-center hover:opacity-80 transition-opacity">
            <span className="text-primary-foreground text-xs font-bold">{channelName.charAt(0).toUpperCase()}</span>
          </Link>
        ) : (
          <div className="w-9 h-9 rounded-full bg-primary flex-shrink-0 flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">{channelName.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <Link to={`/watch/${id}`}>
            <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-5 mb-1 group-hover:text-primary transition-colors">
              {title}
            </h3>
          </Link>
          {userId ? (
            <Link to={`/channel/${userId}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{channelName}</Link>
          ) : (
            <p className="text-xs text-muted-foreground">{channelName}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatViews(views)} просмотров • {timeAgo}
          </p>
        </div>
      </div>
    </div>
  );
};
