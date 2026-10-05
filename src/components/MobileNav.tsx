import { PanelLeftIcon, UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from 'cn';
import type { Lang } from '@/i18n/ui';
import { localePath, useTranslations } from '@/i18n/utils';
import type { Pairing } from '@/lib/moment-schema';

interface Props {
  pairings: { id: Pairing; name: string }[];
  activePairing?: Pairing;
  lang: Lang;
}

const itemClass =
  'flex w-fit items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-sidebar-accent aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium';

export default function MobileNav({ pairings, activePairing, lang }: Props) {
  const t = useTranslations(lang);

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('nav.toggleMenu')} />
        }
      >
        <PanelLeftIcon />
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>{t('nav.menu')}</SheetTitle>
        </SheetHeader>
        <nav aria-label={t('nav.site')} className="flex flex-col gap-1 px-4 pb-4">
          <p className="mt-4 mb-1 flex items-center gap-2 px-2 text-xs font-medium text-muted-foreground">
            <UsersIcon className="size-4" />
            <span>{t('nav.pairings')}</span>
          </p>
          {pairings.map(({ id, name }) => (
            <a
              key={id}
              href={localePath(lang, `/${id}`)}
              aria-current={activePairing === id ? 'page' : undefined}
              className={cn(itemClass, 'ml-6')}
            >
              <span>{name}</span>
            </a>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
