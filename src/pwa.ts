import { registerSW } from 'virtual:pwa-register';

/** true после первого успешного precache — можно работать без сети. */
export let offlineReady = false;

registerSW({
  immediate: true,
  onOfflineReady() {
    offlineReady = true;
    localStorage.setItem('dengi:pwa-ready', '1');
  },
});

if (localStorage.getItem('dengi:pwa-ready') === '1') {
  offlineReady = true;
}
