import { CheckIcon, Share2Icon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Props {
  url: string;
  title: string;
  label: string;
  copiedLabel: string;
}

export default function ShareButton({ url, title, label, copiedLabel }: Props) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timeout.current), []);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Sharing can be cancelled by the user.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.clearTimeout(timeout.current);
      timeout.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked outside secure contexts.
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
    >
      {copied ? <CheckIcon className="size-4" /> : <Share2Icon className="size-4" />}
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}
