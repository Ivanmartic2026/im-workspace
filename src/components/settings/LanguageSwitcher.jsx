import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LanguageSwitcher() {
  const { language, changeLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => changeLanguage('sv')}
          className={language === 'sv' ? 'bg-slate-100' : ''}
        >
          🇸🇪 {t('swedish')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLanguage('en')}
          className={language === 'en' ? 'bg-slate-100' : ''}
        >
          🇬🇧 {t('english')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}