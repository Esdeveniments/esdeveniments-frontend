import { JSX } from "react";
import Link from "next/link";
import { SocialProps } from '../../../../types/props';

const renderFacebook = (link: string | undefined): JSX.Element | null =>
  link ? (
    <Link
      href={link}
      className="no-underline"
      rel="noopener noreferrer"
      target="_blank"
      aria-label="Facebook"
    >
      <button
        className="px-3 py-3 bg-muted/60 hover:bg-primary/10 border border-border/40 hover:border-primary/40 rounded-full transition-all duration-normal hover:scale-110 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Facebook"
      >
        <svg
          className="w-5 h-5 fill-primary transition-colors"
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </button>
    </Link>
  ) : null;

const renderTwitter = (link: string | undefined): JSX.Element | null =>
  link ? (
    <Link
      href={link}
      className="no-underline"
      rel="noopener noreferrer"
      target="_blank"
      aria-label="Twitter"
    >
      <button
        className="px-3 py-3 bg-muted/60 hover:bg-primary/10 border border-border/40 hover:border-primary/40 rounded-full transition-all duration-normal hover:scale-110 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Twitter"
      >
        <svg
          className="w-5 h-5 fill-primary transition-colors"
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
        >
          <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
        </svg>
      </button>
    </Link>
  ) : null;

const renderInstagram = (link: string | undefined): JSX.Element | null =>
  link ? (
    <Link
      href={link}
      className="no-underline"
      rel="noopener noreferrer"
      target="_blank"
      aria-label="Instagram"
    >
      <button
        className="px-3 py-3 bg-muted/60 hover:bg-primary/10 border border-border/40 hover:border-primary/40 rounded-full transition-all duration-normal hover:scale-110 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Instagram"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 fill-primary transition-colors"
          role="img"
          viewBox="0 0 24 24"
        >
          <path d="M8 3C5.243 3 3 5.243 3 8v8c0 2.757 2.243 5 5 5h8c2.757 0 5-2.243 5-5V8c0-2.757-2.243-5-5-5H8zm0 2h8c1.654 0 3 1.346 3 3v8c0 1.654-1.346 3-3 3H8c-1.654 0-3-1.346-3-3V8c0-1.654 1.346-3 3-3zm9 1a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1zm-5 1c-2.757 0-5 2.243-5 5s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5zm0 2c1.654 0 3 1.346 3 3s-1.346 3-3 3-3-1.346-3-3 1.346-3 3-3z" />
        </svg>
      </button>
    </Link>
  ) : null;

const renderTelegram = (link: string | undefined): JSX.Element | null =>
  link ? (
    <Link
      href={link}
      className="no-underline"
      rel="noopener noreferrer"
      target="_blank"
      aria-label="Telegram"
    >
      <button
        className="px-3 py-3 bg-muted/60 hover:bg-primary/10 border border-border/40 hover:border-primary/40 rounded-full transition-all duration-normal hover:scale-110 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Telegram"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 fill-primary transition-colors"
          role="img"
          viewBox="0 0 24 24"
        >
          <path d="M18.384 22.779a1.19 1.19 0 0 0 1.107.145 1.16 1.16 0 0 0 .724-.84C21.084 18 23.192 7.663 23.983 3.948a.78.78 0 0 0-.26-.758.8.8 0 0 0-.797-.14C18.733 4.602 5.82 9.447.542 11.4a.827.827 0 0 0-.542.799c.012.354.25.661.593.764 2.367.708 5.474 1.693 5.474 1.693s1.452 4.385 2.209 6.615c.095.28.314.5.603.576a.866.866 0 0 0 .811-.207l3.096-2.923s3.572 2.619 5.598 4.062Zm-11.01-8.677 1.679 5.538.373-3.507 10.185-9.186a.277.277 0 0 0 .033-.377.284.284 0 0 0-.376-.064L7.374 14.102Z" />
        </svg>
      </button>
    </Link>
  ) : null;

export default function Social({ links }: SocialProps): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-element-gap-sm">
      <h3 className="body-small font-semibold text-foreground/70 uppercase tracking-wider">
        Segueix-nos
      </h3>
      <div className="flex justify-center items-center gap-3">
        {renderTwitter(links.twitter)}
        {renderInstagram(links.instagram)}
        {renderTelegram(links.telegram)}
        {renderFacebook(links.facebook)}
      </div>
    </div>
  );
}
