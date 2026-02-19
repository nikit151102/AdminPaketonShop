import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface SideMenuItem {
  label: string;
  icon: string | SafeHtml;
  active: boolean;
  router: string;
  badge?: string;
}

export function getSideMenu(sanitizer: DomSanitizer): SideMenuItem[] {
  return [
    {
      label: 'Главная',
      icon: sanitizer.bypassSecurityTrustHtml(`
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9l9-7 9 7v11a2 2 0 01-2 2h-4a2 2 0 01-2-2v-5H9v5a2 2 0 01-2 2H3a2 2 0 01-2-2V9z"/>
        </svg>`),
      active: true,
      router: 'home'
    },
    {
      label: 'Магазины',
      icon: sanitizer.bypassSecurityTrustHtml(`
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6M3 13h18v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6z"/>
        </svg>`),
      active: false,
      router: 'stores'
    },
    {
      label: 'баннеры, промокоды, новости',
      icon: sanitizer.bypassSecurityTrustHtml(`
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6M3 13h18v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6z"/>
        </svg>`),
      active: false,
      router: 'content'
    },
    {
      label: 'Товары',
      icon: sanitizer.bypassSecurityTrustHtml(`
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6M3 13h18v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6z"/>
        </svg>`),
      active: false,
      router: 'products'
    },
     {
      label: 'Ниши',
      icon: sanitizer.bypassSecurityTrustHtml(`
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6M3 13h18v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6z"/>
        </svg>`),
      active: false,
      router: 'niches'
    },
    {
      label: 'Категории',
      icon: sanitizer.bypassSecurityTrustHtml(`
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6M3 13h18v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6z"/>
        </svg>`),
      active: false,
      router: 'categories'
    },
    {
      label: 'Заказы',
      icon: sanitizer.bypassSecurityTrustHtml(`
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h18v4H3V3zm0 6h18v12a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
        </svg>`),
      active: false,
      badge: '3',
      router: 'home'
    },
    {
      label: 'Пользователи',
      icon: sanitizer.bypassSecurityTrustHtml(`
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A9 9 0 1119.07 7.05M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>`),
      active: false,
      router: 'users'
    },
    {
      label: 'Аналитика',
      icon: sanitizer.bypassSecurityTrustHtml(`
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 11V3h2v8h-2zm-4 6v-4h2v4H7zm8 0v-2h2v2h-2z"/>
        </svg>`),
      active: false,
      router: 'home'
    },
    {
      label: 'Акции',
      icon: sanitizer.bypassSecurityTrustHtml(`
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 11V3h2v8h-2zm-4 6v-4h2v4H7zm8 0v-2h2v2h-2z"/>
        </svg>`),
      active: false,
      router: 'stocks'
    },

    {
      label: 'Настройки',
      icon: sanitizer.bypassSecurityTrustHtml(`
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>`),
      active: false,
      router: 'reference'
    },
  ];
}
